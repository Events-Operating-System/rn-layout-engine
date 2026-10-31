import { describe, it, expect } from 'vitest'
import { furnishingUpdates, withGroups, isShortCloth } from './furnishing'
import { roundTableWithChairs } from './seating'
import { DEFAULT_LAYOUT_SETTINGS } from './layoutSettings'
import type { LayoutElement } from '@/types/layout'

const set = (prefix: string, group?: string): LayoutElement[] => roundTableWithChairs(8, DEFAULT_LAYOUT_SETTINGS).map((c, i) => ({
  id: `${prefix}${i}`, name: c.name, category: c.category, shape: c.shape, x: c.dx, y: c.dy, width: c.width, height: c.height,
  rotation: c.rotation, color: c.color, locked: false, notes: '', seats: c.seats, groupId: group,
}))

describe('mantel y sillas', () => {
  const all = [...set('a', 'g1'), ...set('b', 'g2')]
  it('elegir la mesa cambia el mantel y, si se pide, las sillas del conjunto', () => {
    const u = furnishingUpdates(['a0'], all, { clothColor: '#ffffff', fabric: 'Lino, hasta el piso', chairType: 'Tiffany', chairColor: '#c0a060' })
    expect(u.a0).toEqual({ color: '#ffffff', fabric: 'Lino, hasta el piso' })
    expect(u.a3).toEqual({ color: '#c0a060', chairType: 'Tiffany' })
    expect(Object.keys(u).filter(k => k.startsWith('b'))).toEqual([])
    expect(Object.keys(u)).toHaveLength(9)
  })
  it('solo el mantel no toca las sillas', () => {
    const u = furnishingUpdates(['a0'], all, { clothColor: '#000000' })
    expect(Object.keys(u)).toEqual(['a0'])
  })
  it('selección de dos conjuntos', () => {
    expect(withGroups(['a1', 'b0'], all)).toHaveLength(18)
  })
  it('lo bloqueado no cambia', () => {
    const locked = all.map(e => (e.id === 'a2' ? { ...e, locked: true } : e))
    expect(furnishingUpdates(['a0'], locked, { chairColor: '#111111' }).a2).toBeUndefined()
  })
  it('mantel corto', () => {
    expect(isShortCloth('Satén corto')).toBe(true)
    expect(isShortCloth('Hasta el piso')).toBe(false)
  })
})
