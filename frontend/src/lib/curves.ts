// Curvas (bloque 7, §2 de docs/AUDITORIA-LAYOUT.md). Sin React ni Konva.
//
// Una pieza con lados curvos guarda sus vértices en `points` (metros desde
// su esquina, como el polígono) y, en `segments`, cómo es cada lado: el lado
// i va del vértice i al i+1 (y, si está cerrada, el último vuelve al 0).
//   - line:   recto (lo mismo que no tener `segments`).
//   - arc:    arco con `bulge` = tan(barrido/4), el formato de AutoCAD/DXF:
//             un solo número da el radio, el centro y el ángulo exactos.
//             bulge 1 = media circunferencia. El signo dice hacia qué lado.
//   - bezier: curva libre cúbica; c1 y c2 son las manijas, en metros desde
//             la esquina de la pieza (igual que `points`).
// Dibujo, PDF, hit-testing y área usan la polilínea fina de flattenPath.

import type { Segment } from '@/types/layout'

type P = { x: number; y: number }

// Lo que entrega el canvas al terminar un arco o una curva.
export interface NewPath {
  kind: 'arc' | 'curve'
  closed: boolean
  x: number
  y: number
  width: number
  height: number
  points: number[]
  segments?: Segment[]
}

const pt = (pts: number[], i: number): P => ({ x: pts[i * 2], y: pts[i * 2 + 1] })

export interface Arc {
  cx: number
  cy: number
  r: number
  start: number // ángulo (radianes) del primer punto, visto desde el centro
  sweep: number // barrido con signo (positivo = sentido de los ángulos crecientes)
}

// Arco exacto desde la cuerda p1→p2 y su bulge. null si es recto.
export function arcFromBulge(p1: P, p2: P, bulge: number): Arc | null {
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const c = Math.hypot(dx, dy)
  if (c < 1e-9 || Math.abs(bulge) < 1e-9) return null
  const s = (bulge * c) / 2 // flecha con signo
  const r = (c * c / 4 + s * s) / (2 * Math.abs(s))
  const nx = -dy / c, ny = dx / c // normal a la izquierda de p1→p2
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2
  const k = s - Math.sign(s) * r
  const cx = mx + nx * k, cy = my + ny * k
  const start = Math.atan2(p1.y - cy, p1.x - cx)
  const theta = 4 * Math.atan(Math.abs(bulge))
  // ¿Hacia qué lado gira? El punto más alto del arco es m + n·s.
  const apex = Math.atan2(my + ny * s - cy, mx + nx * s - cx)
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const positive = norm(apex - start) < theta
  return { cx, cy, r, start, sweep: positive ? theta : -theta }
}

// Bulge del arco que va de a a b pasando por m (arco por 3 puntos, como en
// CAD). Si los tres están alineados, 0 (recto).
export function bulgeFromThreePoints(a: P, b: P, m: P): number {
  const ax = a.x - m.x, ay = a.y - m.y, bx = b.x - m.x, by = b.y - m.y
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by)
  if (la < 1e-9 || lb < 1e-9) return 0
  const cross = (b.x - a.x) * (m.y - a.y) - (b.y - a.y) * (m.x - a.x)
  if (Math.abs(cross) < 1e-9) return 0
  // Ángulo en m entre a y b: el barrido del arco es 2·(π − φ).
  const phi = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))))
  const mag = 1 / Math.tan(phi / 2)
  return Math.sign(cross) * mag
}

// Flecha (m, con signo) ↔ bulge, para editar un arco con un número que se
// entiende: cuánto se separa el centro del arco de la cuerda.
export const sagittaFromBulge = (bulge: number, chord: number) => (bulge * chord) / 2
export const bulgeFromSagitta = (sagitta: number, chord: number) => (chord > 1e-9 ? (2 * sagitta) / chord : 0)

function bezierPoint(p0: P, c1: P, c2: P, p3: P, t: number): P {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  }
}

const ARC_STEP = Math.PI / 90 // 2°
const BEZIER_STEPS = 24

// Puntos intermedios de un lado (sin el primero; incluye el último).
function sampleSegment(a: P, b: P, seg: Segment | undefined): P[] {
  if (seg?.kind === 'arc') {
    const arc = arcFromBulge(a, b, seg.bulge)
    if (!arc) return [b]
    const n = Math.max(2, Math.ceil(Math.abs(arc.sweep) / ARC_STEP))
    const out: P[] = []
    for (let k = 1; k < n; k++) {
      const ang = arc.start + (arc.sweep * k) / n
      out.push({ x: arc.cx + arc.r * Math.cos(ang), y: arc.cy + arc.r * Math.sin(ang) })
    }
    out.push(b)
    return out
  }
  if (seg?.kind === 'bezier') {
    const c1 = { x: seg.c1[0], y: seg.c1[1] }, c2 = { x: seg.c2[0], y: seg.c2[1] }
    const out: P[] = []
    for (let k = 1; k < BEZIER_STEPS; k++) out.push(bezierPoint(a, c1, c2, b, k / BEZIER_STEPS))
    out.push(b)
    return out
  }
  return [b]
}

