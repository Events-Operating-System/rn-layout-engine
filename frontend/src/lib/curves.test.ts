import { describe, it, expect } from 'vitest'
import { arcFromBulge, bulgeFromThreePoints, flattenPath, pathLength, pathArea, halfMoon, smoothSegments, sideInfo, bulgeFromSagitta, sagittaFromBulge, pathBounds } from './curves'
import { elementAreaMeters, elementLengthMeters } from './drawingMath'
import type { Segment } from '@/types/layout'

describe('arcos', () => {
  it('arco por 3 puntos: medio círculo de radio 5', () => {
    const b = bulgeFromThreePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 })
    expect(Math.abs(b)).toBeCloseTo(1, 6)
    const arc = arcFromBulge({ x: 0, y: 0 }, { x: 10, y: 0 }, b)!
    expect(arc.r).toBeCloseTo(5, 6)
    expect(arc.cx).toBeCloseTo(5, 6)
    expect(arc.cy).toBeCloseTo(0, 6)
    expect(pathLength([0, 0, 10, 0], [{ kind: 'arc', bulge: b }], false)).toBeCloseTo(5 * Math.PI, 6)
    // la curva pasa por el punto elegido
    const f = flattenPath([0, 0, 10, 0], [{ kind: 'arc', bulge: b }], false)
    expect(Math.min(...f.filter((_, i) => i % 2 === 1))).toBeCloseTo(-5, 2)
  })
  it('arco chato: 90° y lado contrario', () => {
    const b = bulgeFromThreePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 * (1 - Math.SQRT1_2) * Math.SQRT2 })
    expect(Math.abs(b)).toBeCloseTo(Math.tan(Math.PI / 8), 4)
    expect(Math.sign(b)).toBe(-Math.sign(bulgeFromThreePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -2 })))
  })
  it('tres puntos alineados = recto', () => {
    expect(bulgeFromThreePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 })).toBe(0)
  })
  it('flecha ↔ bulge', () => {
    expect(sagittaFromBulge(bulgeFromSagitta(1.2, 8), 8)).toBeCloseTo(1.2, 9)
  })
})

describe('media luna', () => {
  it('6 m de diámetro: 6 × 3, área π·3²/2 y la curva queda dentro de la caja', () => {
    const h = halfMoon(6)
    expect(h.height).toBe(3)
    expect(pathArea(h.points, h.segments)).toBeCloseTo(Math.PI * 9 / 2, 6)
    const b = pathBounds(h.points, h.segments, true)
    expect(b.minY).toBeCloseTo(0, 6)
    expect(b.maxY).toBeCloseTo(3, 2)
    expect(elementAreaMeters({ shape: 'polygon', width: 6, height: 3, points: h.points, segments: h.segments })).toBeCloseTo(Math.PI * 9 / 2, 6)
    expect(elementLengthMeters({ shape: 'polygon', points: h.points, segments: h.segments, closed: true })).toBeCloseTo(6 + 3 * Math.PI, 6)
  })
})

describe('área con lados curvos', () => {
  const sq = [0, 0, 4, 0, 4, 4, 0, 4]
  const seg = (b: number): Segment[] => [{ kind: 'arc', bulge: b }, { kind: 'line' }, { kind: 'line' }, { kind: 'line' }]
  it('un lado curvo hacia afuera suma y hacia adentro resta medio círculo', () => {
    const half = Math.PI * 4 / 2 // r = 2
    const a1 = pathArea(sq, seg(1)), a2 = pathArea(sq, seg(-1))
    expect([a1, a2].sort((x, y) => x - y)[0]).toBeCloseTo(16 - half, 6)
    expect([a1, a2].sort((x, y) => x - y)[1]).toBeCloseTo(16 + half, 6)
    // y coincide con la polilínea fina (lo que se dibuja)
    for (const b of [1, -1]) {
      const f = flattenPath(sq, seg(b), true)
      expect(pathArea(f, undefined)).toBeCloseTo(pathArea(sq, seg(b)), 1)
    }
  })
  it('el arco hacia afuera queda fuera del cuadrado', () => {
    const out = [1, -1].find(b => pathBounds(sq, seg(b), true).minY < -1)!
    expect(pathArea(sq, seg(out))).toBeGreaterThan(16)
  })
})

