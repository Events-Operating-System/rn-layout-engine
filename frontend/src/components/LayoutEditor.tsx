import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import LegendPanel from '@/components/panels/LegendPanel'
import LayoutCanvas from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'

export default function LayoutEditor() {
  const {
    elements,
    selectedId,
    selectedElement,
    viewport,
    selectElement,
    updateElement,
    updateViewport,
  } = useCanvasState()

  return (
    <div className="flex-1 flex overflow-hidden">
      <AssetLibraryPanel />

      <main className="flex-1 flex flex-col overflow-hidden">
        <LayoutCanvas
          elements={elements}
          selectedId={selectedId}
          viewport={viewport}
          onSelect={selectElement}
          onUpdateElement={updateElement}
          onUpdateViewport={updateViewport}
        />
      </main>

      <PropertiesPanel element={selectedElement} onUpdate={updateElement} />
    </div>
  )
}
