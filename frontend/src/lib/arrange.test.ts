import { describe, it, expect } from 'vitest'
import { alignUpdates, distributeUpdates, gridCopies } from './arrange'
import type { LayoutElement } from '@/types/layout'

const el = (id: string, x: number, y: number, w = 2, h = 1, locked = false): LayoutElement => ({
  id, name: id, category: 'seating', x, y, width: w, height: h, rotation: 0, color: '#000', locked, notes: '',
})

describe('alignUpdates', () => {
  it('izquierda, centro y abajo', () => {
    const els = [el('a', 1, 0), el('b', 5, 3, 4, 2)]
    expect(alignUpdates(els, 'left')).toEqual({ a: { x: 1 }, b: { x: 1 } })
    expect(alignUpdates(els, 'center')).toEqual({ a: { x: 4 }, b: { x: 3 } })
    expect(alignUpdates(els, 'bottom')).toEqual({ a: { y: 4 }, b: { y: 3 } })
  })
  it('no mueve las bloqueadas', () => {
    expect(alignUpdates([el('a', 1, 0), el('b', 5, 0, 2, 1, true), el('c', 9, 0)], 'left')).toEqual({ a: { x: 1 }, c: { x: 1 } })
  })
})

describe('distributeUpdates', () => {
  it('reparte el espacio libre parejo entre la primera y la última', () => {
    const u = distributeUpdates([el('a', 0, 0), el('b', 3, 0), el('c', 10, 0)], 'horizontal')
    // span 0..12, piezas 6 m → libre 6 m → 3 m entre cada una
    expect(u).toEqual({ a: { x: 0 }, b: { x: 5 }, c: { x: 10 } })
  })
  it('pide al menos 3', () => {
    expect(distributeUpdates([el('a', 0, 0), el('b', 3, 0)], 'vertical')).toEqual({})
  })
})

describe('gridCopies', () => {
  it('3 × 4 de una mesa con separación de 1,5 m → 11 copias', () => {
    const out = gridCopies([el('m', 0, 0, 1.8, 1.8)], 3, 4, 1.5, i => `n${i}`)
    expect(out).toHaveLength(11)
    expect(out[0]).toMatchObject({ x: 3.3, y: 0 })
    expect(out[out.length - 1]).toMatchObject({ x: 9.9, y: 6.6 })
  })
  it('copia el conjunto entero (mesa + sillas) con el paso del conjunto', () => {
    const out = gridCopies([el('t', 0, 0, 2, 2), el('s', 2, 0, 1, 1)], 1, 2, 1, i => `n${i}`)
    expect(out.map(e => e.x)).toEqual([4, 6])
  })
})
