import type { LayerId } from '@/types/layout'
import type { PaperChoice } from './pdfLayout'

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
  // Plano del local (bloque 5)
  wallThickness: number
  dimensionDecimals: number
  backgroundImage: boolean
  backgroundPdf: boolean
  // Capas que oculta "Vista cliente" (client_hide_*).
  clientViewHidden: LayerId[]
  // Hoja del PDF por defecto (bloque 8): A4 apaisado salvo que la org diga otra cosa.
  pdfPaper: PaperChoice
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
  wallThickness: 0.15,
  dimensionDecimals: 2,
  backgroundImage: true,
  backgroundPdf: true,
  clientViewHidden: ['technical', 'notes'],
  pdfPaper: { paper: 'a4', landscape: true },
}

const num = (v: unknown, fallback: number, min: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= min ? n : fallback
}

const CLIENT_KEYS: [string, LayerId][] = [
  ['client_hide_structure', 'structure'],
  ['client_hide_furniture', 'furniture'],
  ['client_hide_decor', 'decor'],
  ['client_hide_technical', 'technical'],
  ['client_hide_notes', 'notes'],
]

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
    wallThickness: num(l.wall_thickness, d.wallThickness, 0.01),
    dimensionDecimals: Math.min(4, Math.round(num(l.dimension_decimals, d.dimensionDecimals, 0))),
    backgroundImage: typeof l.background_image === 'boolean' ? l.background_image : d.backgroundImage,
    backgroundPdf: typeof l.background_pdf === 'boolean' ? l.background_pdf : d.backgroundPdf,
    clientViewHidden: CLIENT_KEYS.filter(([key, id]) =>
      typeof l[key] === 'boolean' ? l[key] : d.clientViewHidden.includes(id),
    ).map(([, id]) => id),
    pdfPaper: {
      paper: l.pdf_a3 === true ? 'a3' : 'a4',
      landscape: typeof l.pdf_landscape === 'boolean' ? l.pdf_landscape : true,
    },
  }
}
