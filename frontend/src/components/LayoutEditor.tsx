import { useRef } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'

export default function LayoutEditor() {
  const canvasRef = useRef<LayoutCanvasHandle>(null)

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DrawingToolbar
        activeTool={activeTool}
        onSetTool={setTool}
        onClearDrawings={clearDrawings}
        onExport={() => canvasRef.current?.exportPNG()}
      />

      <div className="flex-1 flex overflow-hidden">
        <AssetLibraryPanel onAddElement={addElement} />

        <main className="flex-1 flex flex-col overflow-hidden">
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

        <PropertiesPanel
          element={selectedElement}
          onUpdate={updateElement}
          selectedDrawing={selectedDrawing}
          onUpdateDrawing={updateDrawing}
          onDeleteDrawing={deleteDrawing}
        />
      </div>

      <FooterLegend meta={layoutMeta} onUpdate={updateMeta} />
    </div>
  )
}
