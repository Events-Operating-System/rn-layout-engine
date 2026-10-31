import { describe, it, expect } from 'vitest'
import { toItems, heightOf, itemsBounds, countKinds } from './scene3d'
import { roundTableWithChairs } from './seating'
import { DEFAULT_LAYOUT_SETTINGS } from './layoutSettings'
import { halfMoon } from './curves'
import type { LayoutElement } from '@/types/layout'

const el = (over: Partial<LayoutElement>): LayoutElement => ({ id: 'a', name: 'X', category: 'primitive', x: 0, y: 0, width: 2, height: 1, rotation: 0, color: '#123456', locked: false, notes: '', ...over })

describe('3D: piezas a formas', () => {
  it('mesa con sillas: 1 mesa y 10 sillas para instanciar', () => {
    const els = roundTableWithChairs(10, DEFAULT_LAYOUT_SETTINGS).map((c, i) => el({ id: `p${i}`, name: c.name, category: c.category, shape: c.shape, x: c.dx, y: c.dy, width: c.width, height: c.height, rotation: c.rotation, seats: c.seats }))
    const k = countKinds(toItems(els))
    expect(k.table).toBe(1)
    expect(k.chair).toBe(10)
  })
  it('el centro respeta el giro sobre la esquina', () => {
    const [it] = toItems([el({ x: 10, y: 10, width: 4, height: 2, rotation: 90, category: 'stage' })])
    expect(it.cx).toBeCloseTo(9, 6)
    expect(it.cz).toBeCloseTo(12, 6)
    expect(it.rotY).toBeCloseTo(-Math.PI / 2, 6)
    expect(it.height).toBe(0.6) // tarima por defecto
  })
  it('alturas por tipo', () => {
    expect(heightOf(el({ name: 'LED Wall', category: 'stage' }))).toBe(3)
    expect(heightOf(el({ name: 'Rectangle', category: 'primitive' }))).toBe(0.05)
    expect(heightOf(el({ name: 'Perimeter', category: 'structure', shape: 'wall' }))).toBe(3)
  })
  it('carpa grande translúcida; media luna extruida con su curva', () => {
    const h = halfMoon(8)
    const items = toItems([
      el({ id: 't', name: 'Tent 20×20', category: 'structure', width: 20, height: 20 }),
      el({ id: 's', name: 'Half-Moon Stage', category: 'stage', shape: 'polygon', x: 5, y: 5, width: 8, height: 4, points: h.points, segments: h.segments }),
    ])
    expect(items[0].translucent).toBe(true)
    expect(items[1].kind).toBe('extrude')
    expect(items[1].outline!.length / 2).toBeGreaterThan(80) // arco en tramos de 2°
    const b = itemsBounds([items[1]])!
    expect(b.maxZ).toBeCloseTo(9, 2)
  })
  it('muro cerrado con sus tramos en coordenadas del plano', () => {
    const [w] = toItems([el({ shape: 'wall', category: 'structure', x: 2, y: 3, width: 10, height: 5, points: [0, 0, 10, 0, 10, 5, 0, 5], closed: true, thickness: 0.2 })])
    expect(w.kind).toBe('wall')
    expect(w.outline).toEqual([2, 3, 12, 3, 12, 8, 2, 8])
    expect(w.thickness).toBe(0.2)
  })
})
