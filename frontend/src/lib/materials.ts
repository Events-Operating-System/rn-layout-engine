// Lista de materiales del plano (versión simple de L1, pedido de Javier
// 2026-11-01). Cuenta las piezas por tipo + variante (sillas Tiffany
// moradas, mesas redondas de Ø 1,8 m, manteles blancos largos) y en m² o
// metros lo que corresponde (tarimas, pista, barras). No toca Inventarios
// ni Ventas. Sin React.

import type { LayoutElement, MaterialLineMeta, MaterialOrigin } from '@/types/layout'
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
  ids: string[]          // las piezas de la línea (para elegirles el tipo)
  // Avisos: mesas sin mantel definido; sillas sin tipo o sin color.
  undefinedCloth?: boolean
  missingType?: boolean
  missingColor?: boolean
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
  // variant es posicional (un hueco vacío cuenta para la clave), así "solo
  // tipo" y "solo color" nunca se mezclan.
  const add = (id: string, kind: MaterialKind, name: string, variant: string[], qty: number, unit: MaterialUnit, flags: Partial<MaterialLine> = {}) => {
    const key = [kind, normKey(name), ...variant.map(normKey), flags.undefinedCloth ? '!sin-definir' : ''].join('|')
    const cur = map.get(key)
    if (cur) { cur.qty = r2(cur.qty + qty); cur.pieces++; cur.ids.push(id) }
    else map.set(key, { key, kind, name, variant: variant.filter(Boolean), qty: r2(qty), unit, pieces: 1, ids: [id], ...flags })
  }
  for (const e of elements) {
    const t = heightType(e)
    if (SKIP.includes(t)) continue
    if (t === 'chair') {
      const type = canon(e.chairType, vocab.chairTypes)
      const color = colorLabel(e, vocab.colorNames)
      add(e.id, 'chair', '', [type, color], 1, 'u', { missingType: !type, missingColor: !color })
      continue
    }
    if (t === 'table') {
      add(e.id, 'table', '', [tableSize(e)], 1, 'u')
      // Mantel: si se eligió (color cambiado, nombre de color o tela); si no,
      // cuenta como "sin definir" para avisar.
      const color = colorLabel(e, vocab.colorNames)
      const fabric = canon(e.fabric, vocab.fabrics)
      if (color || fabric) add(e.id, 'cloth', '', [color, fabric, tableSize(e)], 1, 'u')
      else add(e.id, 'cloth', '', [tableSize(e)], 1, 'u', { undefinedCloth: true })
      continue
    }
    if (t === 'stage' || t === 'dance') {
      add(e.id, t, '', [], elementAreaMeters(e), 'm2')
      continue
    }
    if (t === 'bar') {
      add(e.id, 'bar', '', [], Math.max(e.width, e.height), 'm')
      continue
    }
    // El resto: por nombre y medida.
    const name = e.name === CHAIR_NAME ? '' : e.name.replace(/\s+/g, ' ').trim()
    add(e.id, t, name, [`${r2(e.width)} × ${r2(e.height)} m`], 1, 'u')
  }
  const order: MaterialKind[] = ['chair', 'table', 'cloth', 'lounge', 'stage', 'dance', 'bar', 'screen', 'tent', 'service', 'barrier', 'truss', 'vehicle', 'tree', 'other']
  return [...map.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || Number(!!a.undefinedCloth) - Number(!!b.undefinedCloth) || a.name.localeCompare(b.name) || a.variant.join().localeCompare(b.variant.join()))
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
export const originOf = (meta: Record<string, MaterialLineMeta> | undefined, key: string): MaterialLineMeta =>
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

// ── Subtotal por tipo ───────────────────────────────────────────────────────
export interface Subtotal {
  kind: MaterialKind
  qty: number           // suma de las líneas definidas
  unit: MaterialUnit
  undefinedQty: number  // manteles sin definir
}

export function subtotals(lines: MaterialLine[]): Subtotal[] {
  const out: Subtotal[] = []
  for (const l of lines) {
    let s = out.find(x => x.kind === l.kind)
    if (!s) { s = { kind: l.kind, qty: 0, unit: l.unit, undefinedQty: 0 }; out.push(s) }
    if (l.undefinedCloth) s.undefinedQty = r2(s.undefinedQty + l.qty)
    else s.qty = r2(s.qty + l.qty)
  }
  return out
}

// ── Filtrar por origen / proveedor (para exportar) ──────────────────────────
export type MaterialFilter = { mode: 'all' } | { mode: 'own' } | { mode: 'third' } | { mode: 'provider'; key: string }

// Clave del proveedor de una línea de tercero: el del catálogo o el texto de
// la nota (normalizado); sin nada, "sin proveedor".
export function providerKey(m: MaterialLineMeta): string {
  if (m.providerId) return `id:${m.providerId}`
  const n = normKey(m.note)
  return n ? `note:${n}` : 'none'
}

export function filterLines(lines: MaterialLine[], meta: Record<string, MaterialLineMeta> | undefined, f: MaterialFilter): MaterialLine[] {
  if (f.mode === 'all') return lines
  return lines.filter(l => {
    const o = originOf(meta, l.key)
    if (f.mode === 'own') return o.origin === 'own'
    if (o.origin !== 'third') return false
    return f.mode === 'third' || providerKey(o) === f.key
  })
}

// Proveedores presentes en las líneas de tercero, con su nombre para el
// título del archivo.
export function providersIn(lines: MaterialLine[], meta: Record<string, MaterialLineMeta> | undefined, names: Record<string, string> = {}): { key: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const l of lines) {
    const o = originOf(meta, l.key)
    if (o.origin !== 'third') continue
    const k = providerKey(o)
    if (seen.has(k)) continue
    seen.set(k, o.providerId ? names[o.providerId] ?? o.note ?? '' : o.note?.trim() || '')
  }
  return [...seen.entries()].map(([key, name]) => ({ key, name }))
}

// ¿Hubo cambios contra la versión comparada?
export function hasChanges(current: MaterialLine[], previous: MaterialLine[]): boolean {
  const d = diffLines(current, previous)
  return d.removed.length > 0 || [...d.byKey.values()].some(v => v !== 0)
}

