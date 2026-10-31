import type Konva from 'konva'
import type { LayoutElement } from '@/types/layout'
import { PIXELS_PER_METER } from './constants'

// ── Alignment guide computation ───────────────────────────────────────────────

export function computeAlignmentGuides(
  elements: LayoutElement[],
  draggedId: string,
  gx: number,
  gy: number,
  pw: number,
  ph: number,
  scale: number,
): { xs: number[]; ys: number[] } {
  const THRESHOLD = 8 / scale
  const xSet = new Set<number>()
  const ySet = new Set<number>()

  const dLeft = gx, dRight = gx + pw, dCx = gx + pw / 2
  const dTop = gy, dBottom = gy + ph, dCy = gy + ph / 2

  for (const el of elements) {
    if (el.id === draggedId) continue
    const epx = el.x * PIXELS_PER_METER
    const epy = el.y * PIXELS_PER_METER
    const epw = el.width * PIXELS_PER_METER
    const eph = el.height * PIXELS_PER_METER
    const elL = epx, elR = epx + epw, elCx = epx + epw / 2
    const elT = epy, elB = epy + eph, elCy = epy + eph / 2

    if (Math.abs(dCx - elCx) < THRESHOLD) xSet.add(elCx)
    if (Math.abs(dLeft - elL) < THRESHOLD) xSet.add(elL)
    if (Math.abs(dRight - elR) < THRESHOLD) xSet.add(elR)
    if (Math.abs(dLeft - elR) < THRESHOLD) xSet.add(elR)
    if (Math.abs(dRight - elL) < THRESHOLD) xSet.add(elL)

    if (Math.abs(dCy - elCy) < THRESHOLD) ySet.add(elCy)
    if (Math.abs(dTop - elT) < THRESHOLD) ySet.add(elT)
    if (Math.abs(dBottom - elB) < THRESHOLD) ySet.add(elB)
    if (Math.abs(dTop - elB) < THRESHOLD) ySet.add(elB)
    if (Math.abs(dBottom - elT) < THRESHOLD) ySet.add(elT)
  }

  return { xs: Array.from(xSet), ys: Array.from(ySet) }
}

// Walks up from a clicked Konva node to find the nearest ancestor (or
// itself) carrying an `id` — that's how AssetShape's outer Group is
// identified (`id={element.id}`), regardless of how many nested Groups/
// Shapes sit between the actual hit target and it (flip Group, tree's
// inner circles, polygon's Line, etc).
export function findElementId(node: Konva.Node): string | null {
  let cur: Konva.Node | null = node
  while (cur && cur.getClassName() !== 'Stage') {
    const id = cur.id()
    if (id) return id
    cur = cur.getParent()
  }
  return null
}
