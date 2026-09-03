import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutElement, CanvasViewport, AssetTemplate, DrawingPrimitive, DrawingTool, LayoutMeta } from '@/types/layout'
import { CATEGORY_COLORS, DEFAULT_LAYOUT_META } from '@/types/layout'

const PIXELS_PER_METER = 20
const MAX_HISTORY = 50

type Snapshot = {
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
}

const INITIAL_ELEMENTS: LayoutElement[] = [
  {
    id: 'el-1',
    name: 'Main Stage',
    category: 'stage',
    x: 10, y: 10,
    width: 20, height: 12,
    rotation: 0,
    color: CATEGORY_COLORS.stage,
    locked: false,
    notes: 'Primary performance stage',
  },
  {
    id: 'el-2',
    name: 'Tent 20x20',
    category: 'structure',
    x: 38, y: 8,
    width: 20, height: 20,
    rotation: 0,
    color: CATEGORY_COLORS.structure,
    locked: false,
    notes: '',
  },
  {
    id: 'el-3',
    name: 'Tent 20x40',
    category: 'structure',
    x: 10, y: 30,
    width: 40, height: 20,
    rotation: 0,
    color: CATEGORY_COLORS.structure,
    locked: false,
    notes: '',
  },
  {
    id: 'el-4',
    name: 'Restroom Block',
    category: 'utility',
    x: 60, y: 8,
    width: 6, height: 3,
    rotation: 0,
    color: CATEGORY_COLORS.utility,
    locked: false,
    notes: '',
  },
  {
    id: 'el-5',
    name: 'Crowd Barrier',
    category: 'barrier',
    x: 10, y: 8,
    width: 20, height: 0.5,
    rotation: 0,
    color: CATEGORY_COLORS.barrier,
    locked: false,
    notes: 'Stage front barrier',
  },
  {
    id: 'el-6',
    name: 'Entrance Gate',
    category: 'circulation',
    x: 25, y: 56,
    width: 8, height: 1,
    rotation: 0,
    color: CATEGORY_COLORS.circulation,
    locked: false,
    notes: '',
  },
]

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
      }
      return [...prev, newEl]
    })
    setSelectedIds(new Set([id]))
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
      return [...prev, { ...el, id: newId, x: el.x + 2, y: el.y + 2 }]
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
    const duplicates = source.map((el, i) => ({
      ...el,
      id: `el-${timestamp}-${i}`,
      x: el.x + 2,
      y: el.y + 2,
    }))
    setElements(prev => [...prev, ...duplicates])
    setSelectedIds(new Set(duplicates.map(d => d.id)))
    setSelectedDrawingId(null)
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
    addPolygon,
    deleteElement,
    deleteElements,
    duplicateElement,
    duplicateElements,
    bringToFront,
    sendToBack,
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