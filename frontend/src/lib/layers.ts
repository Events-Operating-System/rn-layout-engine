// Capas fijas del plano (bloque 6, decisión 2026-10-31): perímetro y
// estructura, mobiliario, decoración, técnica y notas. Cada pieza tiene su
// capa (o la que le toca por categoría si no se eligió); los dibujos
// (líneas, flechas, textos, cotas) van en Notas. Lo oculto no se ve ni se
// exporta; lo bloqueado no se puede elegir ni mover. Sin React ni Konva.

import type { LayoutElement, LayerId, LayerState } from '@/types/layout'

export const LAYERS: LayerId[] = ['structure', 'furniture', 'decor', 'technical', 'notes']

// Vista para el cliente: sin técnica ni notas.
export const CLIENT_VIEW_HIDDEN: LayerId[] = ['technical', 'notes']

const TECH_NAMES = new Set(['LED Wall', 'Screen', 'DJ Booth', 'DJ Booth PRO', 'Generator'])

export function layerOf(e: Pick<LayoutElement, 'layer' | 'category' | 'shape' | 'name'>): LayerId {
  if (e.layer && LAYERS.includes(e.layer)) return e.layer
  if (e.shape === 'wall') return 'structure'
  if (TECH_NAMES.has(e.name)) return 'technical'
  switch (e.category) {
    case 'seating': return 'furniture'
    case 'utility': return 'technical'
    case 'primitive': return 'decor'
    default: return 'structure' // stage, structure, barrier, circulation
  }
}

export const EMPTY_LAYERS: LayerState = { hidden: [], locked: [] }

export function normalizeLayers(s: Partial<LayerState> | undefined | null): LayerState {
  const pick = (a: unknown) => (Array.isArray(a) ? (a.filter(x => LAYERS.includes(x as LayerId)) as LayerId[]) : [])
  return { hidden: pick(s?.hidden), locked: pick(s?.locked) }
}

export function toggleLayer(s: LayerState, kind: 'hidden' | 'locked', id: LayerId): LayerState {
  const list = s[kind].includes(id) ? s[kind].filter(x => x !== id) : [...s[kind], id]
  return { ...s, [kind]: LAYERS.filter(l => list.includes(l)) }
}

export interface LayerView<E> {
  elements: E[]          // lo que se dibuja y exporta
  inertIds: Set<string>  // visibles pero bloqueadas por su capa
  showDrawings: boolean
  drawingsLocked: boolean
}

export function applyLayers<E extends Pick<LayoutElement, 'id' | 'layer' | 'category' | 'shape' | 'name'>>(
  elements: E[], state: LayerState | undefined,
): LayerView<E> {
  const s = normalizeLayers(state)
  if (!s.hidden.length && !s.locked.length) {
    return { elements, inertIds: new Set(), showDrawings: true, drawingsLocked: false }
  }
  const hidden = new Set(s.hidden), locked = new Set(s.locked)
  const visible = elements.filter(e => !hidden.has(layerOf(e)))
  return {
    elements: visible,
    inertIds: new Set(visible.filter(e => locked.has(layerOf(e))).map(e => e.id)),
    showDrawings: !hidden.has('notes'),
    drawingsLocked: locked.has('notes'),
  }
}

export function countByLayer(elements: Pick<LayoutElement, 'layer' | 'category' | 'shape' | 'name'>[], drawings: number): Record<LayerId, number> {
  const out: Record<LayerId, number> = { structure: 0, furniture: 0, decor: 0, technical: 0, notes: drawings }
  for (const e of elements) out[layerOf(e)]++
  return out
}
