import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutElement, CanvasViewport, AssetTemplate, DrawingPrimitive, DrawingTool, LayoutMeta } from '@/types/layout'
import { CATEGORY_COLORS, DEFAULT_LAYOUT_META } from '@/types/layout'

const PIXELS_PER_METER = 20  // must mirror LayoutCanvas.tsx constant

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 40, y: 40, scale: 1 })
  const [activeTool, setActiveTool] = useState<DrawingTool>('pointer')
  const [drawings, setDrawings] = useState<DrawingPrimitive[]>([])
  const [layoutMeta, setLayoutMeta] = useState<LayoutMeta>(DEFAULT_LAYOUT_META)

  // Ref tracks viewport without making addElement re-create on every pan/zoom
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id)
    setSelectedDrawingId(null)
  }, [])

  const selectDrawing = useCallback((id: string | null) => {
    setSelectedDrawingId(id)
    setSelectedId(null)
  }, [])

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    )
  }, [])

  const updateViewport = useCallback((updates: Partial<CanvasViewport>) => {
    setViewport(prev => ({ ...prev, ...updates }))
  }, [])

  const addElement = useCallback((template: AssetTemplate) => {
    const id = `el-${Date.now()}`
    setElements(prev => {
      const vp = viewportRef.current
      const n = prev.length
      // Spawn near visible viewport center, offset each new element diagonally
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
      }
      return [...prev, newEl]
    })
    setSelectedId(id)
    setSelectedDrawingId(null)
  }, [])

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedId(prev => (prev === id ? null : prev))
  }, [])

  const duplicateElement = useCallback((id: string) => {
    const newId = `el-${Date.now()}`
    setElements(prev => {
      const el = prev.find(e => e.id === id)
      if (!el) return prev
      return [...prev, { ...el, id: newId, x: el.x + 2, y: el.y + 2 }]
    })
    setSelectedId(newId)
    setSelectedDrawingId(null)
  }, [])

  const setTool = useCallback((tool: DrawingTool) => {
    setActiveTool(tool)
    if (tool !== 'pointer') setSelectedId(null)
  }, [])

  const addDrawing = useCallback((primitive: Omit<DrawingPrimitive, 'id'>) => {
    const id = `drw-${Date.now()}`
    setDrawings(prev => [...prev, { ...primitive, id }])
    setSelectedDrawingId(id)
    setSelectedId(null)
  }, [])

  const deleteDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id))
    setSelectedDrawingId(prev => (prev === id ? null : prev))
  }, [])

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

  const selectedElement = elements.find(el => el.id === selectedId) ?? null
  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) ?? null

  return {
    elements,
    selectedId,
    selectedElement,
    selectedDrawingId,
    selectedDrawing,
    viewport,
    selectElement,
    selectDrawing,
    updateElement,
    updateViewport,
    addElement,
    deleteElement,
    duplicateElement,
    activeTool,
    setTool,
    drawings,
    addDrawing,
    deleteDrawing,
    updateDrawing,
    clearDrawings,
    layoutMeta,
    updateMeta,
  }
}
