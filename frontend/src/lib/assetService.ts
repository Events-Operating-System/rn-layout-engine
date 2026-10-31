import { supabase } from './supabase'
import type { GroupChild } from '@/types/layout'
import type { TemplatePayload } from './templates'

export interface CustomAsset {
  id: string
  name: string
  category: string
  // 'shape' (default): one primitive with fixed dims. 'group': composite,
  // `children` holds the pieces and default_width/height is the combined
  // bounding box. 'template': plantilla de plano, todo en `payload`.
  kind: AssetKind
  default_width: number
  default_height: number
  default_color?: string
  shape?: string
  // shape === 'polygon' only: flat [x0,y0,x1,y1,...] meter offsets
  // relative to the bounding box (same as LayoutElement.points). NULL for
  // every other shape.
  points?: number[] | null
  // kind === 'group' only.
  children?: GroupChild[] | null
  // kind === 'template' only.
  payload?: TemplatePayload | null
  // Biblioteca de la org (bloque 6): compartido con toda la org o personal.
  org_id: string
  created_by: string
  shared: boolean
  shared_at?: string | null
  created_at: string
}

export type AssetKind = 'shape' | 'group' | 'template'

export interface NewCustomAsset {
  name: string
  category: string
  kind?: AssetKind
  default_width: number
  default_height: number
  default_color?: string
  shape?: string
  points?: number[] | null
  children?: GroupChild[] | null
  payload?: TemplatePayload | null
  // Crear ya compartido con la org (pide "compartir" en Layout).
  shared?: boolean
}

export const assetService = {
  // Lo propio y lo compartido de la org activa (la RLS filtra el resto).
  async list(orgId: string): Promise<CustomAsset[]> {
    const { data, error } = await supabase
      .from('custom_assets')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  // created_by lo pone la base (trigger); no se manda.
  async create(orgId: string, asset: NewCustomAsset): Promise<CustomAsset> {
    const { data, error } = await supabase
      .from('custom_assets')
      .insert({ ...asset, org_id: orgId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Compartir lo propio con la org, o sacar de la org cualquier asset
  // compartido. Pide "compartir" en Layout.
  async setShared(id: string, shared: boolean): Promise<void> {
    const { error } = await supabase.rpc('layout_set_asset_shared', { p_id: id, p_shared: shared })
    if (error) throw error
  },

  // Con .select() para notar si la RLS no dejó borrar (0 filas, sin error).
  async delete(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('custom_assets')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data?.length) throw { code: '42501', message: 'LAYOUT_PERM' }
  }
}
