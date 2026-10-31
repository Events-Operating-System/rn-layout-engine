// Alinear, distribuir y repetir en grilla (bloque 4). Funciones puras sobre
// la caja sin rotar de cada pieza (mismo criterio que el arrastre en grupo y
// "rotar grupo").
//
// Una mesa con sus sillas (o cualquier conjunto con el mismo groupId) es un
// solo BLOQUE: si se elige cualquier pieza del conjunto, entra el conjunto
// entero y se mueve junto, sin desarmarse. Un bloque con alguna pieza
// bloqueada no se mueve.

import type { LayoutElement } from '@/types/layout'

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
type Box = Pick<LayoutElement, 'id' | 'x' | 'y' | 'width' | 'height' | 'locked' | 'groupId'>
type Moves = Record<string, { x?: number; y?: number }>

interface Unit {
  members: Box[]
  x: number
  y: number
  width: number
  height: number
  locked: boolean
}

const r2 = (n: number) => Math.round(n * 100) / 100

// Bloques de la selección: cada conjunto (groupId) completo, aunque solo se
// haya elegido una de sus piezas, y cada pieza suelta por separado.
export function buildUnits(selected: Box[], all: Box[]): Unit[] {
  const groups = new Map<string, Box[]>()
  const singles: Box[] = []
  for (const e of selected) {
    if (e.groupId) groups.set(e.groupId, [])
    else singles.push(e)
  }
  for (const e of all) if (e.groupId && groups.has(e.groupId)) groups.get(e.groupId)!.push(e)
  const toUnit = (members: Box[]): Unit => {
    const minX = Math.min(...members.map(m => m.x))
    const minY = Math.min(...members.map(m => m.y))
    const maxX = Math.max(...members.map(m => m.x + m.width))
    const maxY = Math.max(...members.map(m => m.y + m.height))
    return { members, x: minX, y: minY, width: maxX - minX, height: maxY - minY, locked: members.some(m => m.locked) }
  }
  return [...[...groups.values()].filter(m => m.length).map(toUnit), ...singles.map(s => toUnit([s]))]
}

function moveUnit(out: Moves, u: Unit, dx: number, dy: number) {
  for (const m of u.members) {
    out[m.id] = {
      ...(dx !== 0 ? { x: r2(m.x + dx) } : {}),
      ...(dy !== 0 ? { y: r2(m.y + dy) } : {}),
    }
  }
}

export function alignUpdates(selected: Box[], all: Box[], mode: AlignMode): Moves {
  const units = buildUnits(selected, all).filter(u => !u.locked)
  if (units.length < 2) return {}
  const minX = Math.min(...units.map(u => u.x))
  const maxX = Math.max(...units.map(u => u.x + u.width))
  const minY = Math.min(...units.map(u => u.y))
  const maxY = Math.max(...units.map(u => u.y + u.height))
  const out: Moves = {}
  for (const u of units) {
    if (mode === 'left') moveUnit(out, u, minX - u.x, 0)
    else if (mode === 'right') moveUnit(out, u, maxX - u.width - u.x, 0)
    else if (mode === 'center') moveUnit(out, u, (minX + maxX) / 2 - u.width / 2 - u.x, 0)
    else if (mode === 'top') moveUnit(out, u, 0, minY - u.y)
    else if (mode === 'bottom') moveUnit(out, u, 0, maxY - u.height - u.y)
    else moveUnit(out, u, 0, (minY + maxY) / 2 - u.height / 2 - u.y)
  }
  return out
}

// Mismo espacio libre entre bloques consecutivos; el primero y el último no
// se mueven. Pide al menos 3 bloques.
export function distributeUpdates(selected: Box[], all: Box[], axis: 'horizontal' | 'vertical'): Moves {
  const units = buildUnits(selected, all).filter(u => !u.locked)
  if (units.length < 3) return {}
  const pos = (u: Unit) => (axis === 'horizontal' ? u.x : u.y)
  const size = (u: Unit) => (axis === 'horizontal' ? u.width : u.height)
  const sorted = [...units].sort((a, b) => pos(a) + size(a) / 2 - (pos(b) + size(b) / 2))
  const first = sorted[0], last = sorted[sorted.length - 1]
  const span = pos(last) + size(last) - pos(first)
  const total = sorted.reduce((s, u) => s + size(u), 0)
  const gap = (span - total) / (sorted.length - 1)
  const out: Moves = {}
  let cursor = pos(first)
  for (const u of sorted) {
    const d = cursor - pos(u)
    moveUnit(out, u, axis === 'horizontal' ? d : 0, axis === 'vertical' ? d : 0)
    cursor += size(u) + gap
  }
  return out
}

export const MAX_GRID_COPIES = 400

// Copias de la selección (con sus conjuntos completos) en filas × columnas.
// Lo original queda en la celda (0,0); el paso es el tamaño de todo lo
// elegido + la separación. Cada copia de un conjunto recibe su propio groupId.
export function gridCopies(
  selected: LayoutElement[],
  all: LayoutElement[],
  rows: number,
  cols: number,
  gap: number,
  makeId: (i: number) => string,
  makeGroupId: (i: number) => string,
): { originals: LayoutElement[]; copies: LayoutElement[] } {
  const groupIds = new Set(selected.map(e => e.groupId).filter(Boolean) as string[])
  const originals = all.filter(e => (e.groupId && groupIds.has(e.groupId)) || (!e.groupId && selected.some(s => s.id === e.id)))
  if (!originals.length || rows < 1 || cols < 1 || rows * cols - 1 > MAX_GRID_COPIES) return { originals, copies: [] }
  const minX = Math.min(...originals.map(e => e.x))
  const maxX = Math.max(...originals.map(e => e.x + e.width))
  const minY = Math.min(...originals.map(e => e.y))
  const maxY = Math.max(...originals.map(e => e.y + e.height))
  const stepX = maxX - minX + gap
  const stepY = maxY - minY + gap
  const copies: LayoutElement[] = []
  let k = 0, g = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue
      const newGroup = new Map<string, string>()
      for (const e of originals) {
        let groupId: string | undefined
        if (e.groupId) {
          if (!newGroup.has(e.groupId)) newGroup.set(e.groupId, makeGroupId(g++))
          groupId = newGroup.get(e.groupId)
        }
        copies.push({ ...e, id: makeId(k++), x: r2(e.x + c * stepX), y: r2(e.y + r * stepY), locked: false, ...(groupId ? { groupId } : {}) })
      }
    }
  }
  return { originals, copies }
}
