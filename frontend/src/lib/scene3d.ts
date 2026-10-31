// Vista 3D (bloque 9, primer paso): de las piezas del plano a formas simples
// con sus medidas reales. Sin Three.js ni React: la vista (viewer3d/) arma
// las mallas a partir de esto.
//
// Ejes: x = x del plano (m), z = y del plano (m), y = altura. Las piezas
// giran sobre su esquina (x,y), como en el 2D.

import type { LayoutElement } from '@/types/layout'
import { CATEGORY_COLORS } from '@/types/layout'
import { flattenPath } from './curves'
import { isChair } from './grouping'

export type Kind3D =
  | 'chair'     // silla: asiento + respaldo (instanciada)
  | 'table'     // mesa redonda u ovalada (instanciada)
  | 'box'       // caja (instanciada)
  | 'cylinder'  // cilindro que no es mesa
  | 'tree'      // tronco + copa
  | 'extrude'   // polígono (con curvas) extruido
  | 'wall'      // muro o curva abierta: tramos con grosor

export interface Item3D {
  id: string
  kind: Kind3D
  // Centro de la caja en el piso (m) y giro sobre el eje vertical (rad).
  cx: number
  cz: number
  rotY: number
  width: number   // a lo largo de x local
  depth: number   // a lo largo de z local
  height: number
  elevation: number // altura de la base (0 = piso)
  color: string
  translucent: boolean
  // extrude / wall: contorno en metros del plano (absolutos, ya girados).
  outline?: number[]
  closed?: boolean
  thickness?: number
}

const TALL_NAMES: Record<string, number> = { 'LED Wall': 3.5, Screen: 3, 'DJ Booth': 1.1, 'DJ Booth PRO': 1.1, Podium: 1.1, 'Dance Floor': 0.1, Bar: 1.1, Buffet: 0.9, Lounge: 0.45, 'Chair Row Block': 0.9, 'Bleacher Block': 2, Generator: 1.8, Kitchen: 2.5, Restrooms: 2.6, 'First Aid': 2.6, 'Entrance Gate': 2.6, 'Exit Gate': 2.6, Entrance: 0.05, 'Emergency Exit': 0.05, Fence: 1.1, 'Crowd Barrier': 1.1, 'Fence Panel': 2 }

const CATEGORY_HEIGHT: Record<string, number> = {
  stage: 1, structure: 3, seating: 0.75, barrier: 1.1, utility: 2.5, circulation: 0.05, primitive: 0.05,
}

// Alto de una pieza (m). Las formas sueltas (rectángulos, círculos) quedan
// como marcas en el piso para no tapar nada.
export function heightOf(e: Pick<LayoutElement, 'name' | 'category' | 'shape'>): number {
  if (e.shape === 'wall') return 3
  if (e.shape === 'path') return 2.4
  if (e.shape === 'tree') return 4
  if (TALL_NAMES[e.name] !== undefined) return TALL_NAMES[e.name]
  return CATEGORY_HEIGHT[e.category] ?? 1
}

// Estructuras grandes (carpas, backstage) translúcidas para ver lo de adentro.
function isBigStructure(e: LayoutElement): boolean {
  return e.category === 'structure' && e.width * e.height > 40
}

function rotate(e: LayoutElement, lx: number, ly: number): [number, number] {
  const r = (e.rotation * Math.PI) / 180
  return [e.x + lx * Math.cos(r) - ly * Math.sin(r), e.y + lx * Math.sin(r) + ly * Math.cos(r)]
}

export function toItems(elements: LayoutElement[]): Item3D[] {
  const out: Item3D[] = []
  for (const e of elements) {
    const color = e.color || CATEGORY_COLORS[e.category] || '#94a3b8'
    const [cx, cz] = rotate(e, e.width / 2, e.height / 2)
    const rotY = -(e.rotation * Math.PI) / 180
    const base = { id: e.id, cx, cz, rotY, width: e.width, depth: e.height, elevation: 0, color, translucent: false }
    const pts = e.points ?? []
    if ((e.shape === 'wall' || (e.shape === 'path' && !e.closed)) && pts.length >= 4) {
      const closed = !!e.closed && pts.length >= 6
      const flat = flattenPath(pts, e.segments, closed)
      const abs: number[] = []
      for (let i = 0; i < flat.length; i += 2) abs.push(...rotate(e, flat[i], flat[i + 1]))
      out.push({ ...base, kind: 'wall', height: heightOf(e), outline: abs, closed, thickness: e.thickness ?? (e.shape === 'wall' ? 0.15 : 0.1) })
      continue
    }
    if ((e.shape === 'polygon' || e.shape === 'path') && pts.length >= 4) {
      const flat = flattenPath(pts, e.segments, true)
      const abs: number[] = []
      for (let i = 0; i < flat.length; i += 2) abs.push(...rotate(e, flat[i], flat[i + 1]))
      out.push({ ...base, kind: 'extrude', height: heightOf(e), outline: abs, closed: true, translucent: isBigStructure(e) })
      continue
    }
    if (e.shape === 'tree') {
      out.push({ ...base, kind: 'tree', height: heightOf(e) })
      continue
    }
    if (isChair(e)) {
      out.push({ ...base, kind: 'chair', height: 0.9 })
      continue
    }
    if ((e.shape === 'circle' || e.shape === 'oval') && e.category === 'seating') {
      out.push({ ...base, kind: 'table', height: 0.75 })
      continue
    }
    if (e.shape === 'circle' || e.shape === 'oval') {
      out.push({ ...base, kind: 'cylinder', height: heightOf(e), translucent: isBigStructure(e) })
      continue
    }
    out.push({ ...base, kind: 'box', height: heightOf(e), translucent: isBigStructure(e) })
  }
  return out
}

export function itemsBounds(items: Item3D[]): { minX: number; minZ: number; maxX: number; maxZ: number } | null {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity
  for (const it of items) {
    if (it.outline) {
      for (let i = 0; i < it.outline.length; i += 2) {
        minX = Math.min(minX, it.outline[i]); maxX = Math.max(maxX, it.outline[i])
        minZ = Math.min(minZ, it.outline[i + 1]); maxZ = Math.max(maxZ, it.outline[i + 1])
      }
    } else {
      const r = Math.hypot(it.width, it.depth) / 2
      minX = Math.min(minX, it.cx - r); maxX = Math.max(maxX, it.cx + r)
      minZ = Math.min(minZ, it.cz - r); maxZ = Math.max(maxZ, it.cz + r)
    }
  }
  return Number.isFinite(minX) ? { minX, minZ, maxX, maxZ } : null
}

export function countKinds(items: Item3D[]): Record<Kind3D, number> {
  const c: Record<Kind3D, number> = { chair: 0, table: 0, box: 0, cylinder: 0, tree: 0, extrude: 0, wall: 0 }
  for (const it of items) c[it.kind]++
  return c
}
