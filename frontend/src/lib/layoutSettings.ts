// Ajustes de Layout de la organización (organizations.settings.layout,
// migración 20261031220000). Se editan en Administración → Organización; acá
// solo se leen, con estos valores por defecto si la org no los cambió.

export interface LayoutSettings {
  chairSize: number
  tableRound8: number
  tableRound10: number
  tableRound12: number
  tableRectLength: number
  tableRectWidth: number
  chairGap: number
  tableSpacing: number
}

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  chairSize: 0.45,
  tableRound8: 1.5,
  tableRound10: 1.8,
  tableRound12: 2.1,
  tableRectLength: 2.4,
  tableRectWidth: 0.75,
  chairGap: 0.15,
  tableSpacing: 1.5,
}

const num = (v: unknown, fallback: number, min: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= min ? n : fallback
}

// org_settings(org) → { layout: { chair_size, ... }, ... }
export function parseLayoutSettings(data: unknown): LayoutSettings {
  const l = ((data as { layout?: Record<string, unknown> } | null)?.layout ?? {}) as Record<string, unknown>
  const d = DEFAULT_LAYOUT_SETTINGS
  return {
    chairSize: num(l.chair_size, d.chairSize, 0.2),
    tableRound8: num(l.table_round8, d.tableRound8, 0.5),
    tableRound10: num(l.table_round10, d.tableRound10, 0.5),
    tableRound12: num(l.table_round12, d.tableRound12, 0.5),
    tableRectLength: num(l.table_rect_length, d.tableRectLength, 0.5),
    tableRectWidth: num(l.table_rect_width, d.tableRectWidth, 0.3),
    chairGap: num(l.chair_gap, d.chairGap, 0),
    tableSpacing: num(l.table_spacing, d.tableSpacing, 0),
  }
}
