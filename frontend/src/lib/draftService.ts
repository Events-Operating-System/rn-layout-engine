import { supabase } from './supabase'
import type { LayoutData } from './layoutService'
import type { LayoutElement, DrawingPrimitive, LayoutMeta, CanvasViewport } from '@/types/layout'

// Autosave del editor. Escribe SOLO en public.layout_drafts, nunca en
// public.layouts — la fila real la sigue pisando únicamente el botón
// "Guardar" manual (ver layoutService.save). El draft se borra en cuanto
// ese guardado manual persiste.
//
// org_id y updated_by los resuelve el trigger layout_drafts_set_fields()
// del lado del servidor: acá se manda org_id igual (para el POST directo
// del camino beacon y para no depender de que el trigger rellene un NOT
// NULL sin default), pero el valor del cliente se ignora.

export interface LayoutDraft {
  layout_id: string
  org_id: string
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  meta: LayoutMeta
  viewport: CanvasViewport
  updated_at: string
  updated_by: string | null
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function rowFor(layoutId: string, orgId: string, payload: LayoutData) {
  return {
    layout_id: layoutId,
    org_id: orgId,
    elements: payload.elements,
    drawings: payload.drawings,
    meta: payload.meta,
    viewport: payload.viewport,
  }
}

export const draftService = {
  // Al abrir un layout — insumo del chequeo de recuperación.
  async get(layoutId: string): Promise<LayoutDraft | null> {
    const { data, error } = await supabase
      .from('layout_drafts')
      .select('layout_id, org_id, elements, drawings, meta, viewport, updated_at, updated_by')
      .eq('layout_id', layoutId)
      .maybeSingle()
    if (error) throw error
    return (data as LayoutDraft | null) ?? null
  },

  // Camino normal: debounce y desmonte del editor (setView -> dashboard).
  async upsert(layoutId: string, orgId: string, payload: LayoutData): Promise<void> {
    const { error } = await supabase
      .from('layout_drafts')
      .upsert(rowFor(layoutId, orgId, payload), { onConflict: 'layout_id' })
    if (error) throw error
  },

  // Camino beacon: pagehide / visibilitychange=hidden. No se puede
  // await getSession() ahí, así que el token entra ya resuelto. fetch con
  // keepalive para que el navegador termine el request aunque la página
  // se esté cerrando. Best-effort: si falla, el próximo cambio lo reintenta.
  upsertBeacon(layoutId: string, orgId: string, payload: LayoutData, accessToken: string): void {
    try {
      void fetch(`${SUPABASE_URL}/rest/v1/layout_drafts?on_conflict=layout_id`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rowFor(layoutId, orgId, payload)),
      }).catch(() => {})
    } catch {
      /* best-effort */
    }
  },

  // Tras "Guardar" manual exitoso.
  async clear(layoutId: string): Promise<void> {
    const { error } = await supabase.from('layout_drafts').delete().eq('layout_id', layoutId)
    if (error) throw error
  },
}
