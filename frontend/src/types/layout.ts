export type UnitSystem = 'metric' | 'imperial'

export type AssetCategory =
  | 'stage'
  | 'structure'
  | 'seating'
  | 'barrier'
  | 'utility'
  | 'circulation'
  | 'primitive'

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  stage: '#6366f1',
  structure: '#0891b2',
  seating: '#f59e0b',
  barrier: '#ef4444',
  utility: '#22c55e',
  circulation: '#a855f7',
  primitive: '#64748b',
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stage: 'Stage',
  structure: 'Structure',
  seating: 'Seating',
  barrier: 'Barrier',
  utility: 'Utility',
  circulation: 'Circulation',
  primitive: 'Shapes',
}

export type ElementShape = 'rect' | 'circle' | 'oval' | 'rounded-rect' | 'tree' | 'polygon'

export interface LayoutElement {
  id: string
  name: string
  category: AssetCategory
  x: number        // meters from canvas origin
  y: number        // meters from canvas origin
  width: number    // meters — for polygon, the bounding-box width of `points`
  height: number   // meters — for polygon, the bounding-box height of `points`
  rotation: number // degrees
  color: string
  opacity?: number // 0–1, defaults to 0.65
  locked: boolean
  notes: string
  shape?: ElementShape
  flipX?: boolean  // mirror horizontally in place, defaults to false
  flipY?: boolean  // mirror vertically in place, defaults to false
  // shape === 'polygon' only: flat [x0,y0,x1,y1,...] vertex offsets in
  // METERS, relative to (x,y) (the bounding box's top-left corner) — same
  // convention as width/height, so moving the element only touches x/y and
  // resizing only rescales these offsets. Kept as plain meter offsets
  // (not normalized 0..1) so drawingMath.polygonAreaMeters can shoelace
  // them directly without unit conversion.
  points?: number[]
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
  defaultColor?: string
  // shape === 'polygon' only: same convention as LayoutElement.points
  // (flat [x0,y0,x1,y1,...] meter offsets relative to the bounding box).
  // Set when re-adding a custom polygon asset so its real shape is
  // restored instead of a plain bounding-box rectangle.
  points?: number[]
}

// One piece inside a composite ('group') custom asset. dx/dy are meters
// from the group's origin (top-left of the combined bounding box). Field
// meanings match LayoutElement — enough to rebuild a full LayoutElement
// when the group is placed. `category` is kept because LayoutElement
// requires it; `name`/`opacity`/`flipX`/`flipY`/`notes` so re-added
// pieces don't silently lose those.
export interface GroupChild {
  name: string
  category: AssetCategory
  shape?: ElementShape
  dx: number
  dy: number
  width: number
  height: number
  rotation: number
  color: string
  opacity?: number
  flipX?: boolean
  flipY?: boolean
  notes?: string
  points?: number[]
}

// ── Drawing primitives ────────────────────────────────────────────────────────

export type DrawingTool = 'pointer' | 'hand' | 'line' | 'arrow' | 'text' | 'polygon' | 'measure'

export interface DrawingPrimitive {
  id: string
  tool: 'line' | 'arrow' | 'text'
  points: number[]   // world-pixel coords: [x1,y1,x2,y2] for line/arrow; [x,y] for text
  text?: string
  color: string
  strokeWidth: number
  opacity?: number   // 0–1, defaults to 1
  fontSize?: number  // px, text tool only — defaults to 14
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
