import { supabase } from './supabase'
import type { LayoutElement, DrawingPrimitive, LayoutMeta, CanvasViewport } from '@/types/layout'

export interface SavedLayout {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface LayoutData {
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  meta: LayoutMeta
  viewport: CanvasViewport
}

export const layoutService = {
  async list(orgId: string): Promise<SavedLayout[]> {
    const { data, error } = await supabase
      .from('layouts')
      .select('id, name, created_at, updated_at')
      .eq('org_id', orgId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async load(id: string): Promise<LayoutData> {
    const { data, error } = await supabase
      .from('layouts')
      .select('elements, drawings, meta, viewport')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as LayoutData
  },

  async save(id: string | null, orgId: string, name: string, payload: LayoutData, eventId?: string | null): Promise<string> {
    if (id) {
      const { error } = await supabase
        .from('layouts')
        .update({ name, ...payload, ...(eventId ? { event_id: eventId } : {}) })
        .eq('id', id)
      if (error) throw error
      return id
    }
    const { data, error } = await supabase
      .from('layouts')
      .insert({
        org_id: orgId,
        name,
        ...payload,
        ...(eventId ? { event_id: eventId } : {}),
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select('id')
      .single()
    if (error) throw error

    // First layout ever created for this event auto-links itself as the
    // event's official layout (eventos.events.layout_id). If the event
    // already has one linked, this is an alternate/draft version — leave it
    // unlinked so the manual "Vincular" button in eventos-eventos-frontend
    // stays the way to promote it (multi-version workflow, same pattern as
    // Ventas quotes v1/v2). Never blocks the save itself if it fails.
    if (eventId) {
      try {
        const currentLayoutId = await this.getEventLayoutId(eventId)
        if (!currentLayoutId) {
          const linkedRow = await this.linkEventLayout(eventId, data.id)
          // linkEventLayout selects the row back on purpose: a write RLS
          // silently blocks returns success with 0 rows, not an error, so
          // this is the only way to catch that failure mode.
          if (!linkedRow) {
            console.warn(`[auto-link] UPDATE a eventos.events no devolvió fila para event_id=${eventId} — posible bloqueo por RLS/permisos`)
          }
        }
      } catch (linkError) {
        console.error('[layoutService] auto-link to event failed:', linkError)
      }
    }

    return data.id
  },

  async getEventLayoutId(eventId: string): Promise<string | null> {
    const { data, error } = await supabase
      .schema('eventos')
      .from('events')
      .select('layout_id')
      .eq('id', eventId)
      .maybeSingle()
    if (error) throw error
    return data?.layout_id ?? null
  },

  async linkEventLayout(eventId: string, layoutId: string): Promise<{ id: string; layout_id: string } | null> {
    const { data, error } = await supabase
      .schema('eventos')
      .from('events')
      .update({ layout_id: layoutId })
      .eq('id', eventId)
      .select('id, layout_id')
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getForDuplicate(id: string): Promise<{ org_id: string; name: string } & LayoutData> {
    const { data, error } = await supabase
      .from('layouts')
      .select('org_id, name, elements, drawings, meta, viewport')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Creates a brand-new, independent layout row forked from `parentLayoutId`
  // (or a fresh root if null). Never touches the parent row — used by both
  // "Duplicar" (re-fetches the parent's last saved content) and "Guardar
  // como copia" (forks the editor's current, possibly unsaved, canvas state).
  async duplicate(orgId: string, name: string, payload: LayoutData, parentLayoutId: string | null): Promise<string> {
    const { data, error } = await supabase
      .from('layouts')
      .insert({
        org_id: orgId,
        name,
        ...payload,
        parent_layout_id: parentLayoutId,
        version_number: 1,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  },

  async setEventId(id: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('layouts')
      .update({ event_id: eventId })
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('layouts')
      .update({ is_archived: true })
      .eq('id', id)
    if (error) throw error
  }
}