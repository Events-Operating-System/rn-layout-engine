// Plantillas de plano de la organización (bloque 6): una copia de las
// piezas, dibujos, plano del local y capas de un plano, para empezar otro
// igual (boda 100, corporativo en auditorio, el salón de siempre…).
// Sin React ni Konva.

import type { DrawingPrimitive, LayerState, LayoutElement, VenueBackground } from '@/types/layout'

export interface TemplatePayload {
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  background?: VenueBackground
  layers?: LayerState
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Lo que se guarda: todo desbloqueado salvo lo que estaba bloqueado a mano.
export function buildTemplate(elements: LayoutElement[], drawings: DrawingPrimitive[], background?: VenueBackground, layers?: LayerState): {
  payload: TemplatePayload
  width: number
  height: number
} {
  const xs = elements.flatMap(e => [e.x, e.x + e.width])
  const ys = elements.flatMap(e => [e.y, e.y + e.height])
  const width = xs.length ? round2(Math.max(...xs) - Math.min(...xs)) : 0
  const height = ys.length ? round2(Math.max(...ys) - Math.min(...ys)) : 0
  return {
    payload: {
      elements,
      drawings,
      ...(background ? { background } : {}),
      ...(layers && (layers.hidden.length || layers.locked.length) ? { layers } : {}),
    },
    width,
    height,
  }
}

// Piezas y dibujos con ids nuevos, en las mismas posiciones. Cada conjunto
// (mesa con sillas) recibe un groupId nuevo para no mezclarse con los del
// plano. Se agregan a lo que ya hay: no se borra nada.
export function instantiateTemplate(
  p: TemplatePayload | null | undefined,
  makeId: (i: number) => string,
  makeGroupId: (i: number) => string,
): { elements: LayoutElement[]; drawings: DrawingPrimitive[] } {
  if (!p || !Array.isArray(p.elements)) return { elements: [], drawings: [] }
  const groups = new Map<string, string>()
  let g = 0, k = 0
  const elements = p.elements.map(e => {
    const out: LayoutElement = { ...e, id: makeId(k++) }
    if (e.groupId) {
      if (!groups.has(e.groupId)) groups.set(e.groupId, makeGroupId(g++))
      out.groupId = groups.get(e.groupId)
    }
    return out
  })
  const drawings = (Array.isArray(p.drawings) ? p.drawings : []).map(d => ({ ...d, id: makeId(k++) }))
  return { elements, drawings }
}
