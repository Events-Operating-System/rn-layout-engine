import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import type { PaperChoice } from '@/lib/pdfLayout'

// Exportar (bloque 8): hoja y orientación del PDF (por defecto, el ajuste de
// la org) y si va todo el plano o solo lo seleccionado. El cajetín va siempre.
interface Props {
  kind: 'pdf' | 'png'
  selectionCount: number
  defaultPaper: PaperChoice
  onExport: (opts: { paper: PaperChoice; selectionOnly: boolean }) => void
  onClose: () => void
}

export default function ExportDialog({ kind, selectionCount, defaultPaper, onExport, onClose }: Props) {
  const { t } = useLang()
  const [paper, setPaper] = useState(defaultPaper.paper)
  const [landscape, setLandscape] = useState(defaultPaper.landscape)
  // Con algo elegido, lo más probable es querer exportar eso.
  const [selectionOnly, setSelectionOnly] = useState(selectionCount > 0)
  const opt = (active: boolean) =>
    `flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`
  const go = () => onExport({ paper: { paper, landscape }, selectionOnly: selectionOnly && selectionCount > 0 })
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onKeyDown={e => {
      // Las teclas son del diálogo: que no lleguen a los atajos del editor
      // (Supr no debe borrar la selección que se va a exportar).
      e.stopPropagation()
      if (e.key === 'Escape') onClose()
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 id="export-title" className="text-sm font-semibold text-slate-100">{kind === 'pdf' ? t.exportPdfTitle : t.exportPngTitle}</h3>
        {kind === 'pdf' && (
          <>
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">{t.exportPaper}</p>
              <div className="flex gap-2">
                <button autoFocus onClick={() => setPaper('a4')} className={opt(paper === 'a4')} aria-pressed={paper === 'a4'}>A4</button>
                <button onClick={() => setPaper('a3')} className={opt(paper === 'a3')} aria-pressed={paper === 'a3'}>A3</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">{t.exportOrientation}</p>
              <div className="flex gap-2">
                <button onClick={() => setLandscape(true)} className={opt(landscape)} aria-pressed={landscape}>{t.exportLandscape}</button>
                <button onClick={() => setLandscape(false)} className={opt(!landscape)} aria-pressed={!landscape}>{t.exportPortrait}</button>
              </div>
            </div>
          </>
        )}
        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">{t.exportScope}</p>
          <div className="flex gap-2">
            <button onClick={() => setSelectionOnly(false)} className={opt(!selectionOnly || selectionCount === 0)} aria-pressed={!selectionOnly}>{t.exportAll}</button>
            <button
              onClick={() => setSelectionOnly(true)}
              disabled={selectionCount === 0}
              className={`${opt(selectionOnly && selectionCount > 0)} disabled:opacity-40`}
              aria-pressed={selectionOnly && selectionCount > 0}
            >
              {t.exportSelection.replace('{n}', String(selectionCount))}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{kind === 'pdf' ? t.exportPdfHint : t.exportPngHint}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors">{t.cancel}</button>
          <button onClick={go} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold transition-colors">{kind === 'pdf' ? t.exportPdfBtn : t.exportPngBtn}</button>
        </div>
      </div>
    </div>
  )
}
