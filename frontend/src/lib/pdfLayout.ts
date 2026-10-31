// Hoja del PDF (bloque 8): tamaño, márgenes, cajetín, escala estándar y
// caja del contenido. Sin React, Konva ni jsPDF: solo cuentas en mm y m.

import type { DrawingPrimitive, LayoutElement, VenueBackground } from '@/types/layout'
import { pathBounds } from './curves'

export type Paper = 'a4' | 'a3'
export interface PaperChoice {
  paper: Paper
  landscape: boolean
}

// Apaisado (ancho × alto) en mm.
const PAPER_MM: Record<Paper, [number, number]> = { a4: [297, 210], a3: [420, 297] }

// Escalas de plano habituales (1:N). Se usa la más grande en la que el
// plano entra completo.
export const STANDARD_SCALES = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000, 10000]

export const MARGIN_MM = 8
export const TITLE_BLOCK_MM = 22
const GAP_MM = 3
// Aire entre el borde del recuadro y el plano.
export const FRAME_PAD_MM = 6

export interface Sheet {
  pageW: number
  pageH: number
  frame: { x: number; y: number; w: number; h: number }
  titleBlock: { x: number; y: number; w: number; h: number }
}

export function sheetLayout(choice: PaperChoice): Sheet {
  const [lw, lh] = PAPER_MM[choice.paper]
  const pageW = choice.landscape ? lw : lh
  const pageH = choice.landscape ? lh : lw
  const innerW = pageW - MARGIN_MM * 2
  const tb = { x: MARGIN_MM, y: pageH - MARGIN_MM - TITLE_BLOCK_MM, w: innerW, h: TITLE_BLOCK_MM }
  return {
    pageW, pageH,
    frame: { x: MARGIN_MM, y: MARGIN_MM, w: innerW, h: tb.y - GAP_MM - MARGIN_MM },
    titleBlock: tb,
  }
}

// Denominador de la escala (1:N) más grande en la que entra el contenido.
export function pickScale(contentWm: number, contentHm: number, availWmm: number, availHmm: number): number {
  const w = Math.max(contentWm, 0.01), h = Math.max(contentHm, 0.01)
  for (const d of STANDARD_SCALES) {
    const mmPerM = 1000 / d
    if (w * mmPerM <= availWmm && h * mmPerM <= availHmm) return d
  }
  // Más grande que 1:10000: redondeado hacia arriba al millar.
  const need = Math.max((w * 1000) / availWmm, (h * 1000) / availHmm)
  return Math.ceil(need / 1000) * 1000
}

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

const PPM = 20 // px por metro (mismo PIXELS_PER_METER del canvas)

// Esquinas reales de la pieza (rota sobre su esquina x,y, como Konva).
function elementCorners(e: LayoutElement): [number, number][] {
  const r = (e.rotation * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  let local: [number, number][] = [[0, 0], [e.width, 0], [e.width, e.height], [0, e.height]]
  // Curvas que salen de la caja (no debería pasar, pero por las dudas).
  if (e.points && e.points.length >= 4 && (e.shape === 'polygon' || e.shape === 'wall' || e.shape === 'path')) {
    const b = pathBounds(e.points, e.segments, e.shape === 'polygon' || !!e.closed)
    local = [[Math.min(0, b.minX), Math.min(0, b.minY)], [Math.max(e.width, b.maxX), Math.min(0, b.minY)], [Math.max(e.width, b.maxX), Math.max(e.height, b.maxY)], [Math.min(0, b.minX), Math.max(e.height, b.maxY)]]
  }
  return local.map(([x, y]) => [e.x + x * c - y * s, e.y + x * s + y * c])
}

// Caja de lo que se exporta, en metros: piezas (rotadas), dibujos y, si se
// pide, el plano del local.
export function contentBounds(elements: LayoutElement[], drawings: DrawingPrimitive[], background?: VenueBackground): Bounds | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  for (const e of elements) for (const [x, y] of elementCorners(e)) add(x, y)
  for (const d of drawings) for (let i = 0; i + 1 < d.points.length; i += 2) add(d.points[i] / PPM, d.points[i + 1] / PPM)
  if (background) { add(background.x, background.y); add(background.x + background.width, background.y + background.height) }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null
}

// Dibujos que caen enteros dentro de la caja (para "solo lo seleccionado").
export function drawingsInside(drawings: DrawingPrimitive[], b: Bounds): DrawingPrimitive[] {
  const eps = 0.01
  return drawings.filter(d => {
    for (let i = 0; i + 1 < d.points.length; i += 2) {
      const x = d.points[i] / PPM, y = d.points[i + 1] / PPM
      if (x < b.minX - eps || x > b.maxX + eps || y < b.minY - eps || y > b.maxY + eps) return false
    }
    return d.points.length >= 2
  })
}

// Barra de escala: largo "redondo" en metros que no pase de maxMm.
export function scaleBarMeters(denominator: number, maxMm: number): number {
  const mmPerM = 1000 / denominator
  const nice = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]
  let best = nice[0]
  for (const n of nice) if (n * mmPerM <= maxMm) best = n
  return best
}

export const paperLabel = (c: PaperChoice, lang: 'es' | 'en' | 'pt' = 'es') =>
  `${c.paper.toUpperCase()} ${c.landscape ? { es: 'apaisado', en: 'landscape', pt: 'paisagem' }[lang] : { es: 'vertical', en: 'portrait', pt: 'retrato' }[lang]}`
