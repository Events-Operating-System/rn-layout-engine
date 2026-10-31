import { describe, it, expect } from 'vitest'
import { roundTableWithChairs, rectTableWithChairs, rectTableSeats, countSeats, effectivePax, isPaxAuto } from './seating'
import { DEFAULT_LAYOUT_SETTINGS as S } from './layoutSettings'

// Centro real de una pieza que rota sobre su esquina (x,y)
const center = (c: { dx: number; dy: number; width: number; height: number; rotation: number }) => {
  const r = (c.rotation * Math.PI) / 180, h = c.width / 2
  return { x: c.dx + h * Math.cos(r) - h * Math.sin(r), y: c.dy + h * Math.sin(r) + h * Math.cos(r) }
}

describe('roundTableWithChairs', () => {
  it('mesa de 10: 1 mesa + 10 sillas a la distancia justa del centro', () => {
    const g = roundTableWithChairs(10, S)
    expect(g).toHaveLength(11)
    const table = g[0]
    expect(table.width).toBe(1.8)
    const tc = { x: table.dx + 0.9, y: table.dy + 0.9 }
    const expected = 0.9 + 0.15 + 0.225
    for (const chair of g.slice(1)) {
      const c = center(chair)
      expect(Math.hypot(c.x - tc.x, c.y - tc.y)).toBeCloseTo(expected, 3)
      expect(chair.seats).toBe(1)
      expect(chair.width).toBe(0.45)
    }
  })
  it('usa las medidas de la org', () => {
    const g = roundTableWithChairs(8, { ...S, tableRound8: 1.6, chairSize: 0.5 })
    expect(g[0].width).toBe(1.6)
    expect(g[1].width).toBe(0.5)
    expect(g).toHaveLength(9)
  })
})

describe('rectTableWithChairs', () => {
  it('2,4 m: 4 sillas por lado', () => {
    const g = rectTableWithChairs(S)
    expect(g).toHaveLength(1 + 8)
    expect(rectTableSeats(S)).toBe(8)
    expect(countSeats(g)).toBe(8)
  })
})

describe('PAX automático', () => {
  it('cuenta los asientos', () => {
    expect(effectivePax({ pax: '', paxAuto: true }, [{ seats: 1 }, { seats: 1 }, {}])).toBe('2')
  })
  it('a mano manda lo escrito', () => {
    expect(effectivePax({ pax: '120', paxAuto: false }, [{ seats: 1 }])).toBe('120')
  })
  it('planos viejos: manual si ya tenían algo escrito; si no, automático', () => {
    expect(isPaxAuto({ pax: '80' })).toBe(false)
    expect(isPaxAuto({ pax: '' })).toBe(true)
  })
  it('sin asientos queda vacío', () => {
    expect(effectivePax({ pax: '', paxAuto: true }, [])).toBe('')
  })
})
