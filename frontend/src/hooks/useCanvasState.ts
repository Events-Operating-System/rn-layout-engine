import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutElement, CanvasViewport, AssetTemplate, DrawingPrimitive, DrawingTool, LayoutMeta, GroupChild } from '@/types/layout'
import { CATEGORY_COLORS, DEFAULT_LAYOUT_META } from '@/types/layout'
import { alignUpdates, distributeUpdates, gridCopies, type AlignMode } from '@/lib/arrange'
import { ungroupIds, detectTableChairGroups, groupIdsForCopy } from '@/lib/grouping'
import { instantiateTemplate, type TemplatePayload } from '@/lib/templates'
import { layerForNewPiece } from '@/lib/layers'
import type { NewPath } from '@/lib/curves'

const PIXELS_PER_METER = 20
const MAX_HISTORY = 50

type Snapshot = {
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
}

// Plano nuevo en blanco (decisión 2026-10-31: antes traía 6 piezas de demo
// que había que borrar en cada plano). Los planos guardados cargan lo suyo.
const INITIAL_ELEMENTS: LayoutElement[] = []

export function useCanvasState() {
  const [elements, setElements] = useState<LayoutElement[]>(INITIAL_ELEMENTS)
  // Canonical multi-select state (base for the next batch's bulk actions).
  // `selectedId` below is derived from it — single-selection call sites
  // (Properties panel, Transformer, duplicate, delete-key) keep working
  // unchanged because it's only non-null when exactly one id is selected.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 40, y: 40, scale: 1 })
  const [activeTool, setActiveTool] = useState<DrawingTool>('pointer')
  // Measure tool sub-mode — explicit, never inferred from click count/timing
  // (see LayoutCanvas: Distancia never hit-tests elements, Área only does).
  const [measureMode, setMeasureMode] = useState<'distance' | 'area'>('distance')
  const [drawings, setDrawings] = useState<DrawingPrimitive[]>([])
  const [layoutMeta, setLayoutMeta] = useState<LayoutMeta>(DEFAULT_LAYOUT_META)

  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] })
  const elementsRef = useRef<LayoutElement[]>(INITIAL_ELEMENTS)
  const drawingsRef = useRef<DrawingPrimitive[]>([])
  const [undoSize, setUndoSize] = useState(0)
  const [redoSize, setRedoSize] = useState(0)

  useEffect(() => { elementsRef.current = elements }, [elements])
  useEffect(() => { drawingsRef.current = drawings }, [drawings])

  const pushHistory = useCallback(() => {
    const h = historyRef.current
    if (h.past.length >= MAX_HISTORY) h.past.shift()
    h.past.push({ elements: elementsRef.current, drawings: drawingsRef.current })
    h.future = []
    setUndoSize(h.past.length)
    setRedoSize(0)
  }, [])

  const undo = useCallback(() => {
    const h = historyRef.current
    if (h.past.length === 0) return
    const snapshot = h.past.pop()!
    h.future.push({ elements: elementsRef.current, drawings: drawingsRef.current })
    elementsRef.current = snapshot.elements
    drawingsRef.current = snapshot.drawings
    setElements(snapshot.elements)
    setDrawings(snapshot.drawings)
    setSelectedIds(new Set())
    setSelectedDrawingId(null)
    setUndoSize(h.past.length)
    setRedoSize(h.future.length)
  }, [])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (h.future.length === 0) return
    const snapshot = h.future.pop()!
    h.past.push({ elements: elementsRef.current, drawings: drawingsRef.current })
    elementsRef.current = snapshot.elements
    drawingsRef.current = snapshot.drawings
    setElements(snapshot.elements)
    setDrawings(snapshot.drawings)
    setSelectedIds(new Set())
    setSelectedDrawingId(null)
    setUndoSize(h.past.length)
    setRedoSize(h.future.length)
  }, [])

  // Replace the whole selection with a single element (or clear it if null).
  // Existing call sites (click-to-select, stage-background deselect, etc.)
  // keep their exact previous behavior.
  const selectElement = useCallback((id: string | null) => {
    setSelectedIds(id ? new Set([id]) : new Set())
    setSelectedDrawingId(null)
  }, [])

  // Shift+click — add/remove one element from the current selection.
  const toggleSelectElement = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSelectedDrawingId(null)
  }, [])

  // Marquee-select result — replaces the whole selection with the given ids.
  const selectElements = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
    setSelectedDrawingId(null)
  }, [])

  const selectDrawing = useCallback((id: string | null) => {
    setSelectedDrawingId(id)
    setSelectedIds(new Set())
  }, [])

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev => prev.map(el => (el.id === id ? { ...el, ...updates } : el)))
  }, [])

  // Bulk position commit for group-drag (multi-select). Caller is
  // responsible for calling pushHistory() once beforehand — same
  // convention as updateElement, just applied to several ids in one
  // setElements pass so it's a single state transition.
  const updateElements = useCallback((updates: Record<string, Partial<LayoutElement>>) => {
    setElements(prev => prev.map(el => (updates[el.id] ? { ...el, ...updates[el.id] } : el)))
  }, [])

  const updateViewport = useCallback((updates: Partial<CanvasViewport>) => {
    setViewport(prev => ({ ...prev, ...updates }))
  }, [])

  const addElement = useCallback((template: AssetTemplate) => {
    pushHistory()
    const id = `el-${Date.now()}`
    setElements(prev => {
      const vp = viewportRef.current
      const n = prev.length
      const offset = (n % 5) * 2
      const centerX = (-vp.x + 600) / (vp.scale * PIXELS_PER_METER)
      const centerY = (-vp.y + 400) / (vp.scale * PIXELS_PER_METER)
      const spawnX = Math.min(100, Math.max(0, Math.round((centerX + offset) * 2) / 2))
      const spawnY = Math.min(100, Math.max(0, Math.round((centerY + offset) * 2) / 2))
      const newEl: LayoutElement = {
        id,
        name: template.name,
        category: template.category,
        x: spawnX,
        y: spawnY,
        width: template.defaultWidth,
        height: template.defaultHeight,
        rotation: 0,
        color: template.defaultColor ?? CATEGORY_COLORS[template.category],
        locked: false,
        notes: '',
        shape: template.shape,
        // Restored for custom polygon assets (see AssetTemplate.points);
        // undefined for every built-in template.
        ...(template.shape === 'polygon' && template.points ? { points: template.points } : {}),
        ...(template.segments ? { segments: template.segments } : {}),
        ...(template.seats ? { seats: template.seats } : {}),
        ...(layerForNewPiece(template.name) ? { layer: layerForNewPiece(template.name) } : {}),
      }
      return [...prev, newEl]
    })
    setSelectedIds(new Set([id]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // Placing a composite ('group') custom asset: expand its children into N
  // fresh independent elements in one setElements pass (single undo entry,
  // same convention as duplicateElements), then select them all so the
  // existing group-drag moves them together right away. No persistent
  // "group" concept — once placed they're ordinary elements. `children`
  // dx/dy are meters from the group's origin; spawn the origin at the same
  // viewport-centre point addElement uses.
  const addGroup = useCallback((children: GroupChild[]) => {
    pushHistory()
    const ts = Date.now()
    const ids = children.map((_, i) => `el-${ts}-${i}`)
    // Todas las piezas del conjunto comparten groupId (mesa + sillas).
    const groupId = children.length > 1 ? `grp-${ts}` : undefined
    setElements(prev => {
      const vp = viewportRef.current
      const n = prev.length
      const offset = (n % 5) * 2
      const centerX = (-vp.x + 600) / (vp.scale * PIXELS_PER_METER)
      const centerY = (-vp.y + 400) / (vp.scale * PIXELS_PER_METER)
      const originX = Math.min(100, Math.max(0, Math.round((centerX + offset) * 2) / 2))
      const originY = Math.min(100, Math.max(0, Math.round((centerY + offset) * 2) / 2))
      const newEls: LayoutElement[] = children.map((c, i) => ({
        id: ids[i],
        name: c.name,
        category: c.category,
        x: originX + c.dx,
        y: originY + c.dy,
        width: c.width,
        height: c.height,
        rotation: c.rotation ?? 0,
        color: c.color,
        locked: false,
        notes: c.notes ?? '',
        shape: c.shape,
        ...(c.opacity !== undefined ? { opacity: c.opacity } : {}),
        ...(c.flipX ? { flipX: true } : {}),
        ...(c.flipY ? { flipY: true } : {}),
        ...((c.shape === 'polygon' || c.shape === 'wall' || c.shape === 'path') && c.points ? { points: c.points } : {}),
        ...(c.segments ? { segments: c.segments } : {}),
        ...(c.closed !== undefined ? { closed: c.closed } : {}),
        ...(c.thickness ? { thickness: c.thickness } : {}),
        ...(c.seats ? { seats: c.seats } : {}),
        ...((c.layer ?? layerForNewPiece(c.name)) ? { layer: c.layer ?? layerForNewPiece(c.name) } : {}),
        ...(groupId ? { groupId } : {}),
      }))
      return [...prev, ...newEls]
    })
    setSelectedIds(new Set(ids))
    setSelectedDrawingId(null)
  }, [pushHistory])

  const deleteElement = useCallback((id: string) => {
    pushHistory()
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [pushHistory])

  // Bulk delete (multi-select) — one history entry restores all of them.
  const deleteElements = useCallback((ids: string[]) => {
    pushHistory()
    const idSet = new Set(ids)
    setElements(prev => prev.filter(el => !idSet.has(el.id)))
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [pushHistory])

  const duplicateElement = useCallback((id: string) => {
    pushHistory()
    const newId = `el-${Date.now()}`
    setElements(prev => {
      const el = prev.find(e => e.id === id)
      if (!el) return prev
      // Una pieza sola copiada queda suelta (no entra al conjunto original).
      const { groupId: _g, ...rest } = el
      void _g
      return [...prev, { ...rest, id: newId, x: el.x + 2, y: el.y + 2 }]
    })
    setSelectedIds(new Set([newId]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // Bulk duplicate (multi-select) — copies the whole group, preserving
  // relative layout (same +2/+2m offset as the single-element case), and
  // selects the new copies so they can be moved immediately.
  const duplicateElements = useCallback((ids: string[]) => {
    pushHistory()
    const idSet = new Set(ids)
    const timestamp = Date.now()
    const source = elementsRef.current.filter(el => idSet.has(el.id))
    const groups = groupIdsForCopy(source, elementsRef.current, i => `grp-${timestamp}-d${i}`)
    const duplicates = source.map((el, i) => {
      const { groupId: _g, ...rest } = el
      void _g
      const groupId = groups.get(el.id)
      return { ...rest, id: `el-${timestamp}-${i}`, x: el.x + 2, y: el.y + 2, ...(groupId ? { groupId } : {}) }
    })
    setElements(prev => [...prev, ...duplicates])
    setSelectedIds(new Set(duplicates.map(d => d.id)))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // ── Alinear / distribuir / repetir en grilla (bloque 4) ─────────────────
  // Una sola entrada de deshacer por operación.
  const applyMoves = useCallback((updates: Record<string, { x?: number; y?: number }>) => {
    if (Object.keys(updates).length === 0) return
    pushHistory()
    setElements(prev => prev.map(el => (updates[el.id] ? { ...el, ...updates[el.id] } : el)))
  }, [pushHistory])

  const alignElements = useCallback((ids: string[], mode: AlignMode) => {
    const idSet = new Set(ids)
    applyMoves(alignUpdates(elementsRef.current.filter(el => idSet.has(el.id)), elementsRef.current, mode))
  }, [applyMoves])

  const distributeElements = useCallback((ids: string[], axis: 'horizontal' | 'vertical') => {
    const idSet = new Set(ids)
    applyMoves(distributeUpdates(elementsRef.current.filter(el => idSet.has(el.id)), elementsRef.current, axis))
  }, [applyMoves])

  // Copias de la selección en filas × columnas; queda seleccionado todo
  // (original + copias) para poder moverlo junto.
  const repeatInGrid = useCallback((ids: string[], rows: number, cols: number, gap: number) => {
    const idSet = new Set(ids)
    const source = elementsRef.current.filter(el => idSet.has(el.id))
    const ts = Date.now()
    const { originals, copies } = gridCopies(source, elementsRef.current, rows, cols, gap, i => `el-${ts}-g${i}`, i => `grp-${ts}-${i}`)
    if (!copies.length) return
    pushHistory()
    setElements(prev => [...prev, ...copies])
    setSelectedIds(new Set([...originals.map(o => o.id), ...copies.map(c => c.id)]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // Plantilla de la org: agrega sus piezas y dibujos (ids nuevos, mismas
  // posiciones) a lo que ya hay. Una sola entrada de deshacer.
  const addTemplate = useCallback((payload: TemplatePayload | null | undefined) => {
    const ts = Date.now()
    const { elements: els, drawings: drws } = instantiateTemplate(payload, i => `el-${ts}-t${i}`, i => `grp-${ts}-t${i}`)
    if (!els.length && !drws.length) return 0
    pushHistory()
    setElements(prev => [...prev, ...els])
    setDrawings(prev => [...prev, ...drws])
    setSelectedIds(new Set(els.map(e => e.id)))
    setSelectedDrawingId(null)
    return els.length + drws.length
  }, [pushHistory])

  // Desagrupar: el conjunto entero de cada pieza elegida queda suelto.
  const ungroupElements = useCallback((ids: string[]) => {
    const target = new Set(ungroupIds(ids, elementsRef.current))
    if (!target.size) return
    pushHistory()
    setElements(prev => prev.map(el => {
      if (!target.has(el.id)) return el
      const { groupId: _drop, ...rest } = el
      void _drop
      return rest
    }))
  }, [pushHistory])

  // Planos viejos: agrupa cada mesa suelta con las sillas sueltas que tiene
  // alrededor. Una sola entrada de deshacer; devuelve cuántas encontró.
  const groupTablesWithChairs = useCallback((s: { chairGap: number; chairSize: number }) => {
    const ts = Date.now()
    const r = detectTableChairGroups(elementsRef.current, s, i => `grp-${ts}-a${i}`)
    if (r.tables > 0) {
      pushHistory()
      setElements(prev => prev.map(el => (r.assign[el.id] ? { ...el, groupId: r.assign[el.id] } : el)))
    }
    return { tables: r.tables, chairs: r.chairs }
  }, [pushHistory])

  // Z-order — render/stacking order is simply the `elements` array order
  // (later = drawn later = visually on top), in both the Konva Layer and
  // the PDF export loop, so reordering the array is the whole mechanism;
  // it persists automatically since `elements` is saved as-is. For a
  // multi-element selection, the whole group moves to the front/back
  // together while keeping its own internal relative order.
  const bringToFront = useCallback((ids: string[]) => {
    pushHistory()
    const idSet = new Set(ids)
    setElements(prev => {
      const rest = prev.filter(el => !idSet.has(el.id))
      const selected = prev.filter(el => idSet.has(el.id))
      return [...rest, ...selected]
    })
  }, [pushHistory])

  const sendToBack = useCallback((ids: string[]) => {
    pushHistory()
    const idSet = new Set(ids)
    setElements(prev => {
      const rest = prev.filter(el => !idSet.has(el.id))
      const selected = prev.filter(el => idSet.has(el.id))
      return [...selected, ...rest]
    })
  }, [pushHistory])

  // Rotate a multi-selection as a rigid group by `deltaDeg` degrees around
  // the centre of its combined axis-aligned bounding box (same plain
  // min/max bbox the rest of the code uses — individual element rotation
  // is not factored into the box). Each element's top-left (x,y) — the
  // system-wide rotation pivot — orbits that centre, AND `deltaDeg` is
  // added to the element's own rotation so it also turns on itself, not
  // just orbits. Locked elements are excluded entirely — neither from the
  // bbox/pivot nor rotated — same rule as the group-drag in LayoutCanvas
  // (not the z-order buttons, which do touch locked elements). One history
  // entry, selection unchanged. Custom offset math, same approach as the
  // group-drag — the Transformer is not involved.
  const rotateElements = useCallback((ids: string[], deltaDeg: number) => {
    if (!deltaDeg) return
    const idSet = new Set(ids)
    const sel = elementsRef.current.filter(el => idSet.has(el.id) && !el.locked)
    if (sel.length < 2) return
    const rotSet = new Set(sel.map(el => el.id))
    const minX = Math.min(...sel.map(e => e.x))
    const minY = Math.min(...sel.map(e => e.y))
    const maxX = Math.max(...sel.map(e => e.x + e.width))
    const maxY = Math.max(...sel.map(e => e.y + e.height))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const rad = (deltaDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    pushHistory()
    setElements(prev => prev.map(el => {
      if (!rotSet.has(el.id)) return el
      const relX = el.x - cx
      const relY = el.y - cy
      return {
        ...el,
        // [cos -sin; sin cos] in the y-down canvas coords => positive
        // deltaDeg rotates clockwise on screen, matching Konva's rotation.
        x: Math.round((cx + relX * cos - relY * sin) * 10) / 10,
        y: Math.round((cy + relX * sin + relY * cos) * 10) / 10,
        rotation: Math.round((((el.rotation + deltaDeg) % 360) + 360) % 360),
      }
    }))
  }, [pushHistory])

  const setTool = useCallback((tool: DrawingTool) => {
    setActiveTool(tool)
    // Hand is a viewport-navigation aid, not an editing tool — switching to
    // it (or back) preserves whatever was selected, matching Figma.
    if (tool !== 'pointer' && tool !== 'hand') setSelectedIds(new Set())
    // Activating Measure always resets its sub-mode to Distancia — the
    // user picks Área explicitly each time, it's never remembered/inferred.
    if (tool === 'measure') setMeasureMode('distance')
  }, [])

  // Free-form polygon tool (batch: polygon + measurement). `points` are
  // already computed relative to (x,y) in meters — see LayoutElement.points
  // — so this is a straight append, same shape as addDrawing.
  const addPolygon = useCallback((polygon: { x: number; y: number; width: number; height: number; points: number[] }) => {
    pushHistory()
    const id = `el-${Date.now()}`
    const newEl: LayoutElement = {
      id,
      name: 'Polígono',
      category: 'primitive',
      x: polygon.x,
      y: polygon.y,
      width: polygon.width,
      height: polygon.height,
      rotation: 0,
      color: CATEGORY_COLORS.primitive,
      locked: false,
      notes: '',
      shape: 'polygon',
      points: polygon.points,
    }
    setElements(prev => [...prev, newEl])
    setSelectedIds(new Set([id]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // Muro / perímetro del local (bloque 5). Grosor por defecto = el de la org.
  const addWall = useCallback((wall: { x: number; y: number; width: number; height: number; points: number[]; closed: boolean }, thickness: number) => {
    pushHistory()
    const id = `el-${Date.now()}`
    const newEl: LayoutElement = {
      id,
      name: wall.closed ? 'Perimeter' : 'Wall',
      category: 'structure',
      // Al centímetro, como el resto de las medidas que se escriben a mano.
      x: Math.round(wall.x * 100) / 100,
      y: Math.round(wall.y * 100) / 100,
      width: Math.round(wall.width * 100) / 100 || 0.01,
      height: Math.round(wall.height * 100) / 100 || 0.01,
      rotation: 0,
      color: '#cbd5e1',
      opacity: 1,
      locked: false,
      notes: '',
      shape: 'wall',
      points: wall.points,
      closed: wall.closed,
      thickness,
    }
    setElements(prev => [...prev, newEl])
    setSelectedIds(new Set([id]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  // Arco o curva libre (bloque 7). Abierta: trazo de 10 cm; cerrada: con
  // relleno, como un polígono.
  const addPath = useCallback((p: NewPath) => {
    pushHistory()
    const id = `el-${Date.now()}`
    const newEl: LayoutElement = {
      id,
      name: p.kind === 'arc' ? 'Arc' : 'Curve',
      category: 'primitive',
      x: p.x, y: p.y, width: p.width, height: p.height,
      rotation: 0,
      color: p.closed ? CATEGORY_COLORS.primitive : '#e2e8f0',
      locked: false,
      notes: '',
      shape: 'path',
      points: p.points,
      ...(p.segments ? { segments: p.segments } : {}),
      closed: p.closed,
      ...(p.closed ? {} : { thickness: 0.1, opacity: 1 }),
    }
    setElements(prev => [...prev, newEl])
    setSelectedIds(new Set([id]))
    setSelectedDrawingId(null)
  }, [pushHistory])

  const addDrawing = useCallback((primitive: Omit<DrawingPrimitive, 'id'>) => {
    pushHistory()
    const id = `drw-${Date.now()}`
    setDrawings(prev => [...prev, { ...primitive, id }])
    setSelectedDrawingId(id)
    setSelectedIds(new Set())
  }, [pushHistory])

  const deleteDrawing = useCallback((id: string) => {
    pushHistory()
    setDrawings(prev => prev.filter(d => d.id !== id))
    setSelectedDrawingId(prev => (prev === id ? null : prev))
  }, [pushHistory])

  const updateDrawing = useCallback((id: string, updates: Partial<DrawingPrimitive>) => {
    setDrawings(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)))
  }, [])

  const clearDrawings = useCallback(() => {
    setDrawings([])
    setSelectedDrawingId(null)
  }, [])

  const updateMeta = useCallback((updates: Partial<LayoutMeta>) => {
    setLayoutMeta(prev => ({ ...prev, ...updates }))
  }, [])

  // Non-null only when exactly one element is selected — every single-
  // selection consumer (Properties panel, Transformer, Ctrl+D, Delete key)
  // reads this and is unaffected by multi-select.
  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null
  const selectedElement = elements.find(el => el.id === selectedId) ?? null
  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) ?? null

  return {
    elements,
    selectedId,
    selectedIds,
    selectedElement,
    selectedDrawingId,
    selectedDrawing,
    viewport,
    selectElement,
    toggleSelectElement,
    selectElements,
    selectDrawing,
    updateElement,
    updateElements,
    updateViewport,
    addElement,
    addGroup,
    addPolygon,
    addWall,
    addPath,
    deleteElement,
    deleteElements,
    duplicateElement,
    duplicateElements,
    bringToFront,
    sendToBack,
    rotateElements,
    alignElements,
    distributeElements,
    repeatInGrid,
    ungroupElements,
    groupTablesWithChairs,
    addTemplate,
    activeTool,
    setTool,
    measureMode,
    setMeasureMode,
    drawings,
    addDrawing,
    deleteDrawing,
    updateDrawing,
    clearDrawings,
    layoutMeta,
    updateMeta,
    pushHistory,
    undo,
    redo,
    canUndo: undoSize > 0,
    canRedo: redoSize > 0,
    setElements,
    setDrawings,
    setViewport,
    setLayoutMeta,
  }
}