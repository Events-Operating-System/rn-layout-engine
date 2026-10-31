// Alinear, distribuir y repetir en grilla (bloque 4). Funciones puras sobre
// la caja sin rotar de cada pieza (mismo criterio que el arrastre en grupo y
// "rotar grupo"). Las piezas bloqueadas no se mueven.

import type { LayoutElement } from '@/types/layout'

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
type Box = Pick<LayoutElement, 'id' | 'x' | 'y' | 'width' | 'height' | 'locked'>

const r2 = (n: number) => Math.round(n * 100) / 100

export function alignUpdates(els: Box[], mode: AlignMode): Record<string, { x?: number; y?: number }> {
  const movable = els.filter(e => !e.locked)
  if (movable.length < 2) return {}
  const minX = Math.min(...movable.map(e => e.x))
  const maxX = Math.max(...movable.map(e => e.x + e.width))
  const minY = Math.min(...movable.map(e => e.y))
  const maxY = Math.max(...movable.map(e => e.y + e.height))
  const out: Record<string, { x?: number; y?: number }> = {}
  for (const e of movable) {
    if (mode === 'left') out[e.id] = { x: r2(minX) }
    else if (mode === 'right') out[e.id] = { x: r2(maxX - e.width) }
    else if (mode === 'center') out[e.id] = { x: r2((minX + maxX) / 2 - e.width / 2) }
    else if (mode === 'top') out[e.id] = { y: r2(minY) }
    else if (mode === 'bottom') out[e.id] = { y: r2(maxY - e.height) }
    else out[e.id] = { y: r2((minY + maxY) / 2 - e.height / 2) }
  }
  return out
}

// Mismo espacio libre entre piezas consecutivas; la primera y la última no se
// mueven. Pide al menos 3.
export function distributeUpdates(els: Box[], axis: 'horizontal' | 'vertical'): Record<string, { x?: number; y?: number }> {
  const movable = els.filter(e => !e.locked)
  if (movable.length < 3) return {}
  const pos = (e: Box) => (axis === 'horizontal' ? e.x : e.y)
  const size = (e: Box) => (axis === 'horizontal' ? e.width : e.height)
  const sorted = [...movable].sort((a, b) => pos(a) + size(a) / 2 - (pos(b) + size(b) / 2))
  const first = sorted[0], last = sorted[sorted.length - 1]
  const span = pos(last) + size(last) - pos(first)
  const total = sorted.reduce((s, e) => s + size(e), 0)
  const gap = (span - total) / (sorted.length - 1)
  const out: Record<string, { x?: number; y?: number }> = {}
  let cursor = pos(first)
  for (const e of sorted) {
    out[e.id] = axis === 'horizontal' ? { x: r2(cursor) } : { y: r2(cursor) }
    cursor += size(e) + gap
  }
  return out
}

export const MAX_GRID_COPIES = 400

// Copias de la selección en una grilla de filas × columnas. La original queda
// en la celda (0,0); el paso es el tamaño del conjunto + la separación.
// Devuelve las piezas nuevas (sin la original), con ids nuevos.
export function gridCopies(els: LayoutElement[], rows: number, cols: number, gap: number, makeId: (i: number) => string): LayoutElement[] {
  if (!els.length || rows < 1 || cols < 1 || rows * cols * els.length - els.length > MAX_GRID_COPIES * els.length) return []
  const minX = Math.min(...els.map(e => e.x))
  const maxX = Math.max(...els.map(e => e.x + e.width))
  const minY = Math.min(...els.map(e => e.y))
  const maxY = Math.max(...els.map(e => e.y + e.height))
  const stepX = maxX - minX + gap
  const stepY = maxY - minY + gap
  const out: LayoutElement[] = []
  let k = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue
      for (const e of els) {
        out.push({ ...e, id: makeId(k++), x: r2(e.x + c * stepX), y: r2(e.y + r * stepY), locked: false })
      }
    }
  }
  return out
}
