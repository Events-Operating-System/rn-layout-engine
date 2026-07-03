// Reusable geometry for drag-to-draw tools (line/arrow, polygon, and the
// measurement tool all share this module — keep it framework-agnostic, no
// React/Konva imports here; only type-only imports are allowed).

import type { ElementShape } from '@/types/layout'

export interface Point {
  x: number
  y: number
}

export function lengthMeters(x1: number, y1: number, x2: number, y2: number, pixelsPerMeter: number): number {
  return Math.hypot(x2 - x1, y2 - y1) / pixelsPerMeter
}

// 0° points right (+x), increasing clockwise since screen y grows downward
// — same convention as LayoutElement.rotation elsewhere in the app.
export function angleDegrees(x1: number, y1: number, x2: number, y2: number): number {
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return (deg + 360) % 360
}

export function pointFromLengthAngle(origin: Point, lengthM: number, angleDeg: number, pixelsPerMeter: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  const lengthPx = lengthM * pixelsPerMeter
  return { x: origin.x + Math.cos(rad) * lengthPx, y: origin.y + Math.sin(rad) * lengthPx }
}

export const ANGLE_SNAP_STEP_DEG = 15      // soft-snap grid while drawing
export const ANGLE_SNAP_TOLERANCE_DEG = 5  // only engages within this distance
export const ANGLE_SNAP_FORCED_STEP_DEG = 45 // Shift-forced constrain step

// tolerance = null means always snap to the nearest step (forced); a
// numeric tolerance only snaps when within that many degrees of a step.
export function snapAngleDegrees(angleDeg: number, step: number, toleranceDeg: number | null): number {
  const nearest = (Math.round(angleDeg / step) * step + 360) % 360
  if (toleranceDeg === null) return nearest
  const diff = Math.min(Math.abs(angleDeg - nearest), 360 - Math.abs(angleDeg - nearest))
  return diff <= toleranceDeg ? nearest : angleDeg
}

// The project's standard snap behavior for any drag-to-draw tool: soft-
// snap to 15° within a 5° tolerance, or hard-snap to 45° while Shift is
// held (Figma-style "shift = constrain"), regardless of proximity.
export function applyAngleSnap(angleDeg: number, shiftHeld: boolean): number {
  return shiftHeld
    ? snapAngleDegrees(angleDeg, ANGLE_SNAP_FORCED_STEP_DEG, null)
    : snapAngleDegrees(angleDeg, ANGLE_SNAP_STEP_DEG, ANGLE_SNAP_TOLERANCE_DEG)
}

// Shoelace formula — area of a simple polygon (convex or concave, incl.
// L-shapes) from a flat [x0,y0,x1,y1,...] point list. Works unchanged
// whether the points are absolute world coords or offsets relative to a
// bounding box, since area is translation-invariant.
export function polygonAreaMeters(points: number[]): number {
  const n = points.length / 2
  if (n < 3) return 0
  let sum = 0
  for (let i = 0; i < n; i++) {
    const x1 = points[i * 2]
    const y1 = points[i * 2 + 1]
    const j = (i + 1) % n
    const x2 = points[j * 2]
    const y2 = points[j * 2 + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

// Real (not bounding-box) area for a placed element, in m² — used by both
// the measurement tool and the Properties panel so the two never disagree.
export function elementAreaMeters(el: { shape?: ElementShape; width: number; height: number; points?: number[] }): number {
  if (el.shape === 'polygon' && el.points && el.points.length >= 6) {
    return polygonAreaMeters(el.points)
  }
  if (el.shape === 'circle' || el.shape === 'oval') {
    return Math.PI * (el.width / 2) * (el.height / 2)
  }
  return el.width * el.height
}
