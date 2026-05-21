'use client'

import dynamic from 'next/dynamic'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import LegendPanel from '@/components/panels/LegendPanel'
import { useCanvasState } from '@/hooks/useCanvasState'

// Konva uses browser APIs — disable SSR
const LayoutCanvas = dynamic(
  () => import('@/components/canvas/LayoutCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <span className="text-xs text-slate-600">Loading canvas…</span>
      </div>
    ),
  }
)

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