describe('curva libre', () => {
  it('pasa por los puntos y queda suave', () => {
    const pts = [0, 0, 5, 3, 10, 0]
    const segs = smoothSegments(pts, false)
    expect(segs).toHaveLength(2)
    const f = flattenPath(pts, segs, false)
    expect(f.slice(0, 2)).toEqual([0, 0])
    expect(f.slice(-2)).toEqual([10, 0])
    expect(f.some((v, i) => i % 2 === 0 && v === 5 && f[i + 1] === 3)).toBe(true)
    expect(pathLength(pts, segs, false)).toBeGreaterThan(Math.hypot(5, 3) * 2 - 0.01)
  })
  it('medida en el medio de cada lado', () => {
    const info = sideInfo([0, 0, 10, 0], [{ kind: 'arc', bulge: 1 }], false)
    expect(info[0].length).toBeCloseTo(5 * Math.PI, 6)
    expect(Math.abs(info[0].my)).toBeCloseTo(5, 6)
  })
})

describe('editar lados', () => {
  it('curvar un lado de un cuadrado corre la esquina sin mover la pieza', async () => {
    const { withSegments, sidesOf } = await import('./curves')
    const el = { x: 10, y: 10, rotation: 0, points: [0, 0, 4, 0, 4, 4, 0, 4], shape: 'polygon' }
    const sides = sidesOf(el.points, undefined, true)
    expect(sides).toHaveLength(4)
    // lado de arriba en medio círculo hacia afuera (cuerda 4 m → flecha 2 m)
    const up = [1, -1].map(b => withSegments(el, [{ kind: 'arc', bulge: b }, ...sides.slice(1)])).find(u => u.y < 10)!
    expect(up.y).toBeCloseTo(8, 2)
    expect(up.height).toBeCloseTo(6, 2)
    // el vértice 0 sigue en el mismo lugar del plano
    expect(up.x + up.points[0]).toBeCloseTo(10, 6)
    expect(up.y + up.points[1]).toBeCloseTo(10, 6)
    // volver a recto: sin segments
    const back = withSegments({ ...el, points: up.points, x: up.x, y: up.y }, sides)
    expect(back.segments).toBeUndefined()
    expect(back.y).toBeCloseTo(10, 3)
  })
  it('con la pieza rotada 90°, el vértice 0 queda quieto', async () => {
    const { withSegments } = await import('./curves')
    const el = { x: 10, y: 10, rotation: 90, points: [0, 0, 4, 0, 4, 4, 0, 4], shape: 'polygon' }
    const u = [1, -1].map(b => withSegments(el, [{ kind: 'arc', bulge: b }, { kind: 'line' }, { kind: 'line' }, { kind: 'line' }])).find(v => v.height > 4.5)!
    const r = Math.PI / 2
    const wx = u.x + u.points[0] * Math.cos(r) - u.points[1] * Math.sin(r)
    const wy = u.y + u.points[0] * Math.sin(r) + u.points[1] * Math.cos(r)
    expect(wx).toBeCloseTo(10, 6)
    expect(wy).toBeCloseTo(10, 6)
  })
})

