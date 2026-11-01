import { describe, it, expect } from 'vitest'
import { materialLines, diffLines, canon, normKey, colorNameOf, mergeVocab, originOf } from './materials'
import type { LayoutElement } from '@/types/layout'

const el = (id: string, over: Partial<LayoutElement>): LayoutElement => ({ id, name: 'X', category: 'primitive', x: 0, y: 0, width: 1, height: 1, rotation: 0, color: '#64748b', locked: false, notes: '', ...over })
const chair = (id: string, over: Partial<LayoutElement> = {}) => el(id, { name: 'Chair', category: 'seating', shape: 'rounded-rect', width: 0.45, height: 0.45, seats: 1, color: '#d97706', ...over })
const table10 = (id: string, over: Partial<LayoutElement> = {}) => el(id, { name: 'Round Table 10', category: 'seating', shape: 'circle', width: 1.8, height: 1.8, color: '#f59e0b', ...over })

describe('normalizar', () => {
  it('"Blanco", " blanco ", "BLANCO" son lo mismo; se usa la forma de la org', () => {
    expect(normKey(' BLANCO  ')).toBe(normKey('blanco'))
    expect(normKey('Satén')).toBe(normKey('saten'))
    expect(canon(' blanco ', ['Blanco'])).toBe('Blanco')
    expect(canon('dorado  viejo')).toBe('Dorado viejo')
  })
  it('nombre de color por el hex', () => {
    expect(colorNameOf('#ffffff')).toBe('Blanco')
    expect(colorNameOf('#a855f7')).toBe('Morado')
    expect(colorNameOf('#d4af37')).toBe('Dorado')
  })
})

describe('lista de materiales', () => {
  it('sillas por tipo y color, con mayúsculas distintas en la misma línea', () => {
    const lines = materialLines([
      chair('a', { chairType: 'Tiffany', colorName: 'Morado' }),
      chair('b', { chairType: 'tiffany ', colorName: 'morado' }),
      chair('c', { chairType: 'Crossback', color: '#ffffff' }),
      chair('d'), // color de fábrica: sin variante de color
    ], { chairTypes: ['Tiffany'], fabrics: [], colorNames: ['Morado'] })
    const chairs = lines.filter(l => l.kind === 'chair')
    expect(chairs.map(l => [l.variant.join(' · '), l.qty])).toEqual([['', 1], ['Crossback · Blanco', 1], ['Tiffany · Morado', 2]])
  })
  it('mesas por tamaño y manteles por color, tela y mesa', () => {
    const lines = materialLines([
      table10('t1', { color: '#ffffff', fabric: 'Largo' }),
      table10('t2', { colorName: 'blanco', fabric: 'largo' }),
      table10('t3'), // sin mantel elegido
      el('r', { name: 'Rect Table', category: 'seating', width: 2.4, height: 0.75, color: '#f59e0b' }),
    ])
    const tables = lines.filter(l => l.kind === 'table')
    expect(tables.map(l => [l.variant[0], l.qty])).toEqual([['2.4 × 0.75 m', 1], ['Ø 1.8 m', 3]])
    const cloths = lines.filter(l => l.kind === 'cloth')
    expect(cloths).toHaveLength(1)
    expect(cloths[0]).toMatchObject({ variant: ['Blanco', 'Largo', 'Ø 1.8 m'], qty: 2 })
  })
  it('tarima y pista en m², barra en metros; muros y zonas no cuentan', () => {
    const lines = materialLines([
      el('s1', { name: 'Escenario', category: 'stage', width: 6, height: 4 }),
      el('s2', { name: 'Tarima', category: 'stage', width: 2, height: 1 }),
      el('d', { name: 'Dance Floor', category: 'stage', width: 5, height: 5 }),
      el('b', { name: 'Barra', category: 'structure', width: 5, height: 1 }),
      el('w', { name: 'Perimeter', category: 'structure', shape: 'wall', width: 20, height: 10, points: [0, 0, 20, 0], closed: false }),
      el('z', { name: 'Zona 1', category: 'structure', width: 100, height: 30 }),
    ])
    expect(lines.find(l => l.kind === 'stage')).toMatchObject({ qty: 26, unit: 'm2', pieces: 2 })
    expect(lines.find(l => l.kind === 'dance')).toMatchObject({ qty: 25, unit: 'm2' })
    expect(lines.find(l => l.kind === 'bar')).toMatchObject({ qty: 5, unit: 'm' })
    expect(lines.some(l => l.kind === 'wall' || l.kind === 'floor')).toBe(false)
  })
  it('el tipo elegido en Propiedades manda sobre el nombre', () => {
    const lines = materialLines([el('x', { name: 'Mueble raro', category: 'primitive', width: 1.8, height: 1.8, shape: 'circle', pieceType: 'table' })])
    expect(lines[0]).toMatchObject({ kind: 'table', variant: ['Ø 1.8 m'] })
  })
})

describe('comparar versiones', () => {
  it('+10 sillas, −1 mesa y lo que ya no está', () => {
    const v1 = materialLines([...Array.from({ length: 10 }, (_, i) => chair(`c${i}`)), table10('t1'), table10('t2'), el('p', { name: 'Podio', category: 'stage', width: 1, height: 1 })])
    const v2 = materialLines([...Array.from({ length: 20 }, (_, i) => chair(`c${i}`)), table10('t1')])
    const d = diffLines(v2, v1)
    expect(d.byKey.get(v2.find(l => l.kind === 'chair')!.key)).toBe(10)
    expect(d.byKey.get(v2.find(l => l.kind === 'table')!.key)).toBe(-1)
    expect(d.removed.map(l => l.kind)).toEqual(['stage'])
  })
})

describe('sugerencias y origen', () => {
  it('une las de la org con las del plano sin repetir', () => {
    const v = mergeVocab({ chairTypes: ['Tiffany'], fabrics: [], colorNames: ['Blanco'] }, [chair('a', { chairType: 'tiffany', colorName: 'Dorado' })])
    expect(v.chairTypes).toEqual(['Tiffany'])
    expect(v.colorNames).toEqual(['Blanco', 'Dorado'])
  })
  it('origen propio por defecto', () => {
    expect(originOf(undefined, 'x')).toEqual({ origin: 'own' })
    expect(originOf({ x: { origin: 'third', note: 'Alquileres SAC' } }, 'x').origin).toBe('third')
  })
})
