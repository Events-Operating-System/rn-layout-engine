import { describe, it, expect } from 'vitest'
import { sheetLayout, pickScale, contentBounds, drawingsInside, scaleBarMeters, paperLabel } from './pdfLayout'
import type { LayoutElement } from '@/types/layout'

const el = (over: Partial<LayoutElement>): LayoutElement => ({ id: 'a', name: 'X', category: 'primitive', x: 0, y: 0, width: 1, height: 1, rotation: 0, color: '', locked: false, notes: '', ...over })

describe('hoja', () => {
  it('A4 apaisado y A3 vertical', () => {
    const a4 = sheetLayout({ paper: 'a4', landscape: true })
    expect([a4.pageW, a4.pageH]).toEqual([297, 210])
    expect(a4.titleBlock.y + a4.titleBlock.h).toBe(202)
    expect(a4.frame.y + a4.frame.h).toBeLessThan(a4.titleBlock.y)
    const a3 = sheetLayout({ paper: 'a3', landscape: false })
    expect([a3.pageW, a3.pageH]).toEqual([297, 420])
  })
  it('etiqueta', () => {
    expect(paperLabel({ paper: 'a3', landscape: false })).toBe('A3 vertical')
  })
})

describe('escala automática', () => {
  it('elige la escala estándar más grande en la que entra', () => {
    // salón de 52 × 38 m en un recuadro de 269 × 155 mm → 1:250 (208 × 152 mm)
    expect(pickScale(52, 38, 269, 155)).toBe(250)
    // en A3 (392 × 242 mm) entra a 1:200 (260 × 190)
    expect(pickScale(52, 38, 392, 242)).toBe(200)
    // una mesa de 3 m entra a 1:20
    expect(pickScale(3, 3, 269, 155)).toBe(20)
    // enorme: redondeado al millar
    expect(pickScale(5000, 10, 269, 155)).toBe(19000)
  })
  it('barra de escala redonda', () => {
    expect(scaleBarMeters(200, 40)).toBe(5) // 5 m = 25 mm
    expect(scaleBarMeters(1000, 40)).toBe(25)
  })
})

describe('caja del contenido', () => {
  it('cuenta las esquinas de una pieza rotada', () => {
    const b = contentBounds([el({ x: 10, y: 10, width: 4, height: 2, rotation: 90 })], [])!
    expect(b.minX).toBeCloseTo(8, 6)
    expect(b.maxX).toBeCloseTo(10, 6)
    expect(b.maxY).toBeCloseTo(14, 6)
  })
  it('incluye dibujos (px → m) y el fondo si se pide', () => {
    const b = contentBounds([el({})], [{ id: 'd', tool: 'line', points: [0, 0, 200, 0], color: '', strokeWidth: 1 }], { path: 'p', x: -5, y: -5, width: 1, height: 1, opacity: 1, locked: true })!
    expect(b.maxX).toBe(10)
    expect(b.minX).toBe(-5)
  })
  it('dibujos dentro de la selección', () => {
    const d = [
      { id: 'in', tool: 'dimension' as const, points: [20, 20, 40, 20], color: '', strokeWidth: 1 },
      { id: 'out', tool: 'line' as const, points: [20, 20, 400, 20], color: '', strokeWidth: 1 },
    ]
    expect(drawingsInside(d, { minX: 0, minY: 0, maxX: 5, maxY: 5 }).map(x => x.id)).toEqual(['in'])
  })
})
