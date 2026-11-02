import { useLang } from '@/context/LangContext'
import type { LayerId, LayerState } from '@/types/layout'
import { LAYERS, LAYER_COLORS, toggleLayer } from '@/lib/layers'

// Capas fijas (bloque 6): mostrar u ocultar y bloquear cada una. Lo oculto
// no sale en el PNG ni en el PDF: así se exporta el plano técnico (todo) o
// el plano para el cliente (sin técnica ni notas).
interface Props {
  state: LayerState
  counts: Record<LayerId, number>
  canLock: boolean
  // Capas que oculta "Vista cliente" (ajuste de la org).
  clientViewHidden: LayerId[]
  onChange: (next: LayerState) => void
  onClose: () => void
  // "Aplicar colores por capa" (no se muestra en solo lectura).
  onApplyColors?: () => void
}

export default function LayersPanel({ state, counts, canLock, clientViewHidden, onChange, onClose, onApplyColors }: Props) {
  const { t } = useLang()
  const names: Record<LayerId, string> = {
    structure: t.layerStructure, furniture: t.layerFurniture, decor: t.layerDecor, technical: t.layerTechnical, notes: t.layerNotes,
  }
  const btn = 'flex-1 h-7 rounded text-[10px] font-semibold border border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors'
  return (
    <div className="absolute right-0 top-full mt-1 z-40 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-100">{t.layersTitle}</h3>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300" aria-label={t.cancel}>✕</button>
      </div>
      <ul className="space-y-1">
        {LAYERS.map(id => {
          const hidden = state.hidden.includes(id)
          const locked = state.locked.includes(id)
          return (
            <li key={id} className={`flex items-center gap-2 rounded px-2 py-1.5 ${hidden ? 'opacity-50' : ''} hover:bg-slate-800/60`}>
              <button
                onClick={() => onChange(toggleLayer(state, 'hidden', id))}
                title={hidden ? t.layerShow : t.layerHide}
                aria-label={`${names[id]} · ${hidden ? t.layerShow : t.layerHide}`}
                aria-pressed={!hidden}
                className="w-6 text-sm text-slate-300 hover:text-white"
              >
                {hidden ? '◌' : '◉'}
              </button>
              <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ backgroundColor: LAYER_COLORS[id] }} />
              <span className="flex-1 text-xs text-slate-200">{names[id]}</span>
              <span className="text-[10px] font-mono text-slate-500">{counts[id]}</span>
              {canLock && (
                <button
                  onClick={() => onChange(toggleLayer(state, 'locked', id))}
                  title={locked ? t.layerUnlock : t.layerLock}
                  aria-label={`${names[id]} · ${locked ? t.layerUnlock : t.layerLock}`}
                  aria-pressed={locked}
                  className={`w-6 text-xs ${locked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  {locked ? '🔒' : '🔓'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex gap-2">
        <button onClick={() => onChange({ ...state, hidden: [] })} className={btn}>{t.layersShowAll}</button>
        <button onClick={() => onChange({ ...state, hidden: [...clientViewHidden] })} className={btn} title={clientViewHidden.map(l => names[l]).join(', ') || '—'}>{t.layersClientView}</button>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{t.layersHint}</p>
      {onApplyColors && (
        <div className="border-t border-slate-700 pt-3 space-y-1.5">
          <button onClick={onApplyColors} className={`${btn} w-full`}>{t.applyLayerColors}</button>
          <p className="text-[10px] text-slate-500 leading-relaxed">{t.applyLayerColorsHint}</p>
        </div>
      )}
    </div>
  )
}
