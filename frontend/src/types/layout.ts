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

export type ElementShape = 'rect' | 'circle'

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
  opacity?: number // 0–1, defaults to 0.65
  locked: boolean
  notes: string
  shape?: ElementShape
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
  shape?: ElementShape
}

// ── Drawing primitives ────────────────────────────────────────────────────────

export type DrawingTool = 'pointer' | 'line' | 'arrow' | 'text'

export interface DrawingPrimitive {
  id: string
  tool: 'line' | 'arrow' | 'text'
  points: number[]   // world-pixel coords: [x1,y1,x2,y2] for line/arrow; [x,y] for text
  text?: string
  color: string
  strokeWidth: number
  opacity?: number   // 0–1, defaults to 1
}

// ── Layout metadata (title block / footer) ────────────────────────────────────

export interface LayoutMeta {
  company: string
  cliente: string
  lugarEvento: string
  fechaEvento: string
  pax: string
  version: string
  fechaPlano: string
  contacto: string
  telefono: string
  correo: string
}

export const DEFAULT_LAYOUT_META: LayoutMeta = {
  company: 'Reality Near',
  cliente: '',
  lugarEvento: '',
  fechaEvento: '',
  pax: '',
  version: 'v1.0',
  fechaPlano: new Date().toISOString().slice(0, 10),
  contacto: '',
  telefono: '',
  correo: '',
}
