// Alturas reales en 3D (pedido de Javier, 2026-10-31). Cada pieza tiene un
// TIPO (mesa, silla, tarima, pista, barra, pantalla, muro…) y la altura del
// tipo es ajuste de la org (organizations.settings.layout.h3d_*). En
// Propiedades se puede escribir otra altura para una pieza (height3d).
//
// El tipo sale de la forma, la categoría y palabras del nombre (en español
// e inglés), porque las orgs nombran sus piezas a su manera ("Mesa de
// dulces", "Escenario 23 x 5", "Pantalla Led", "Camion").

import type { LayoutElement, PieceType } from '@/types/layout'
import { isChair, isTable } from './grouping'

export type Height3DKey =
  | 'table' | 'chair' | 'stage' | 'dance' | 'bar' | 'screen' | 'wall'
  | 'tent' | 'service' | 'barrier' | 'truss' | 'vehicle' | 'lounge' | 'other'

// Tipo de pieza (incluye los fijos: marcas en el piso y árboles).
export type Height3DType = PieceType

export type Heights3D = Record<Height3DKey, number>

export const HEIGHT_KEYS: Height3DKey[] = ['table', 'chair', 'stage', 'dance', 'bar', 'screen', 'wall', 'tent', 'service', 'barrier', 'truss', 'vehicle', 'lounge', 'other']

export const DEFAULT_HEIGHTS: Heights3D = {
  table: 0.75,   // mesa de comedor
  chair: 0.9,    // silla con respaldo (asiento a 0,45)
  stage: 0.6,    // tarima / escenario
  dance: 0.05,   // pista de baile
  bar: 1.1,      // barra / buffet
  screen: 3,     // pantalla / LED
  wall: 3,       // muro / perímetro
  tent: 3,       // carpa (translúcida)
  service: 2.6,  // baños, cocina, módulos
  barrier: 1.1,  // vallas
  truss: 6,      // torres y truss
  vehicle: 3,    // camiones, carros
  lounge: 0.8,   // sofá / lounge / puff
  other: 0.9,    // lo que no se reconoce
}

const FLOOR_HEIGHT = 0.05
const TREE_HEIGHT = 4

const RX: [Height3DKey, RegExp][] = [
  ['dance', /\bpista\b|dance\s*floor/i],
  ['lounge', /sof[aá]|lounge|\bpuffs?\b|\bpoufs?\b|sill[oó]n|loveseat/i],
  ['stage', /escenario|\bstage\b|tarima|podium|podio/i],
  ['screen', /pantalla|screen|\bled\b|\bleds\b/i],
  ['bar', /\bbarra\b|\bbar\b|buffet/i],
  ['tent', /carpa|\btent\b|marquee|toldo|backstage/i],
  ['vehicle', /cami[oó]n|truck|remolcador|volquete|mixer|cisterna|compactadora|tunland|aumark|miler|toano|furg[oó]n|\bcarro\b|carrito|food\s*truck/i],
  ['truss', /\btorre\b|truss|tower|\bviga\b/i],
  ['service', /ba[ñn]o|restroom|cocina|kitchen|generador|generator|first\s*aid|dep[oó]sito|m[oó]dulo|camerino/i],
  ['barrier', /valla|fence|barrier|barrera/i],
  ['table', /\bmesa\b|\btable\b|mesas/i],
]

type Piece = Pick<LayoutElement, 'name' | 'category' | 'shape' | 'width' | 'height' | 'seats'> & Partial<Pick<LayoutElement, 'closed' | 'pieceType'>>

// El tipo elegido en Propiedades manda; si no hay, se deduce (sugerencia).
export function heightType(e: Piece): Height3DType {
  if (e.pieceType) return e.pieceType
  return suggestedType(e)
}

export function suggestedType(e: Piece): Height3DType {
  if (e.shape === 'wall') return 'wall'
  if (e.shape === 'tree') return 'tree'
  if (isChair(e as Parameters<typeof isChair>[0])) return 'chair'
  for (const [key, rx] of RX) if (rx.test(e.name)) return key
  if (isTable({ ...e, id: '', x: 0, y: 0, rotation: 0, locked: false } as Parameters<typeof isTable>[0])) return 'table'
  switch (e.category) {
    case 'stage': return 'stage'
    case 'barrier': return 'barrier'
    case 'utility': return 'service'
    case 'circulation': return 'floor'
    case 'primitive': return e.shape === 'path' && !e.closed ? 'other' : 'floor'
    case 'structure': return e.width * e.height > 150 ? 'floor' : 'other' // zonas grandes: marca en el piso
    case 'seating': return 'other'
    default: return 'other'
  }
}

export function height3dOf(e: Piece & Pick<LayoutElement, 'height3d'>, h: Heights3D = DEFAULT_HEIGHTS): number {
  if (typeof e.height3d === 'number' && e.height3d >= 0) return e.height3d
  const t = heightType(e)
  if (t === 'floor') return FLOOR_HEIGHT
  if (t === 'tree') return TREE_HEIGHT
  return h[t]
}

export const isTranslucentType = (t: Height3DType) => t === 'tent'

export function parseHeights(l: Record<string, unknown>): Heights3D {
  const out = { ...DEFAULT_HEIGHTS }
  for (const k of HEIGHT_KEYS) {
    const v = l[`h3d_${k}`]
    const n = typeof v === 'number' ? v : Number(v)
    if (v !== undefined && Number.isFinite(n) && n >= 0) out[k] = n
  }
  return out
}

export const PIECE_TYPES: Height3DType[] = ['chair', 'table', 'lounge', 'stage', 'dance', 'bar', 'screen', 'tent', 'service', 'barrier', 'truss', 'vehicle', 'tree', 'wall', 'floor', 'other']
