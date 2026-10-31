// Mantel y sillas (pedido de Javier, 2026-10-31): el color de una mesa es el
// color del MANTEL, con tipo/tela opcional; las sillas tienen tipo y color.
// Un conjunto mesa + sillas (o una selección) se cambia entero.
import type { LayoutElement } from '@/types/layout'
import { isChair, isTable } from './grouping'

export const CHAIR_TYPES = ['Tiffany', 'Crossback', 'Plegable', 'Phoenix', 'Ghost', 'Avant-garde', 'Banqueta', 'Lounge']
export const CLOTH_TYPES = ['Hasta el piso', 'Corto', 'Lino', 'Satén', 'Spandex', 'Algodón', 'Cubremantel']

// ¿Mantel corto? (en 3D, el mantel no llega al piso).
export const isShortCloth = (fabric?: string) => !!fabric && /corto|short|curto/i.test(fabric)

type Piece = Pick<LayoutElement, 'id' | 'name' | 'category' | 'shape' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'locked' | 'groupId' | 'seats'>

// Las piezas que toca un cambio: las elegidas y sus conjuntos enteros.
export function withGroups<T extends Piece>(ids: string[], all: T[]): T[] {
  const set = new Set(ids)
  const groups = new Set(all.filter(e => set.has(e.id) && e.groupId).map(e => e.groupId))
  return all.filter(e => set.has(e.id) || (e.groupId && groups.has(e.groupId)))
}

export interface Furnishing {
  clothColor?: string
  fabric?: string
  chairType?: string
  chairColor?: string
}

// Cambios por pieza: mantel a las mesas, tipo/color a las sillas.
export function furnishingUpdates<T extends Piece>(ids: string[], all: T[], f: Furnishing): Record<string, Partial<LayoutElement>> {
  const out: Record<string, Partial<LayoutElement>> = {}
  for (const e of withGroups(ids, all)) {
    if (e.locked) continue
    if (isTable(e)) {
      const u: Partial<LayoutElement> = {}
      if (f.clothColor !== undefined) u.color = f.clothColor
      if (f.fabric !== undefined) u.fabric = f.fabric || undefined
      if (Object.keys(u).length) out[e.id] = u
    } else if (isChair(e)) {
      const u: Partial<LayoutElement> = {}
      if (f.chairColor !== undefined) u.color = f.chairColor
      if (f.chairType !== undefined) u.chairType = f.chairType || undefined
      if (Object.keys(u).length) out[e.id] = u
    }
  }
  return out
}

export function summary<T extends Piece & Pick<LayoutElement, 'color' | 'fabric' | 'chairType'>>(items: T[]): { tables: number; chairs: number } {
  return { tables: items.filter(isTable).length, chairs: items.filter(isChair).length }
}
