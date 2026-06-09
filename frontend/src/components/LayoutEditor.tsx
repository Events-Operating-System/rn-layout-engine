import { useRef, useState, useEffect, useCallback } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { supabase } from '@/lib/supabase'
import type { AssetTemplate } from '@/types/layout'

export default function LayoutEditor() {
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const {
    elements, selectedId, selectedElement,
    selectedDrawingId, selectedDrawing,
    viewport, selectElement, selectDrawing,
    updateElement, updateViewport, addElement,
    deleteElement, duplicateElement, activeTool, setTool,
    drawings, addDrawing, deleteDrawing, updateDrawing,
    clearDrawings, layoutMeta, updateMeta,
    pushHistory, undo, redo, canUndo, canRedo,
  } = useCanvasState()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const persistence = useLayoutPersistence(userId)
  const { save, layoutName, setLayoutName } = persistence

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaveStatus('saving')
    await save({ elements, drawings, meta: layoutMeta, viewport })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, save, elements, drawings, layoutMeta, viewport])

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

      {/* Save bar */}
      <div className="flex-none h-8 bg-slate-950 border-b border-slate-800 flex items-center px-3 gap-3">
        <input
          value={layoutName}
          onChange={e => setLayoutName(e.target.value)}
          className="bg-transparent text-xs text-slate-300 font-medium outline-none border-none w-48 placeholder:text-slate-600"
          placeholder="Sin título"
        />
        <div className="flex-1" />
        {saveStatus === 'saving' && <span className="text-[10px] text-indigo-400 animate-pulse">Guardando...</span>}
        {saveStatus === 'saved' && <span className="text-[10px] text-green-500">✓ Guardado</span>}
        <button
          onClick={handleSave}
          disabled={!userId || saveStatus === 'saving'}
          className="h-6 px-3 rounded text-[10px] font-semibold text-white bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 transition-colors"
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
          <AssetLibraryPanel onAddElement={handleAddElement} />
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