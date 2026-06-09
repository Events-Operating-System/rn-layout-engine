import { useState } from 'react'
import type { CustomAsset } from '@/lib/assetService'
import type { LayoutElement } from '@/types/layout'

interface Props {
  assets: CustomAsset[]
  loading: boolean
  onAddAsset: (asset: CustomAsset) => void
  onDeleteAsset: (id: string) => void
  selectedElement: LayoutElement | null
  onSaveAsAsset: (element: LayoutElement) => void
}

export default function CustomAssetsPanel({
  assets, loading, onAddAsset, onDeleteAsset, selectedElement, onSaveAsAsset
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Save selected element as asset */}
      {selectedElement && (
        <div className="px-3 py-2 border-b border-slate-700/60">
          <button
            onClick={() => onSaveAsAsset(selectedElement)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Guardar "{selectedElement.name}" como asset
          </button>
        </div>
      )}

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="text-[10px] text-slate-500 text-center py-4">Cargando...</div>
        ) : assets.length === 0 ? (
          <div className="text-[10px] text-slate-600 text-center py-6 px-3 leading-relaxed">
            Selecciona un elemento en el canvas y guárdalo como asset para reutilizarlo.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {assets.map(asset => (
              <div
                key={asset.id}
                className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => onAddAsset(asset)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-sm flex-none"
                    style={{ backgroundColor: asset.default_color ?? '#6366f1' }}
                  />
                  <span className="text-[11px] text-slate-300 truncate">{asset.name}</span>
                </div>
                <div className="flex items-center gap-1 flex-none">
                  <span className="text-[9px] text-slate-600">
                    {asset.default_width}×{asset.default_height}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(asset.id) }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 rounded"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3h8M4.5 3V2h3v1M4 4.5l.5 5M8 4.5l-.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">¿Eliminar asset?</h3>
            <p className="text-xs text-slate-400 mb-6">Se eliminará de tu librería permanentemente.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDeleteAsset(confirmDelete); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-semibold transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}