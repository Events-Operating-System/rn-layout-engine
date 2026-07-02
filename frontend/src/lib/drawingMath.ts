// Reusable geometry for drag-to-draw tools (line/arrow today; polygon and
// a standalone measurement tool are planned to reuse this same module —
// keep it framework-agnostic, no React/Konva imports here).

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
