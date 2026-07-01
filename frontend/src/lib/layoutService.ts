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