import { useRef, useState } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'
import type { AssetTemplate } from '@/types/layout'

export default function LayoutEditor() {
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null)

  const {
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
    activeTool,
    setTool,
    drawings,
    addDrawing,
    deleteDrawing,
    updateDrawing,
    clearDrawings,
    layoutMeta,
    updateMeta,
  } = useCanvasState()

  function toggleMobilePanel(panel: 'library' | 'properties') {
    setMobilePanel(prev => (prev === panel ? null : panel))
  }

  function handleAddElement(template: AssetTemplate) {
    addElement(template)
    // Close the library overlay on mobile after placing an asset
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
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Asset Library Panel
            Desktop (md+): always visible in normal flow
            Mobile: hidden by default, shown as absolute left-side overlay when toggled */}
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
          />
        </main>

        {/* Properties Panel
            Desktop (md+): always visible in normal flow
            Mobile: hidden by default, shown as absolute right-side overlay when toggled */}
        <div className={
          mobilePanel === 'properties'
            ? 'absolute inset-y-0 right-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none'
            : 'hidden md:flex md:flex-none'
        }>
          <PropertiesPanel
            element={selectedElement}
            onUpdate={updateElement}
            selectedDrawing={selectedDrawing}
            onUpdateDrawing={updateDrawing}
            onDeleteDrawing={deleteDrawing}
          />
        </div>

        {/* Overlay backdrop — tap anywhere outside panel to close on mobile */}
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
