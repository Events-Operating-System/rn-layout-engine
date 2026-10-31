// El editor deja una copia del plano (incluido lo no guardado) para que la
// vista 3D, en otra pestaña, muestre exactamente lo que se ve. Si no hay
// copia (o es vieja), la vista 3D lee el plano guardado.
import type { DrawingPrimitive, LayoutElement, LayoutMeta } from '@/types/layout'

export interface Snapshot3D {
  name: string
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  meta: LayoutMeta
  savedAt: number
}

const KEY = (id: string) => `rn-layout-3d:${id}`
const MAX_AGE_MS = 30 * 60 * 1000

export function writeSnapshot3D(id: string, s: Omit<Snapshot3D, 'savedAt'>): boolean {
  try {
    localStorage.setItem(KEY(id), JSON.stringify({ ...s, savedAt: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function readSnapshot3D(id: string, now = Date.now()): Snapshot3D | null {
  try {
    const raw = localStorage.getItem(KEY(id))
    if (!raw) return null
    const s = JSON.parse(raw) as Snapshot3D
    if (!Array.isArray(s.elements) || now - (s.savedAt ?? 0) > MAX_AGE_MS) return null
    return s
  } catch {
    return null
  }
}
