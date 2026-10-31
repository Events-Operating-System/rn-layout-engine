import { describe, it, expect } from 'vitest'
import { heightType, height3dOf, parseHeights, DEFAULT_HEIGHTS } from './heights3d'
import type { LayoutElement } from '@/types/layout'

const el = (over: Partial<LayoutElement>): LayoutElement => ({ id: 'a', name: 'X', category: 'primitive', x: 0, y: 0, width: 2, height: 1, rotation: 0, color: '', locked: false, notes: '', ...over })

describe('alturas 3D por tipo', () => {
  it('reconoce piezas por nombre como las nombran las orgs', () => {
    expect(heightType(el({ name: 'Mesa de dulces', category: 'structure', width: 3, height: 0.8 }))).toBe('table')
    expect(heightType(el({ name: 'Escenario 23 x 5', category: 'structure', width: 23, height: 5 }))).toBe('stage')
    expect(heightType(el({ name: 'Pantalla Led', category: 'primitive', width: 10, height: 3.5 }))).toBe('screen')
    expect(heightType(el({ name: 'Camion', category: 'primitive', width: 8.5, height: 2.9 }))).toBe('vehicle')
    expect(heightType(el({ name: 'Torre', category: 'primitive', width: 1.5, height: 2.4 }))).toBe('truss')
    expect(heightType(el({ name: 'Dance Floor', category: 'stage', width: 10, height: 10 }))).toBe('dance')
    expect(heightType(el({ name: 'Bar', category: 'structure', width: 20, height: 1.1 }))).toBe('bar')
    expect(heightType(el({ name: 'Tent 20×20', category: 'structure', width: 20, height: 20 }))).toBe('tent')
    expect(heightType(el({ name: 'Restrooms', category: 'utility', width: 6, height: 3 }))).toBe('service')
  })
  it('las zonas grandes son marcas en el piso (no bloques de 3 m)', () => {
    expect(heightType(el({ name: 'Zona 1', category: 'structure', width: 106.9, height: 17.86 }))).toBe('floor')
    expect(height3dOf(el({ name: 'Zona 1', category: 'structure', width: 106.9, height: 17.86 }))).toBe(0.05)
  })
  it('sillas y mesas', () => {
    expect(heightType(el({ name: 'Chair', category: 'seating', shape: 'rounded-rect', width: 0.45, height: 0.45, seats: 1 }))).toBe('chair')
    expect(heightType(el({ name: 'Round Table 10', category: 'seating', shape: 'circle', width: 1.8, height: 1.8 }))).toBe('table')
  })
  it('la altura de la org y la escrita a mano', () => {
    const h = parseHeights({ h3d_table: 0.9, h3d_stage: 'x', h3d_bar: -1 })
    expect(h.table).toBe(0.9)
    expect(h.stage).toBe(DEFAULT_HEIGHTS.stage)
    expect(h.bar).toBe(DEFAULT_HEIGHTS.bar)
    const mesa = el({ name: 'Mesa de dulces', category: 'structure', width: 3, height: 0.8 })
    expect(height3dOf(mesa, h)).toBe(0.9)
    expect(height3dOf({ ...mesa, height3d: 1.05 }, h)).toBe(1.05)
  })
})
