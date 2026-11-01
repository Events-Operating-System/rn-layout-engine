// Lista de materiales del plano (versión simple de L1, pedido de Javier
// 2026-11-01). Cuenta las piezas por tipo + variante (sillas Tiffany
// moradas, mesas redondas de Ø 1,8 m, manteles blancos largos) y en m² o
// metros lo que corresponde (tarimas, pista, barras). No toca Inventarios
// ni Ventas. Sin React.

import type { LayoutElement, MaterialOrigin } from '@/types/layout'
import { CATEGORY_COLORS } from '@/types/layout'
import { heightType, type Height3DType } from './heights3d'
import { elementAreaMeters } from './drawingMath'
import { CHAIR_NAME } from './seating'

// ── Normalizar textos ("Blanco", " blanco ", "BLANCO" → lo mismo) ─────────────
export function normKey(s: string | undefined | null): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// Forma a mostrar: la sugerencia de la org si es la misma palabra; si no,
// espacios limpios y la primera letra en mayúscula.
export function canon(s: string | undefined | null, suggestions: string[] = []): string {
  const k = normKey(s)
  if (!k) return ''
  const hit = suggestions.find(x => normKey(x) === k)
  if (hit) return hit
  const clean = (s ?? '').replace(/\s+/g, ' ').trim()
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

// ── Nombre de color a partir del hex (sugerencia; se puede escribir otro) ─────
const NAMED: [string, [number, number, number]][] = [
  ['Blanco', [248, 250, 252]], ['Negro', [17, 17, 17]], ['Gris', [148, 163, 184]], ['Plateado', [192, 192, 192]],
  ['Rojo', [220, 38, 38]], ['Vino', [128, 0, 32]], ['Rosado', [244, 114, 182]], ['Naranja', [249, 115, 22]],
  ['Amarillo', [250, 204, 21]], ['Dorado', [212, 175, 55]], ['Beige', [232, 220, 190]], ['Marrón', [120, 72, 40]],
  ['Verde', [34, 197, 94]], ['Verde oscuro', [22, 101, 52]], ['Celeste', [56, 189, 248]], ['Azul', [37, 99, 235]],
  ['Azul marino', [30, 41, 90]], ['Morado', [168, 85, 247]], ['Lila', [196, 181, 253]],
]
export function colorNameOf(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return ''
  const n = parseInt(m[1], 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  let best = NAMED[0][0], bd = Infinity
  for (const [name, c] of NAMED) {
    const d = (rgb[0] - c[0]) ** 2 * 0.3 + (rgb[1] - c[1]) ** 2 * 0.59 + (rgb[2] - c[2]) ** 2 * 0.11
    if (d < bd) { bd = d; best = name }
  }
  return best
}

const DEFAULT_CHAIR_COLOR = '#d97706'
const isDefaultColor = (e: LayoutElement) => {
  const c = e.color.toLowerCase()
  return c === CATEGORY_COLORS[e.category]?.toLowerCase() || c === DEFAULT_CHAIR_COLOR
}

// Nombre del color de una pieza para la lista: el escrito o el sugerido por
// el hex. Si nunca se cambió el color de fábrica, no cuenta como variante.
export function colorLabel(e: LayoutElement, suggestions: string[] = []): string {
  if (e.colorName?.trim()) return canon(e.colorName, suggestions)
  if (isDefaultColor(e)) return ''
  return colorNameOf(e.color)
}

// ── Líneas ──────────────────────────────────────────────────────────────────
export type MaterialKind = Height3DType | 'cloth'
export type MaterialUnit = 'u' | 'm2' | 'm'

export interface MaterialLine {
  key: string            // estable entre versiones (normalizado)
  kind: MaterialKind
  name: string           // nombre de la pieza (para "otras") o ''
  variant: string[]      // ["Tiffany", "Morado"], ["Ø 1.8 m"], ["Blanco", "Largo", "mesa Ø 1.8 m"]
  qty: number
  unit: MaterialUnit
  pieces: number         // cuántas piezas suman esa cantidad
}

export interface Vocab {
  chairTypes: string[]
  fabrics: string[]
  colorNames: string[]
}
export const EMPTY_VOCAB: Vocab = { chairTypes: [], fabrics: [], colorNames: [] }

const r2 = (n: number) => Math.round(n * 100) / 100
const tableSize = (e: LayoutElement) =>
  e.shape === 'circle' || e.shape === 'oval' ? `Ø ${r2(Math.max(e.width, e.height))} m` : `${r2(Math.max(e.width, e.height))} × ${r2(Math.min(e.width, e.height))} m`

// Lo que no es material: muros del local, marcas en el piso.
const SKIP: Height3DType[] = ['wall', 'floor']

export function materialLines(elements: LayoutElement[], vocab: Vocab = EMPTY_VOCAB): MaterialLine[] {
  const map = new Map<string, MaterialLine>()
  const add = (kind: MaterialKind, name: string, variant: string[], qty: number, unit: MaterialUnit) => {
    const v = variant.filter(Boolean)
    const key = [kind, normKey(name), ...v.map(normKey)].join('|')
    const cur = map.get(key)
    if (cur) { cur.qty = r2(cur.qty + qty); cur.pieces++ }
    else map.set(key, { key, kind, name, variant: v, qty: r2(qty), unit, pieces: 1 })
  }
  for (const e of elements) {
    const t = heightType(e)
    if (SKIP.includes(t)) continue
    if (t === 'chair') {
      add('chair', '', [canon(e.chairType, vocab.chairTypes), colorLabel(e, vocab.colorNames)], 1, 'u')
      continue
    }
    if (t === 'table') {
      add('table', '', [tableSize(e)], 1, 'u')
      // Mantel: solo si se eligió (color cambiado, nombre de color o tela).
      const color = colorLabel(e, vocab.colorNames)
      const fabric = canon(e.fabric, vocab.fabrics)
      if (color || fabric) add('cloth', '', [color, fabric, tableSize(e)], 1, 'u')
      continue
    }
    if (t === 'stage' || t === 'dance') {
      add(t, '', [], elementAreaMeters(e), 'm2')
      continue
    }
    if (t === 'bar') {
      add('bar', '', [], Math.max(e.width, e.height), 'm')
      continue
    }
    // El resto: por nombre y medida.
    const name = e.name === CHAIR_NAME ? '' : e.name.replace(/\s+/g, ' ').trim()
    add(t, name, [`${r2(e.width)} × ${r2(e.height)} m`], 1, 'u')
  }
  const order: MaterialKind[] = ['chair', 'table', 'cloth', 'stage', 'dance', 'bar', 'screen', 'tent', 'service', 'barrier', 'truss', 'vehicle', 'tree', 'other']
  return [...map.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name) || a.variant.join().localeCompare(b.variant.join()))
}

// ── Comparar con otra versión ───────────────────────────────────────────────
export interface MaterialDiff {
  key: string
  delta: number          // + suma, − resta (en la unidad de la línea)
  removed?: MaterialLine // estaba antes y ya no
}

export function diffLines(current: MaterialLine[], previous: MaterialLine[]): { byKey: Map<string, number>; removed: MaterialLine[] } {
  const prev = new Map(previous.map(l => [l.key, l]))
  const byKey = new Map<string, number>()
  for (const l of current) byKey.set(l.key, r2(l.qty - (prev.get(l.key)?.qty ?? 0)))
  const cur = new Set(current.map(l => l.key))
  const removed = previous.filter(l => !cur.has(l.key))
  return { byKey, removed }
}

// Origen guardado en el plano (meta.materials), "propio" por defecto.
export const originOf = (meta: Record<string, { origin: MaterialOrigin; note?: string }> | undefined, key: string) =>
  meta?.[key] ?? { origin: 'own' as MaterialOrigin }

// Valores de la lista de sugerencias: los de la org + los de este plano,
// sin repetir (normalizados).
export function mergeVocab(org: Vocab, elements: LayoutElement[]): Vocab {
  const uniq = (xs: (string | undefined)[]) => {
    const seen = new Map<string, string>()
    for (const x of xs) { const k = normKey(x); if (k && !seen.has(k)) seen.set(k, canon(x)) }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }
  return {
    chairTypes: uniq([...org.chairTypes, ...elements.map(e => e.chairType)]),
    fabrics: uniq([...org.fabrics, ...elements.map(e => e.fabric)]),
    colorNames: uniq([...org.colorNames, ...elements.map(e => e.colorName)]),
  }
}
