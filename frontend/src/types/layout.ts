export type UnitSystem = 'metric' | 'imperial'

export type AssetCategory =
  | 'stage'
  | 'structure'
  | 'seating'
  | 'barrier'
  | 'utility'
  | 'circulation'

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  stage: '#6366f1',
  structure: '#0891b2',
  seating: '#f59e0b',
  barrier: '#ef4444',
  utility: '#22c55e',
  circulation: '#a855f7',
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stage: 'Stage',
  structure: 'Structure',
  seating: 'Seating',
  barrier: 'Barrier',
  utility: 'Utility',
  circulation: 'Circulation',
}

export interface LayoutElement {
  id: string
  name: string
  category: AssetCategory
  x: number        // meters from canvas origin
  y: number        // meters from canvas origin
  width: number    // meters
  height: number   // meters
  rotation: number // degrees
  color: string
  locked: boolean
  notes: string
}

export interface CanvasViewport {
  x: number
  y: number
  scale: number
}

export interface AssetTemplate {
  name: string
  category: AssetCategory
  defaultWidth: number
  defaultHeight: number
}
