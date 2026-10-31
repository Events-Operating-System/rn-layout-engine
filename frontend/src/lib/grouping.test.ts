import { describe, it, expect } from 'vitest'
import { dragSet, ungroupIds, detectTableChairGroups, isChair, groupIdsForCopy } from './grouping'
import { roundTableWithChairs, rectTableWithChairs } from './seating'
import { DEFAULT_LAYOUT_SETTINGS as S } from './layoutSettings'
import type { GroupChild, LayoutElement } from '@/types/layout'

// Coloca un conjunto en (ox, oy) como piezas sueltas (sin groupId), igual
// que un plano viejo.
function place(children: GroupChild[], ox: number, oy: number, prefix: string, groupId?: string): LayoutElement[] {
  return children.map((c, i) => ({
    id: `${prefix}${i}`, name: c.name, category: c.category, shape: c.shape,
    x: ox + c.dx, y: oy + c.dy, width: c.width, height: c.height, rotation: c.rotation,
    color: c.color, locked: false, notes: '', seats: c.seats, groupId,
  }))
}

describe('dragSet', () => {
  const set = place(roundTableWithChairs(8, S), 0, 0, 'a', 'g1')
  const loose = place(roundTableWithChairs(8, S), 10, 0, 'b')
  const all = [...set, ...loose]

  it('arrastrar la mesa mueve sus sillas', () => {
    expect(dragSet('a0', new Set(['a0']), all).sort()).toEqual(set.map(e => e.id).sort())
  })
  it('arrastrar una silla la mueve sola', () => {
    expect(dragSet('a3', new Set(['a3']), all)).toEqual(['a3'])
  })
  it('una mesa sin grupo se mueve sola', () => {
    expect(dragSet('b0', new Set(['b0']), all)).toEqual(['b0'])
  })
  it('selección múltiple: la mesa trae su conjunto y lo bloqueado queda', () => {
    const withLock = all.map(e => (e.id === 'a5' ? { ...e, locked: true } : e))
    const ids = dragSet('a0', new Set(['a0', 'b0']), withLock)
    expect(ids).toContain('b0')
    expect(ids).toContain('a1')
    expect(ids).not.toContain('a5')
    expect(ids).not.toContain('b1')
  })
})

describe('ungroupIds', () => {
  it('desagrupa el conjunto entero de la pieza elegida', () => {
    const all = [...place(roundTableWithChairs(8, S), 0, 0, 'a', 'g1'), ...place(roundTableWithChairs(8, S), 10, 0, 'b', 'g2')]
    expect(ungroupIds(['a4'], all)).toHaveLength(9)
    expect(ungroupIds(['a4'], all).every(id => id.startsWith('a'))).toBe(true)
  })
})

describe('detectTableChairGroups', () => {
  const ids = (i: number) => `grp-${i}`

  it('agrupa cada mesa redonda y rectangular con sus sillas', () => {
    const all = [
      ...place(roundTableWithChairs(10, S), 0, 0, 'a'),
      ...place(roundTableWithChairs(8, S), 3.5, 0, 'b'),
      ...place(rectTableWithChairs(S), 0, 5, 'c'),
    ]
    const r = detectTableChairGroups(all, S, ids)
    expect(r.tables).toBe(3)
    expect(r.chairs).toBe(10 + 8 + 8)
    expect(new Set(all.filter(e => e.id.startsWith('a')).map(e => r.assign[e.id])).size).toBe(1)
    expect(r.assign.a0).not.toBe(r.assign.b0)
    expect(r.assign.c3).toBe(r.assign.c0)
  })
  it('funciona con la mesa rotada', () => {
    const all = place(rectTableWithChairs(S), 0, 0, 'c').map(e => ({ ...e }))
    // Rotar todo 90° alrededor del origen (x,y → -y,x) y sumar 90 a cada pieza.
    const rot = all.map(e => ({ ...e, x: -e.y, y: e.x, rotation: (e.rotation + 90) % 360 }))
    expect(detectTableChairGroups(rot, S, ids).chairs).toBe(8)
  })
  it('no toca lo que ya está agrupado ni sillas lejanas', () => {
    const all = [
      ...place(roundTableWithChairs(8, S), 0, 0, 'a', 'g1'),
      ...place(roundTableWithChairs(8, S), 10, 0, 'b').slice(0, 1),
      { ...place(roundTableWithChairs(8, S), 0, 0, 'z')[1], id: 'far', x: 30, y: 30 },
    ]
    const r = detectTableChairGroups(all, S, ids)
    expect(r.tables).toBe(0)
    expect(r.assign).toEqual({})
  })
  it('la silla entre dos mesas va con la más cercana', () => {
    const t = (id: string, x: number): LayoutElement => ({ id, name: 'Round Table 8', category: 'seating', shape: 'circle', x, y: 0, width: 1.5, height: 1.5, rotation: 0, color: '', locked: false, notes: '' })
    const chair: LayoutElement = { id: 'ch', name: 'Chair', category: 'seating', shape: 'rounded-rect', x: 1.6, y: 0.5, width: 0.45, height: 0.45, rotation: 0, color: '', locked: false, notes: '', seats: 1 }
    const r = detectTableChairGroups([t('t1', 0), t('t2', 2.6), chair], S, ids)
    expect(r.assign.ch).toBe(r.assign.t1)
  })
  it('isChair reconoce sillas viejas chicas', () => {
    expect(isChair({ name: 'Silla', category: 'primitive', shape: 'circle', width: 0.5, height: 0.5 })).toBe(true)
    expect(isChair({ name: 'Round Table 8', category: 'seating', shape: 'circle', width: 1.5, height: 1.5 })).toBe(false)
  })
})

describe('groupIdsForCopy', () => {
  it('conjunto entero → grupo nuevo; parte → suelta', () => {
    const all = [{ id: 'a', groupId: 'g' }, { id: 'b', groupId: 'g' }, { id: 'c' }]
    const whole = groupIdsForCopy(all, all, i => `n${i}`)
    expect(whole.get('a')).toBe('n0')
    expect(whole.get('b')).toBe('n0')
    expect(whole.get('c')).toBeUndefined()
    expect(groupIdsForCopy([all[1]], all, i => `n${i}`).get('b')).toBeUndefined()
  })
})
