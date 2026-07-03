import { useRef, useState, useEffect, useCallback } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useCustomAssets } from '@/hooks/useCustomAssets'
import { supabase } from '@/lib/supabase'
import { layoutService } from '@/lib/layoutService'
import type { AssetTemplate } from '@/types/layout'

interface Props {
  layoutIdToLoad?: string | null
  eventId?: string | null
  onLayoutForked?: (newId: string) => void
}

export default function LayoutEditor({ layoutIdToLoad, eventId, onLayoutForked }: Props) {
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [duplicating, setDuplicating] = useState(false)
  const [savingAsCopy, setSavingAsCopy] = useState(false)
  const [inputName, setInputName] = useState('Sin título')

  const {
    elements, selectedId, selectedIds, selectedElement,
    selectedDrawingId, selectedDrawing,
    viewport, selectElement, toggleSelectElement, selectElements, selectDrawing,
    updateElement, updateElements, updateViewport, addElement, addPolygon,
    deleteElement, deleteElements, duplicateElement, duplicateElements,
    bringToFront, sendToBack, activeTool, setTool,
    drawings, addDrawing, deleteDrawing, updateDrawing,
    clearDrawings, layoutMeta, updateMeta,
    pushHistory, undo, redo, canUndo, canRedo,
    setElements, setDrawings, setViewport, setLayoutMeta,
  } = useCanvasState()

  // Holding Space temporarily switches to Hand mode without touching the
  // persisted activeTool — releasing it reverts automatically (Figma pattern).
  const [spaceHeld, setSpaceHeld] = useState(false)
  const effectiveTool = spaceHeld ? 'hand' : activeTool

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const persistence = useLayoutPersistence(userId, eventId)
  const { save, load, layoutId } = persistence

  const { assets: customAssets, createAsset, deleteAsset } = useCustomAssets(userId)

  useEffect(() => {
    if (!layoutIdToLoad || !userId) return
    load(layoutIdToLoad).then(data => {
      if (data.elements) setElements(data.elements)
      if (data.drawings) setDrawings(data.drawings)
      if (data.viewport) setViewport(data.viewport)
      if (data.meta) {
        setLayoutMeta(data.meta)
        if (data.meta.cliente) setInputName(data.meta.cliente)
      }
    })
  }, [layoutIdToLoad, userId])

  useEffect(() => {
    if (layoutMeta.cliente !== undefined && layoutMeta.cliente !== inputName) {
      setInputName(layoutMeta.cliente)
    }
  }, [layoutMeta.cliente])

  const elementsRef = useRef(elements)
  const drawingsRef = useRef(drawings)
  const viewportRef = useRef(viewport)
  const layoutMetaRef = useRef(layoutMeta)
  const inputNameRef = useRef(inputName)

  elementsRef.current = elements
  drawingsRef.current = drawings
  viewportRef.current = viewport
  layoutMetaRef.current = layoutMeta
  inputNameRef.current = inputName

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaveStatus('saving')
    const currentName = inputNameRef.current
    const currentMeta = { ...layoutMetaRef.current, cliente: currentName }
    await save(
      {
        elements: elementsRef.current,
        drawings: drawingsRef.current,
        meta: currentMeta,
        viewport: viewportRef.current,
      },
      currentName
    )
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, save])

  // "Duplicar" — forks the layout's last SAVED content (re-reads from DB,
  // ignores any unsaved edits currently on the canvas). Original untouched.
  const handleDuplicate = useCallback(async () => {
    if (!layoutId) return
    setDuplicating(true)
    try {
      const original = await layoutService.getForDuplicate(layoutId)
      const newName = `${original.name} (copia)`
      const newId = await layoutService.duplicate(
        original.org_id,
        newName,
        {
          elements: original.elements,
          drawings: original.drawings,
          meta: { ...original.meta, cliente: newName },
          viewport: original.viewport,
        },
        layoutId
      )
      onLayoutForked?.(newId)
    } finally {
      setDuplicating(false)
    }
  }, [layoutId, onLayoutForked])

  // "Guardar como copia" — forks the CURRENT canvas state (including
  // unsaved changes), as a new independent row. Original untouched.
  const handleSaveAsCopy = useCallback(async () => {
    if (!userId) return
    setSavingAsCopy(true)
    try {
      const currentName = inputNameRef.current
      const newName = `${currentName} (copia)`
      const newId = await layoutService.duplicate(
        userId,
        newName,
        {
          elements: elementsRef.current,
          drawings: drawingsRef.current,
          meta: { ...layoutMetaRef.current, cliente: newName },
          viewport: viewportRef.current,
        },
        layoutId
      )
      onLayoutForked?.(newId)
    } finally {
      setSavingAsCopy(false)
    }
  }, [userId, layoutId, onLayoutForked])

  const handleSaveAsAsset = useCallback(async (element: typeof selectedElement) => {
    if (!element) return
    await createAsset({
      name: element.name,
      category: element.category,
      default_width: element.width,
      default_height: element.height,
      default_color: element.color,
      shape: element.shape,
    })
  }, [createAsset])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); redo(); return }
        if (e.key === 'z') { e.preventDefault(); undo(); return }
        if (e.key === 'y') { e.preventDefault(); redo(); return }
        if (e.key === 'd') {
          e.preventDefault()
          if (selectedIds.size > 1) duplicateElements([...selectedIds])
          else if (selectedId) duplicateElement(selectedId)
          return
        }
        if (e.key === 's') { e.preventDefault(); handleSave(); return }
        return
      }
      if (e.key === 's') setTool('pointer')
      else if (e.key === 'h') setTool('hand')
      else if (e.key === 'l') setTool('line')
      else if (e.key === 'a') setTool('arrow')
      else if (e.key === 't') setTool('text')
      else if (e.key === 'p') setTool('polygon')
      else if (e.key === 'm') setTool('measure')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, duplicateElement, duplicateElements, setTool, undo, redo, handleSave])

  function toggleMobilePanel(panel: 'library' | 'properties') {
    setMobilePanel(prev => (prev === panel ? null : panel))
  }

  function handleAddElement(template: AssetTemplate) {
    addElement(template)
    setMobilePanel(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DrawingToolbar
        activeTool={activeTool}
        effectiveTool={effectiveTool}
        onSetTool={setTool}
        onClearDrawings={clearDrawings}
        onExport={() => canvasRef.current?.exportPNG()}
        onExportPDF={() => canvasRef.current?.exportPDF()}
        onToggleLibrary={() => toggleMobilePanel('library')}
        onToggleProperties={() => toggleMobilePanel('properties')}
        libraryOpen={mobilePanel === 'library'}
        propertiesOpen={mobilePanel === 'properties'}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-3">
        <input
          value={inputName}
          onChange={e => {
            setInputName(e.target.value)
            updateMeta({ cliente: e.target.value })
          }}
          className="bg-slate-800 text-sm text-slate-100 font-medium outline-none border border-slate-600 focus:border-indigo-500 rounded px-3 py-1 w-64 placeholder:text-slate-500 transition-colors"
          placeholder="Nombre del cliente / evento"
        />
        <div className="flex-1" />
        {saveStatus === 'saving' && <span className="text-[10px] text-indigo-400 animate-pulse">Guardando...</span>}
        {saveStatus === 'saved' && <span className="text-[10px] text-green-500">✓ Guardado</span>}
        <button
          onClick={handleSaveAsCopy}
          disabled={!userId || savingAsCopy}
          title="Crea una copia independiente a partir del estado actual del canvas — el original no se modifica"
          className="h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {savingAsCopy ? 'Guardando copia...' : 'Guardar como copia'}
        </button>
        <button
          onClick={handleDuplicate}
          disabled={!layoutId || duplicating}
          title={layoutId ? 'Duplica el layout (última versión guardada)' : 'Guarda el layout antes de duplicarlo'}
          className="h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {duplicating ? 'Duplicando...' : 'Duplicar'}
        </button>
        <button
          onClick={handleSave}
          disabled={!userId || saveStatus === 'saving'}
          className="h-7 px-4 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          Guardar
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={
          mobilePanel === 'library'
            ? 'absolute inset-y-0 left-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none'
            : 'hidden md:flex md:flex-none'
        }>
          <AssetLibraryPanel
            onAddElement={handleAddElement}
            customAssets={customAssets}
            selectedElement={selectedElement}
            onSaveAsAsset={handleSaveAsAsset}
            onDeleteAsset={deleteAsset}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <LayoutCanvas
            ref={canvasRef}
            elements={elements}
            selectedId={selectedId}
            selectedIds={selectedIds}
            viewport={viewport}
            onSelect={selectElement}
            onToggleSelect={toggleSelectElement}
            onSelectMultiple={selectElements}
            onUpdateElement={updateElement}
            onUpdateElements={updateElements}
            onUpdateViewport={updateViewport}
            onAddPolygon={addPolygon}
            onDeleteElement={deleteElement}
            onDeleteElements={deleteElements}
            activeTool={effectiveTool}
            drawings={drawings}
            onAddDrawing={addDrawing}
            layoutMeta={layoutMeta}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={selectDrawing}
            onDeleteDrawing={deleteDrawing}
            onUpdateDrawing={updateDrawing}
            onPushHistory={pushHistory}
          />
        </main>

        <div className={
          mobilePanel === 'properties'
            ? 'absolute inset-y-0 right-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none'
            : 'hidden md:flex md:flex-none'
        }>
          <PropertiesPanel
            element={selectedElement}
            onUpdate={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            selectedDrawing={selectedDrawing}
            onUpdateDrawing={updateDrawing}
            onDeleteDrawing={deleteDrawing}
            selectedIds={selectedIds}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
          />
        </div>

        {mobilePanel !== null && (
          <div
            className="absolute inset-0 z-10 md:hidden bg-black/40"
            onClick={() => setMobilePanel(null)}
          />
        )}
      </div>

      <FooterLegend meta={layoutMeta} onUpdate={updateMeta} />
    </div>
  )
}