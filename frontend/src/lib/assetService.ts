import { supabase } from './supabase'
import type { GroupChild } from '@/types/layout'

export interface CustomAsset {
  id: string
  name: string
  category: string
  // 'shape' (default): one primitive with fixed dims. 'group': composite,
  // `children` holds the pieces and default_width/height is the combined
  // bounding box.
  kind: 'shape' | 'group'
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
  created_at: string
}

export interface NewCustomAsset {
  name: string
  category: string
  kind?: 'shape' | 'group'
  default_width: number
  default_height: number
  default_color?: string
  shape?: string
  points?: number[] | null
  children?: GroupChild[] | null
}

export const assetService = {
  async list(): Promise<CustomAsset[]> {
    const { data, error } = await supabase
      .from('custom_assets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(asset: NewCustomAsset): Promise<CustomAsset> {
    const { data, error } = await supabase
      .from('custom_assets')
      .insert({
        ...asset,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_assets')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}