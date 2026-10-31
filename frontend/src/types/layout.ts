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

export type ElementShape = 'rect' | 'circle' | 'oval' | 'rounded-rect' | 'tree' | 'polygon' | 'wall' | 'path'

// Cómo es cada lado de una pieza con vértices (bloque 7, lib/curves.ts).
export type Segment =
  | { kind: 'line' }
  | { kind: 'arc'; bulge: number }
  | { kind: 'bezier'; c1: [number, number]; c2: [number, number] }

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
  // Asientos que aporta la pieza al PAX automático (una silla = 1). Las
  // mesas no cuentan: cuentan sus sillas.
  seats?: number
  // shape === 'wall' (muro / perímetro del local): `points` igual que el
  // polígono; `closed` = perímetro cerrado; `thickness` = grosor en metros.
  closed?: boolean
  thickness?: number
  // Conjunto al que pertenece (una mesa con sus sillas, un asset compuesto).
  // Alinear, distribuir y repetir lo tratan como un solo bloque.
  groupId?: string
  // Capa elegida a mano. Sin definir: la que toca por categoría (lib/layers).
  layer?: LayerId
  // Lados curvos (polígono, muro o curva 'path'). Sin definir: todos rectos.
  // shape 'path' = curva libre o arco: abierta se dibuja como trazo de
  // `thickness`; cerrada, con relleno.
  segments?: Segment[]
  // Mesas: el color de la pieza es el del MANTEL; acá, tipo o tela
  // ("Lino, hasta el piso", "Satén corto"…). Bloque A de Javier 2026-10-31.
  fabric?: string
  // Sillas: tipo (Tiffany, Crossback, Plegable…). El color es el de la pieza.
  chairType?: string
  // Altura en 3D elegida a mano (m). Sin definir: la del tipo (ajuste de la org).
  height3d?: number
}

// Capas fijas (bloque 6): perímetro/estructura, mobiliario, decoración,
// técnica y notas (dibujos y cotas).
export type LayerId = 'structure' | 'furniture' | 'decor' | 'technical' | 'notes'

export interface LayerState {
  hidden: LayerId[]
  locked: LayerId[]
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
  seats?: number
  segments?: Segment[]
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
  seats?: number
  layer?: LayerId
  segments?: Segment[]
  closed?: boolean
  thickness?: number
  fabric?: string
  chairType?: string
  height3d?: number
}

// ── Drawing primitives ────────────────────────────────────────────────────────

export type DrawingTool = 'pointer' | 'hand' | 'line' | 'arrow' | 'text' | 'polygon' | 'measure' | 'wall' | 'dimension' | 'calibrate' | 'arc' | 'curve'

export interface DrawingPrimitive {
  id: string
  // 'dimension' = cota: línea con su medida, que queda guardada en el plano.
  tool: 'line' | 'arrow' | 'text' | 'dimension'
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
  // Nombre del layout (= barra de arriba y layouts.name). Casilla PROYECTO.
  proyecto: string
  // Cliente: del evento vinculado (eventos.events.client_name) o a mano.
  cliente: string
  lugarEvento: string
  fechaEvento: string
  pax: string
  // PAX automático (= asientos dibujados). false = se escribió a mano en
  // `pax`. Sin definir (planos viejos): manual si `pax` tiene algo.
  paxAuto?: boolean
  // Plano del local de fondo (imagen guardada en el bucket layout-backgrounds).
  background?: VenueBackground
  // Capas ocultas y bloqueadas en este plano (bloque 6).
  layers?: LayerState
  // Nota libre de versión escrita a mano. El número lo pone la base
  // (layouts.version_number); esto solo se muestra al lado.
  version: string
  fechaPlano: string
  contacto: string
  telefono: string
  correo: string
}

// Fondo del plano: imagen ubicada en metros (x, y, ancho, alto), con su
// transparencia y si está bloqueada (no se mueve al editar).
export interface VenueBackground {
  path: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  locked: boolean
  // Recorte (0–1, relativo a la imagen original): lo que se usa del plano
  // del arquitecto, sin cajetín, logos ni márgenes. x/y/width/height de
  // arriba son entonces los de la parte recortada. El archivo no se toca.
  crop?: BackgroundCrop
}

export interface BackgroundCrop {
  x: number
  y: number
  w: number
  h: number
}

export const DEFAULT_LAYOUT_META: LayoutMeta = {
  company: 'Reality Near',
  proyecto: '',
  cliente: '',
  lugarEvento: '',
  fechaEvento: '',
  pax: '',
  paxAuto: true,
  version: '',
  fechaPlano: new Date().toISOString().slice(0, 10),
  contacto: '',
  telefono: '',
  correo: '',
}
