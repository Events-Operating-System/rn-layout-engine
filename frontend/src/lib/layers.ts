// Capas fijas del plano (bloque 6, decisión 2026-10-31): perímetro y
// estructura, mobiliario, decoración, técnica y notas. Cada pieza tiene su
// capa (o la que le toca por categoría si no se eligió); los dibujos
// (líneas, flechas, textos, cotas) van en Notas. Lo oculto no se ve ni se
// exporta; lo bloqueado no se puede elegir ni mover. Sin React ni Konva.

import type { LayoutElement, LayerId, LayerState } from '@/types/layout'
import { CATEGORY_COLORS } from '@/types/layout'

export const LAYERS: LayerId[] = ['structure', 'furniture', 'decor', 'technical', 'notes']

// Color de cada capa (decisión de Javier 2026-11-01): las piezas nuevas nacen
// con el color de su capa y la leyenda muestra las 5 capas. Los planos
// existentes no cambian solos: "Aplicar colores por capa" (applyLayerColors).
export const LAYER_COLORS: Record<LayerId, string> = {
  structure: '#0891b2', // cian — perímetro / estructura
  furniture: '#f59e0b', // ámbar — mobiliario
  decor: '#22c55e',     // verde — decoración
  technical: '#6366f1', // índigo — técnica
  notes: '#f472b6',     // rosa — notas (dibujos y cotas)
}

// Piezas nuevas que van en perímetro/estructura aunque su categoría diga
// otra cosa (decisión 2026-10-31: Cocina y Baños se ven en "Vista cliente").
// Se guarda la capa en la pieza al crearla: los planos existentes no cambian.
const NEW_STRUCTURE_NAMES = new Set(['Kitchen', 'Restrooms'])

export function layerForNewPiece(name: string): LayerId | undefined {
  return NEW_STRUCTURE_NAMES.has(name) ? 'structure' : undefined
}

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

// Color con el que nace una pieza nueva: el de su capa.
export function layerColorFor(e: Pick<LayoutElement, 'layer' | 'category' | 'shape' | 'name'>): string {
  return LAYER_COLORS[layerOf(e)]
}

// "Aplicar colores por capa": solo las piezas que siguen con el color de
// fábrica de su categoría; los colores elegidos a mano se respetan.
export function applyLayerColors(elements: Pick<LayoutElement, 'id' | 'color' | 'layer' | 'category' | 'shape' | 'name' | 'locked'>[]): Record<string, { color: string }> {
  const out: Record<string, { color: string }> = {}
  for (const e of elements) {
    if (e.locked) continue
    const factory = CATEGORY_COLORS[e.category]
    if (!factory || e.color.toLowerCase() !== factory.toLowerCase()) continue
    const target = layerColorFor(e)
    if (target.toLowerCase() !== e.color.toLowerCase()) out[e.id] = { color: target }
  }
  return out
}

