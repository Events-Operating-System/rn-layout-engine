// Constantes del canvas 2D (escala, grilla, zoom, export, dibujo).

export const PIXELS_PER_METER = 20

// Konva's default 8 resize anchors — restored explicitly on the
// single-element Transformer because the multi-select path below sets
// enabledAnchors([]) (rotate-only) and the same Transformer instance is
// reused for both.
export const RESIZE_ANCHORS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]
export const GRID_METERS = 120
export const GRID_TOTAL_PX = GRID_METERS * PIXELS_PER_METER
export const MIN_SCALE = 0.15
export const MAX_SCALE = 6
export const EXPORT_RATIO = 2
export const CANVAS_CENTER_PX = 60 * PIXELS_PER_METER

export const DRAW_COLOR = '#fbbf24'   // amber-400 — visible on dark canvas
export const DRAW_STROKE = 2
