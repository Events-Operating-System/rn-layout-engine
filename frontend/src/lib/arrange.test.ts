import { describe, it, expect } from 'vitest'
import { alignUpdates, distributeUpdates, gridCopies, buildUnits } from './arrange'
import type { LayoutElement } from '@/types/layout'

const el = (id: string, x: number, y: number, w = 2, h = 1, extra: Partial<LayoutElement> = {}): LayoutElement => ({
  id, name: id, category: 'seating', x, y, width: w, height: h, rotation: 0, color: '#000', locked: false, notes: '', ...extra,
})

// Mesa de 2×2 con dos sillas a los costados, todo con el mismo groupId
const mesa = (g: string, x: number, y: number) => [
  el(`${g}-t`, x, y, 2, 2, { groupId: g }),
  el(`${g}-s1`, x - 0.6, y + 0.75, 0.5, 0.5, { groupId: g }),
  el(`${g}-s2`, x + 2.1, y + 0.75, 0.5, 0.5, { groupId: g }),
]

describe('bloques (mesa + sillas)', () => {
  it('elegir solo la mesa trae el conjunto entero', () => {
    const all = [...mesa('A', 0, 0), el('x', 10, 0)]
    const units = buildUnits([all[0], all[3]], all)
    expect(units).toHaveLength(2)
    expect(units[0].members.map(m => m.id)).toEqual(['A-t', 'A-s1', 'A-s2'])
    expect(units[0].x).toBeCloseTo(-0.6)
    expect(units[0].width).toBeCloseTo(3.2)
  })

  it('alinear arriba mueve cada mesa con sus sillas, sin desarmarlas', () => {
    const all = [...mesa('A', 0, 0), ...mesa('B', 5, 3)]
    const u = alignUpdates([all[0], all[3]], all, 'top')
    // B baja 3 → todas sus piezas suben 3; las sillas conservan su lugar relativo
    expect(u['B-t']).toEqual({ y: 0 })
    expect(u['B-s1']).toEqual({ y: 0.75 })
    expect(u['B-s2']).toEqual({ y: 0.75 })
    expect(u['A-t']).toEqual({})
  })

  it('alinear a la izquierda usa la caja del conjunto (sillas incluidas)', () => {
    const all = [...mesa('A', 0, 0), ...mesa('B', 5, 3)]
    const u = alignUpdates([all[0], all[3]], all, 'left')
    expect(u['B-s1']).toEqual({ x: -0.6 })
    expect(u['B-t']).toEqual({ x: 0 })
  })

  it('un conjunto con una pieza bloqueada no se mueve', () => {
    const b = mesa('B', 5, 3); b[1].locked = true
    const all = [...mesa('A', 0, 0), ...b, el('x', 9, 9)]
    const u = alignUpdates([all[0], all[3], all[6]], all, 'top')
    expect(u['B-t']).toBeUndefined()
    expect(u['x']).toEqual({ y: 0 })
  })
})

describe('alignUpdates (piezas sueltas)', () => {
  it('izquierda, centro y abajo', () => {
    const els = [el('a', 1, 0), el('b', 5, 3, 4, 2)]
    expect(alignUpdates(els, els, 'left')).toEqual({ a: {}, b: { x: 1 } })
    expect(alignUpdates(els, els, 'center')).toEqual({ a: { x: 4 }, b: { x: 3 } })
    // b ya está abajo: no se mueve
    expect(alignUpdates(els, els, 'bottom')).toEqual({ a: { y: 4 }, b: {} })
  })
})

describe('distributeUpdates', () => {
  it('reparte el espacio libre parejo entre bloques', () => {
    const els = [el('a', 0, 0), el('b', 3, 0), el('c', 10, 0)]
    expect(distributeUpdates(els, els, 'horizontal')).toEqual({ a: {}, b: { x: 5 }, c: {} })
  })
  it('tres mesas con sillas: el conjunto del medio se mueve entero', () => {
    const all = [...mesa('A', 0, 0), ...mesa('B', 4, 0), ...mesa('C', 20, 0)]
    const u = distributeUpdates([all[0], all[3], all[6]], all, 'horizontal')
    // cajas de 3.2 m: A -0.6..2.6, B 3.4..6.6, C 19.4..22.6 → libre 13.6 → 6.8 entre cada una
    // B empieza en 2.6 + 6.8 = 9.4 → se corre +6 entero
    expect(u['B-s1']).toEqual({ x: 9.4 })
    expect(u['B-t']).toEqual({ x: 10 })
    expect(u['B-s2']).toEqual({ x: 12.1 })
  })
  it('pide al menos 3 bloques', () => {
    const all = [...mesa('A', 0, 0), ...mesa('B', 4, 0)]
    expect(distributeUpdates(all, all, 'vertical')).toEqual({})
  })
})

describe('gridCopies', () => {
  it('3 × 4 de una mesa suelta con separación de 1,5 m → 11 copias', () => {
    const m = [el('m', 0, 0, 1.8, 1.8)]
    const { copies } = gridCopies(m, m, 3, 4, 1.5, i => `n${i}`, i => `g${i}`)
    expect(copies).toHaveLength(11)
    expect(copies[0]).toMatchObject({ x: 3.3, y: 0 })
    expect(copies[copies.length - 1]).toMatchObject({ x: 9.9, y: 6.6 })
  })
  it('elegir solo la mesa copia también sus sillas, con un groupId nuevo por copia', () => {
    const all = mesa('A', 0, 0)
    const { originals, copies } = gridCopies([all[0]], all, 1, 3, 1, i => `n${i}`, i => `g${i}`)
    expect(originals).toHaveLength(3)
    expect(copies).toHaveLength(6)
    expect(new Set(copies.map(c => c.groupId))).toEqual(new Set(['g0', 'g1']))
    // paso = ancho del conjunto (3.2) + 1
    expect(copies.find(c => c.id === 'n0')!.x).toBeCloseTo(4.2)
  })
})
