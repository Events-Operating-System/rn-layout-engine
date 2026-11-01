// Vista 3D (bloque 9, primer paso): de las piezas del plano a formas simples
// con sus medidas reales. Sin Three.js ni React: la vista (viewer3d/) arma
// las mallas a partir de esto.
//
// Ejes: x = x del plano (m), z = y del plano (m), y = altura. Las piezas
// giran sobre su esquina (x,y), como en el 2D.

import type { LayoutElement } from '@/types/layout'
import { CATEGORY_COLORS } from '@/types/layout'
import { flattenPath } from './curves'
import { isShortCloth } from './furnishing'
import { height3dOf, heightType, isTranslucentType, DEFAULT_HEIGHTS, type Heights3D } from './heights3d'

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
  // Mesa con mantel corto (no llega al piso).
  shortCloth?: boolean
}

// Alto de una pieza (m): el de su tipo (ajuste de la org) o el escrito a
// mano en Propiedades. Ver lib/heights3d.ts.
export function heightOf(e: Pick<LayoutElement, 'name' | 'category' | 'shape' | 'width' | 'height' | 'seats' | 'closed' | 'height3d'>, h: Heights3D = DEFAULT_HEIGHTS): number {
  return height3dOf(e, h)
}

function rotate(e: LayoutElement, lx: number, ly: number): [number, number] {
  const r = (e.rotation * Math.PI) / 180
  return [e.x + lx * Math.cos(r) - ly * Math.sin(r), e.y + lx * Math.sin(r) + ly * Math.cos(r)]
}

export function toItems(elements: LayoutElement[], heights: Heights3D = DEFAULT_HEIGHTS): Item3D[] {
  const out: Item3D[] = []
  for (const e of elements) {
    const height = heightOf(e, heights)
    const translucent = isTranslucentType(heightType(e))
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
      out.push({ ...base, kind: 'wall', height, outline: abs, closed, thickness: e.thickness ?? (e.shape === 'wall' ? 0.15 : 0.1) })
      continue
    }
    if ((e.shape === 'polygon' || e.shape === 'path') && pts.length >= 4) {
      const flat = flattenPath(pts, e.segments, true)
      const abs: number[] = []
      for (let i = 0; i < flat.length; i += 2) abs.push(...rotate(e, flat[i], flat[i + 1]))
      out.push({ ...base, kind: 'extrude', height, outline: abs, closed: true, translucent })
      continue
    }
    if (e.shape === 'tree') {
      out.push({ ...base, kind: 'tree', height })
      continue
    }
    if (heightType(e) === 'chair') {
      out.push({ ...base, kind: 'chair', height })
      continue
    }
    if ((e.shape === 'circle' || e.shape === 'oval') && heightType(e) === 'table') {
      out.push({ ...base, kind: 'table', height, shortCloth: isShortCloth(e.fabric) })
      continue
    }
    if (e.shape === 'circle' || e.shape === 'oval') {
      out.push({ ...base, kind: 'cylinder', height, translucent })
      continue
    }
    out.push({ ...base, kind: 'box', height, translucent })
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