export function hasCurves(segments: Segment[] | undefined): boolean {
  return !!segments?.some(s => s.kind !== 'line')
}

// Polilínea fina [x0,y0,...] para dibujar, exportar y medir. Cerrada: no
// repite el primer punto (como `points`).
export function flattenPath(points: number[], segments: Segment[] | undefined, closed: boolean): number[] {
  const n = points.length / 2
  if (n < 2 || !hasCurves(segments)) return points
  const out = [points[0], points[1]]
  const sides = closed ? n : n - 1
  for (let i = 0; i < sides; i++) {
    const a = pt(points, i), b = pt(points, (i + 1) % n)
    for (const q of sampleSegment(a, b, segments?.[i])) out.push(q.x, q.y)
  }
  if (closed) out.splice(out.length - 2, 2) // el último es el primero
  return out
}

// Largo de un lado: exacto para rectas y arcos; Bézier por subdivisión.
export function segmentLength(a: P, b: P, seg: Segment | undefined): number {
  if (seg?.kind === 'arc') {
    const arc = arcFromBulge(a, b, seg.bulge)
    return arc ? arc.r * Math.abs(arc.sweep) : Math.hypot(b.x - a.x, b.y - a.y)
  }
  if (seg?.kind === 'bezier') {
    let len = 0, prev = a
    for (const q of sampleSegment(a, b, seg)) { len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q }
    return len
  }
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pathLength(points: number[], segments: Segment[] | undefined, closed: boolean): number {
  const n = points.length / 2
  if (n < 2) return 0
  let sum = 0
  for (let i = 0; i < (closed ? n : n - 1); i++) sum += segmentLength(pt(points, i), pt(points, (i + 1) % n), segments?.[i])
  return sum
}

// Área encerrada: Shoelace sobre los vértices más el segmento circular de
// cada arco (exacto); las Bézier, sobre su polilínea fina (error < 0,1 %).
export function pathArea(points: number[], segments: Segment[] | undefined): number {
  const n = points.length / 2
  if (n < 2) return 0
  const hasBezier = segments?.some(s => s.kind === 'bezier')
  const base = hasBezier ? flattenPath(points, segments?.map(s => (s.kind === 'arc' ? { kind: 'line' as const } : s)), true) : points
  let sum = 0
  const m = base.length / 2
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m
    sum += base[i * 2] * base[j * 2 + 1] - base[j * 2] * base[i * 2 + 1]
  }
  // Signo del recorrido (Shoelace con y hacia abajo): sum > 0 = horario en pantalla.
  const orient = Math.sign(sum) || 1
  let area = Math.abs(sum) / 2
  for (let i = 0; i < n; i++) {
    const seg = segments?.[i]
    if (seg?.kind !== 'arc') continue
    const arc = arcFromBulge(pt(points, i), pt(points, (i + 1) % n), seg.bulge)
    if (!arc) continue
    const th = Math.abs(arc.sweep)
    const segArea = (arc.r * arc.r / 2) * (th - Math.sin(th))
    // El arco suma si se abre hacia afuera del recorrido y resta si entra.
    const outward = Math.sign(seg.bulge) === -orient
    area += outward ? segArea : -segArea
  }
  return Math.abs(area)
}

// Para las medidas junto a cada lado: largo y punto medio de la curva.
export function sideInfo(points: number[], segments: Segment[] | undefined, closed: boolean): { length: number; mx: number; my: number; angle: number }[] {
  const n = points.length / 2
  const out: { length: number; mx: number; my: number; angle: number }[] = []
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pt(points, i), b = pt(points, (i + 1) % n), seg = segments?.[i]
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    if (seg?.kind === 'arc' && Math.abs(seg.bulge) > 1e-9) {
      const c = Math.hypot(b.x - a.x, b.y - a.y), s = sagittaFromBulge(seg.bulge, c)
      mx += (-(b.y - a.y) / c) * s
      my += ((b.x - a.x) / c) * s
    } else if (seg?.kind === 'bezier') {
      const q = bezierPoint(a, { x: seg.c1[0], y: seg.c1[1] }, { x: seg.c2[0], y: seg.c2[1] }, b, 0.5)
      mx = q.x; my = q.y
    }
    out.push({ length: segmentLength(a, b, seg), mx, my, angle: Math.atan2(b.y - a.y, b.x - a.x) })
  }
  return out
}

// Curva libre suave que pasa por los puntos (Catmull-Rom → Bézier cúbica):
// cada lado queda como Bézier con sus manijas, editable después.
export function smoothSegments(points: number[], closed: boolean): Segment[] {
  const n = points.length / 2
  const get = (i: number): P => (closed ? pt(points, ((i % n) + n) % n) : pt(points, Math.max(0, Math.min(n - 1, i))))
  const segs: Segment[] = []
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2)
    segs.push({
      kind: 'bezier',
      c1: [p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6],
      c2: [p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6],
    })
  }
  return segs
}