describe('editar con el mouse', () => {
  it('mover un vértice hacia afuera no mueve los demás en el plano', async () => {
    const { moveVertex, withGeometry } = await import('./curves')
    const el = { x: 10, y: 10, rotation: 30, shape: 'polygon' }
    const pts = [0, 0, 4, 0, 4, 4, 0, 4]
    const moved = moveVertex(pts, undefined, true, 0, -2, -1)
    const g = withGeometry(el, moved.points, moved.segments)
    const world = (gx: number, gy: number, lx: number, ly: number) => {
      const r = Math.PI / 6
      return [gx + lx * Math.cos(r) - ly * Math.sin(r), gy + lx * Math.sin(r) + ly * Math.cos(r)]
    }
    // el vértice 2 (4,4) sigue en el mismo lugar del plano
    const before = world(10, 10, 4, 4)
    const after = world(g.x, g.y, g.points[4], g.points[5])
    // al milímetro (la geometría se guarda redondeada a mm)
    expect(after[0]).toBeCloseTo(before[0], 3)
    expect(after[1]).toBeCloseTo(before[1], 3)
    expect(g.width).toBeCloseTo(6, 3)
    expect(Math.min(...g.points.filter((_, i) => i % 2 === 0))).toBeCloseTo(0, 3)
  })
  it('las manijas pegadas al vértice se mueven con él', async () => {
    const { moveVertex, smoothSegments } = await import('./curves')
    const pts = [0, 0, 5, 3, 10, 0]
    const segs = smoothSegments(pts, false)
    const m = moveVertex(pts, segs, false, 1, 6, 4)
    const s0 = m.segments![0] as { c2: [number, number] }, s1 = m.segments![1] as { c1: [number, number] }
    const o0 = segs[0] as { c2: [number, number] }, o1 = segs[1] as { c1: [number, number] }
    expect(s0.c2[0] - o0.c2[0]).toBeCloseTo(1, 9)
    expect(s1.c1[1] - o1.c1[1]).toBeCloseTo(1, 9)
  })
  it('mover una manija y el punto medio de un arco', async () => {
    const { moveHandle, moveArcApex, smoothSegments, arcFromBulge } = await import('./curves')
    const segs = moveHandle(smoothSegments([0, 0, 10, 0], false), 0, 'c1', 2, -5)
    expect((segs[0] as { c1: number[] }).c1).toEqual([2, -5])
    const arc = moveArcApex([0, 0, 10, 0], [{ kind: 'line' }], false, 0, 5, -5)
    expect(arcFromBulge({ x: 0, y: 0 }, { x: 10, y: 0 }, (arc[0] as { bulge: number }).bulge)!.r).toBeCloseTo(5, 6)
  })
})

describe('agregar y quitar vértices', () => {
  it('agregar en un lado recto y quitarlo vuelve al polígono', async () => {
    const { insertVertex, removeVertex } = await import('./curves')
    const pts = [0, 0, 4, 0, 4, 4, 0, 4]
    const ins = insertVertex(pts, undefined, true, 0, 1, 0.3)
    expect(ins.index).toBe(1)
    expect(ins.points).toEqual([0, 0, 1, 0, 4, 0, 4, 4, 0, 4])
    expect(removeVertex(ins.points, ins.segments, true, 1)!.points).toEqual(pts)
  })
  it('partir un arco no cambia la forma ni el largo', async () => {
    const { insertVertex, pathLength, pathArea } = await import('./curves')
    const pts = [0, 0, 10, 0], segs = [{ kind: 'arc' as const, bulge: 1 }]
    const ins = insertVertex(pts, segs, false, 0, 2, -4)
    expect(pathLength(ins.points, ins.segments, false)).toBeCloseTo(5 * Math.PI, 6)
    // cerrado: misma área
    const closedSegs = [{ kind: 'arc' as const, bulge: -1 }, { kind: 'line' as const }]
    const c = insertVertex(pts, closedSegs, true, 0, 5, 5)
    expect(pathArea(c.points, c.segments)).toBeCloseTo(pathArea(pts, closedSegs), 6)
  })
  it('partir una curva libre no cambia el trazo', async () => {
    const { insertVertex, smoothSegments, pathLength } = await import('./curves')
    const pts = [0, 0, 5, 3, 10, 0], segs = smoothSegments(pts, false)
    const ins = insertVertex(pts, segs, false, 0, 2.5, 2)
    expect(ins.points.length).toBe(8)
    expect(pathLength(ins.points, ins.segments, false)).toBeCloseTo(pathLength(pts, segs, false), 2)
  })
  it('quitar respeta el mínimo y las puntas de lo abierto', async () => {
    const { removeVertex } = await import('./curves')
    expect(removeVertex([0, 0, 4, 0, 4, 4], undefined, true, 0)).toBeNull()
    expect(removeVertex([0, 0, 5, 0], undefined, false, 1)).toBeNull()
    const r = removeVertex([0, 0, 5, 0, 10, 0], [{ kind: 'line' }, { kind: 'arc', bulge: 0.5 }], false, 2)!
    expect(r.points).toEqual([0, 0, 5, 0])
    expect(r.segments).toEqual([{ kind: 'line' }])
  })
  it('quitar el vértice de dos arcos deja un arco que pasa por ahí', async () => {
    const { insertVertex, removeVertex } = await import('./curves')
    const ins = insertVertex([0, 0, 10, 0], [{ kind: 'arc', bulge: 1 }], false, 0, 5, 5)
    const r = removeVertex(ins.points, ins.segments, false, 1)!
    expect(Math.abs((r.segments![0] as { bulge: number }).bulge)).toBeCloseTo(1, 4)
  })
})
