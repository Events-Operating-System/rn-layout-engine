// Conjuntos (mesa con sus sillas, asset compuesto): qué se mueve al
// arrastrar, desagrupar y agrupar las sillas sueltas con su mesa en planos
// viejos. Sin React ni Konva.

import type { LayoutElement } from '@/types/layout'
import { CHAIR_NAME } from './seating'

type Piece = Pick<LayoutElement, 'id' | 'name' | 'category' | 'shape' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'locked' | 'groupId' | 'seats'>

const SMALL = 0.8 // m: lado máximo de una silla

// Una silla: la pieza "Silla" del catálogo, o en planos viejos una pieza
// chica de asientos/formas que cuenta 1 asiento o es un círculo/cuadrado.
export function isChair(e: Pick<Piece, 'name' | 'category' | 'shape' | 'width' | 'height' | 'seats'>): boolean {
  if (e.name === CHAIR_NAME) return true
  if (e.shape === 'wall' || e.shape === 'polygon' || e.shape === 'tree') return false
  if (Math.max(e.width, e.height) > SMALL) return false
  if (e.seats === 1) return true
  return (e.category === 'seating' || e.category === 'primitive') && e.width > 0.2 && e.height > 0.2
}

function isTable(e: Piece): boolean {
  if (e.category !== 'seating' || isChair(e)) return false
  if (e.shape === 'wall' || e.shape === 'polygon' || e.shape === 'tree') return false
  return Math.min(e.width, e.height) >= 0.5
}

// Qué piezas se mueven al arrastrar `draggedId`:
// - si es parte de una selección múltiple, la selección;
// - si no, solo ella;
// - y cada pieza que no sea silla arrastra su conjunto entero. Una silla
//   arrastrada sola se mueve sola. Lo bloqueado no se mueve.
export function dragSet(draggedId: string, selectedIds: Set<string>, all: Piece[]): string[] {
  const base = selectedIds.size > 1 && selectedIds.has(draggedId) ? [...selectedIds] : [draggedId]
  const byId = new Map(all.map(e => [e.id, e]))
  const groups = new Set<string>()
  for (const id of base) {
    const e = byId.get(id)
    if (e?.groupId && !isChair(e)) groups.add(e.groupId)
  }
  const out = new Set(base)
  if (groups.size) for (const e of all) if (e.groupId && groups.has(e.groupId)) out.add(e.id)
  return [...out].filter(id => {
    const e = byId.get(id)
    return e && !e.locked
  })
}

// Ids que pierden su groupId al desagrupar la selección (el conjunto entero
// de cada pieza elegida).
export function ungroupIds(selectedIds: string[], all: Piece[]): string[] {
  const groups = new Set(all.filter(e => selectedIds.includes(e.id) && e.groupId).map(e => e.groupId!))
  return all.filter(e => e.groupId && groups.has(e.groupId)).map(e => e.id)
}

// Centro de la pieza (rota sobre su esquina x,y, como Konva).
function center(e: Piece): { x: number; y: number } {
  const r = (e.rotation * Math.PI) / 180
  const hw = e.width / 2, hh = e.height / 2
  return { x: e.x + hw * Math.cos(r) - hh * Math.sin(r), y: e.y + hw * Math.sin(r) + hh * Math.cos(r) }
}

// Distancia del punto p al borde de la mesa (0 si cae dentro).
function distanceToEdge(table: Piece, p: { x: number; y: number }): number {
  const c = center(table)
  if (table.shape === 'circle' || table.shape === 'oval') {
    const rad = (table.width + table.height) / 4
    return Math.max(0, Math.hypot(p.x - c.x, p.y - c.y) - rad)
  }
  // Rectángulo: al sistema de la mesa (sin rotar).
  const r = (-table.rotation * Math.PI) / 180
  const dx = p.x - c.x, dy = p.y - c.y
  const lx = dx * Math.cos(r) - dy * Math.sin(r)
  const ly = dx * Math.sin(r) + dy * Math.cos(r)
  const ox = Math.max(0, Math.abs(lx) - table.width / 2)
  const oy = Math.max(0, Math.abs(ly) - table.height / 2)
  return Math.hypot(ox, oy)
}

export interface ChairGrouping {
  // id de la pieza → groupId nuevo
  assign: Record<string, string>
  tables: number
  chairs: number
}

// Sillas sueltas alrededor de cada mesa suelta: una silla es de la mesa si
// su centro queda a no más de (espacio silla–mesa + silla + 0,3 m de
// holgura) del borde de la mesa. Si queda cerca de dos mesas, va con la más
// cercana. Solo piezas sin groupId; no toca nada más.
export function detectTableChairGroups(
  all: Piece[],
  s: { chairGap: number; chairSize: number },
  makeGroupId: (i: number) => string,
): ChairGrouping {
  const maxDist = s.chairGap + s.chairSize + 0.3
  const tables = all.filter(e => !e.groupId && isTable(e))
  const chairs = all.filter(e => !e.groupId && isChair(e))
  const byTable = new Map<string, string[]>()
  for (const ch of chairs) {
    const p = center(ch)
    let best: { id: string; d: number } | null = null
    for (const t of tables) {
      const d = distanceToEdge(t, p)
      if (d <= maxDist && (!best || d < best.d)) best = { id: t.id, d }
    }
    if (best) byTable.set(best.id, [...(byTable.get(best.id) ?? []), ch.id])
  }
  const assign: Record<string, string> = {}
  let i = 0, n = 0
  for (const [tableId, chairIds] of byTable) {
    const g = makeGroupId(i++)
    assign[tableId] = g
    for (const c of chairIds) assign[c] = g
    n += chairIds.length
  }
  return { assign, tables: byTable.size, chairs: n }
}

// Al duplicar: si se copia un conjunto entero, la copia es un conjunto nuevo
// (groupId propio); si se copia solo una parte (una silla), la copia queda
// suelta. Nunca se suma al conjunto original.
export function groupIdsForCopy(source: Pick<Piece, 'id' | 'groupId'>[], all: Pick<Piece, 'id' | 'groupId'>[], makeGroupId: (i: number) => string): Map<string, string | undefined> {
  const picked = new Set(source.map(e => e.id))
  const fresh = new Map<string, string>()
  const out = new Map<string, string | undefined>()
  let i = 0
  for (const e of source) {
    if (!e.groupId) { out.set(e.id, undefined); continue }
    const whole = all.filter(o => o.groupId === e.groupId).every(o => picked.has(o.id))
    if (!whole) { out.set(e.id, undefined); continue }
    if (!fresh.has(e.groupId)) fresh.set(e.groupId, makeGroupId(i++))
    out.set(e.id, fresh.get(e.groupId))
  }
  return out
}
