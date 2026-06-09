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
import type { AssetTemplate } from '@/types/layout'

interface Props {
  layoutIdToLoad?: string | null
}

export default function LayoutEditor({ layoutIdToLoad }: Props) {
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [inputName, setInputName] = useState('Sin título')

  const {
    elements, selectedId, selectedElement,
    selectedDrawingId, selectedDrawing,
    viewport, selectElement, selectDrawing,
    updateElement, updateViewport, addElement,
    deleteElement, duplicateElement, activeTool, setTool,
    drawings, addDrawing, deleteDrawing, updateDrawing,
    clearDrawings, layoutMeta, updateMeta,
    pushHistory, undo, redo, canUndo, canRedo,
    setElements, setDrawings, setViewport, setLayoutMeta,
  } = useCanvasState()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const persistence = useLayoutPersistence(userId)
  const { save, load } = persistence

  const { assets: customAssets, createAsset, deleteAsset } = useCustomAssets(userId)

  // Cuando se carga un layout existente, sincroniza el inputName
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

  // inputName ref para evitar stale closure en handleSave
  const inputNameRef = useRef(inputName)
  inputNameRef.current = inputName

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaveStatus('saving')
    const currentName = inputNameRef.current
    const metaWithCliente = { ...layoutMeta, cliente: currentName }
    await save({ elements, drawings, meta: metaWithCliente, viewport }, currentName)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, save, elements, drawings, layoutMeta, viewport])

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
        if (e.key === 'd') { e.preventDefault(); if (selectedId) duplicateElement(selectedId); return }
        if (e.key === 's') { e.preventDefault(); handleSave(); return }
        return
      }
      if (e.key === 's') setTool('pointer')
      else if (e.key === 'l') setTool('line')
      else if (e.key === 'a') setTool('arrow')
      else if (e.key === 't') setTool('text')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, duplicateElement, setTool, undo, redo, handleSave])

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
        onSetTool={setTool}
        onClearDrawings={clearDrawings}
        onExport={() => canvasRef.current?.exportPNG()}
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
            viewport={viewport}
            onSelect={selectElement}
            onUpdateElement={updateElement}
            onUpdateViewport={updateViewport}
            onDeleteElement={deleteElement}
            activeTool={activeTool}
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