// Caja de la curva (con lo que sobresalen los arcos y las Bézier), para
// pasar todo a coordenadas desde su esquina.
export function pathBounds(points: number[], segments: Segment[] | undefined, closed: boolean): { minX: number; minY: number; maxX: number; maxY: number } {
  const f = flattenPath(points, segments, closed)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < f.length; i += 2) {
    minX = Math.min(minX, f[i]); maxX = Math.max(maxX, f[i])
    minY = Math.min(minY, f[i + 1]); maxY = Math.max(maxY, f[i + 1])
  }
  return { minX, minY, maxX, maxY }
}

// Mover todo (vértices y manijas) en (dx, dy).
export function translatePath(points: number[], segments: Segment[] | undefined, dx: number, dy: number): { points: number[]; segments?: Segment[] } {
  return {
    points: points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
    ...(segments ? { segments: segments.map(s => (s.kind === 'bezier' ? { ...s, c1: [s.c1[0] + dx, s.c1[1] + dy] as [number, number], c2: [s.c2[0] + dx, s.c2[1] + dy] as [number, number] } : s)) } : {}),
  }
}

// Estirar con el recuadro: vértices y manijas se escalan; los arcos
// conservan su bulge (siguen siendo arcos de círculo sobre la cuerda nueva).
export function scaleSegments(segments: Segment[] | undefined, sx: number, sy: number): Segment[] | undefined {
  return segments?.map(s => (s.kind === 'bezier' ? { ...s, c1: [s.c1[0] * sx, s.c1[1] * sy] as [number, number], c2: [s.c2[0] * sx, s.c2[1] * sy] as [number, number] } : s))
}

// Media luna: medio círculo de diámetro w (lado recto arriba, curva abajo).
// Para escenarios con frente curvo, pistas y backings.
export function halfMoon(w: number): { points: number[]; segments: Segment[]; width: number; height: number } {
  // Recorrido: (0,0) → (w,0) recto, (w,0) → (0,0) en arco hacia abajo.
  return { points: [0, 0, w, 0], segments: [{ kind: 'line' }, { kind: 'arc', bulge: -1 }], width: w, height: w / 2 }
}

// De puntos absolutos (metros) a una pieza: esquina, caja y vértices/manijas
// desde la esquina (la caja incluye lo que sobresalen las curvas).
export function normalizePath(points: number[], segments: Segment[] | undefined, closed: boolean): {
  x: number; y: number; width: number; height: number; points: number[]; segments?: Segment[]
} {
  const b = pathBounds(points, segments, closed)
  const r = (n: number) => Math.round(n * 1000) / 1000
  const moved = translatePath(points, segments, -b.minX, -b.minY)
  return {
    x: r(b.minX), y: r(b.minY),
    width: Math.max(0.01, r(b.maxX - b.minX)), height: Math.max(0.01, r(b.maxY - b.minY)),
    points: moved.points.map(r),
    ...(moved.segments ? { segments: moved.segments.map(s => (s.kind === 'bezier' ? { ...s, c1: [r(s.c1[0]), r(s.c1[1])] as [number, number], c2: [r(s.c2[0]), r(s.c2[1])] as [number, number] } : s.kind === 'arc' ? { ...s, bulge: Math.round(s.bulge * 1e6) / 1e6 } : s)) } : {}),
  }
}

// Cambiar cómo es un lado (Propiedades): si la curva sale de la caja, se
// corre la esquina para que la pieza no se mueva en el plano (también si
// está rotada: la esquina se corre en el sentido de la rotación).
export function withSegments(
  el: { x: number; y: number; rotation: number; points?: number[]; closed?: boolean; shape?: string },
  segments: Segment[],
): { x: number; y: number; width: number; height: number; points: number[]; segments?: Segment[] } {
  const pts = el.points ?? []
  const closed = el.shape === 'polygon' ? true : !!el.closed
  const clean = segments.every(s => s.kind === 'line') ? undefined : segments
  const n = normalizePath(pts, clean, closed)
  const r = (el.rotation * Math.PI) / 180
  const round = (v: number) => Math.round(v * 1000) / 1000
  return {
    ...n,
    x: round(el.x + n.x * Math.cos(r) - n.y * Math.sin(r)),
    y: round(el.y + n.x * Math.sin(r) + n.y * Math.cos(r)),
    ...(clean ? {} : { segments: undefined }),
  }
}

// Lados de la pieza con su tipo (sin `segments` = todos rectos).
export function sidesOf(points: number[], segments: Segment[] | undefined, closed: boolean): Segment[] {
  const n = points.length / 2
  const count = closed ? n : n - 1
  return Array.from({ length: Math.max(0, count) }, (_, i) => segments?.[i] ?? { kind: 'line' as const })
}
