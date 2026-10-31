// Mesas con sus sillas y PAX automático (bloque 4). Sin React ni Konva.
// Las piezas se devuelven como GroupChild (dx/dy en metros desde la esquina
// del conjunto) para colocarlas con addGroup, igual que un asset compuesto.

import { CATEGORY_COLORS, type GroupChild, type LayoutElement, type LayoutMeta } from '@/types/layout'
import type { LayoutSettings } from './layoutSettings'

export const CHAIR_NAME = 'Chair'
const CHAIR_COLOR = '#d97706'
const round = (n: number) => Math.round(n * 1000) / 1000

// Las piezas rotan sobre su esquina (x,y), como Konva. Para que una silla
// rotada quede centrada en (cx, cy) hay que correr su esquina.
function chairAt(cx: number, cy: number, size: number, rotationDeg: number): Omit<GroupChild, 'dx' | 'dy'> & { x: number; y: number } {
  const r = (rotationDeg * Math.PI) / 180
  const h = size / 2
  return {
    name: CHAIR_NAME,
    category: 'seating',
    shape: 'rounded-rect',
    x: cx - (h * Math.cos(r) - h * Math.sin(r)),
    y: cy - (h * Math.sin(r) + h * Math.cos(r)),
    width: size,
    height: size,
    rotation: ((rotationDeg % 360) + 360) % 360,
    color: CHAIR_COLOR,
    seats: 1,
  }
}

type Placed = Omit<GroupChild, 'dx' | 'dy'> & { x: number; y: number }

// Pasa de coordenadas absolutas a dx/dy relativos a la esquina del conjunto.
function toGroup(pieces: Placed[]): GroupChild[] {
  const minX = Math.min(...pieces.map(p => p.x))
  const minY = Math.min(...pieces.map(p => p.y))
  return pieces.map(({ x, y, ...p }) => ({
    ...p,
    dx: round(x - minX),
    dy: round(y - minY),
    width: round(p.width),
    height: round(p.height),
  }))
}

// Mesa redonda con N sillas mirando al centro, repartidas parejo.
export function roundTableWithChairs(seats: 8 | 10 | 12, s: LayoutSettings): GroupChild[] {
  const d = seats === 8 ? s.tableRound8 : seats === 10 ? s.tableRound10 : s.tableRound12
  const table: Placed = {
    name: `Round Table ${seats}`, category: 'seating', shape: 'circle',
    x: 0, y: 0, width: d, height: d, rotation: 0, color: CATEGORY_COLORS.seating,
  }
  const radius = d / 2 + s.chairGap + s.chairSize / 2
  const chairs: Placed[] = []
  for (let i = 0; i < seats; i++) {
    const a = -90 + (360 / seats) * i
    const rad = (a * Math.PI) / 180
    chairs.push(chairAt(d / 2 + radius * Math.cos(rad), d / 2 + radius * Math.sin(rad), s.chairSize, a + 90))
  }
  return toGroup([table, ...chairs])
}

// Mesa rectangular con sillas en los dos lados largos (una cada ~0,6 m).
export function rectTableWithChairs(s: LayoutSettings): GroupChild[] {
  const L = s.tableRectLength, W = s.tableRectWidth
  const perSide = Math.max(1, Math.floor(L / 0.6))
  const table: Placed = {
    name: 'Rect Table', category: 'seating', shape: 'rect',
    x: 0, y: 0, width: L, height: W, rotation: 0, color: CATEGORY_COLORS.seating,
  }
  const chairs: Placed[] = []
  const off = s.chairGap + s.chairSize / 2
  for (let i = 0; i < perSide; i++) {
    const cx = (L / perSide) * (i + 0.5)
    chairs.push(chairAt(cx, -off, s.chairSize, 180))
    chairs.push(chairAt(cx, W + off, s.chairSize, 0))
  }
  return toGroup([table, ...chairs])
}

export function rectTableSeats(s: LayoutSettings): number {
  return Math.max(1, Math.floor(s.tableRectLength / 0.6)) * 2
}

// Asientos dibujados: suma de `seats` (las sillas valen 1).
export function countSeats(elements: Pick<LayoutElement, 'seats'>[]): number {
  return elements.reduce((n, e) => n + (e.seats && e.seats > 0 ? e.seats : 0), 0)
}

// ¿El PAX se calcula solo? Planos viejos (sin paxAuto): manual si ya tenían
// algo escrito, para no cambiarles lo que ven.
export function isPaxAuto(meta: Pick<LayoutMeta, 'pax' | 'paxAuto'>): boolean {
  if (meta.paxAuto !== undefined) return meta.paxAuto
  return !meta.pax?.trim()
}

// Lo que va en la casilla PAX (pantalla, PNG y PDF).
export function effectivePax(meta: Pick<LayoutMeta, 'pax' | 'paxAuto'>, elements: Pick<LayoutElement, 'seats'>[]): string {
  if (!isPaxAuto(meta)) return meta.pax
  const n = countSeats(elements)
  return n > 0 ? String(n) : ''
}
