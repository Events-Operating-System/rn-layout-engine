import { useEffect, useRef, useState, useCallback } from 'react'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import FooterLegend from '@/components/FooterLegend'
import { useLang, type Lang } from '@/context/LangContext'
import { layoutService, type LayoutVersion, type LayoutVersionSummary } from '@/lib/layoutService'
import type { CanvasViewport } from '@/types/layout'
import { normalizeLayoutMeta } from '@/lib/layoutMeta'

const DATE_LOCALE: Record<Lang, string> = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' }
const noop = () => {}
const EMPTY_IDS = new Set<string>()

function formatWhen(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(DATE_LOCALE[lang], {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  layoutId: string | null
  currentVersion: number
  onClose: () => void
  // La base ya creó la versión nueva; el editor carga su contenido.
  onRestored: (newVersion: number, content: LayoutVersion) => void
}

// Panel "Versiones": lista el historial (layout_versions), abre una versión
// en solo lectura (con exportar PDF/PNG con su propio número) y la restaura
// creando una versión nueva.
export default function VersionHistory({ layoutId, currentVersion, onClose, onRestored }: Props) {
  const { t, lang } = useLang()
  const [versions, setVersions] = useState<LayoutVersionSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [viewing, setViewing] = useState<LayoutVersion | null>(null)
  const [opening, setOpening] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState(false)

  useEffect(() => {
    if (!layoutId) return
    let cancelled = false
    setLoadError(false)
    layoutService.listVersions(layoutId)
      .then(v => { if (!cancelled) setVersions(v) })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [layoutId, currentVersion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirming !== null) setConfirming(null)
      else if (viewing) setViewing(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming, viewing, onClose])

  const openVersion = useCallback(async (n: number) => {
    if (!layoutId) return
    setOpening(n)
    try {
      setViewing(await layoutService.getVersion(layoutId, n))
    } catch {
      setLoadError(true)
    } finally {
      setOpening(null)
    }
  }, [layoutId])

  const restore = useCallback(async (n: number) => {
    if (!layoutId) return
    setRestoring(true)
    setRestoreError(false)
    try {
      const content = viewing?.version_number === n ? viewing : await layoutService.getVersion(layoutId, n)
      const newVersion = await layoutService.restoreVersion(layoutId, n)
      onRestored(newVersion, content)
      setConfirming(null)
      setViewing(null)
      onClose()
    } catch {
      setRestoreError(true)
    } finally {
      setRestoring(false)
    }
  }, [layoutId, viewing, onRestored, onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        <div className="flex-none flex items-center justify-between px-4 h-12 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-100">{t.versionsTitle}</h3>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">{t.versionClose}</button>
        </div>
        <p className="flex-none px-4 py-2 text-[11px] text-slate-500 border-b border-slate-800">{t.versionsHint}</p>
        <div className="flex-1 overflow-y-auto">
          {!layoutId && <p className="p-4 text-xs text-slate-400">{t.versionsEmpty}</p>}
          {layoutId && loadError && <p className="p-4 text-xs text-amber-400">{t.versionsLoadError}</p>}
          {layoutId && !loadError && versions === null && <p className="p-4 text-xs text-slate-500">{t.versionsLoading}</p>}
          {versions?.map(v => (
            <div key={v.version_number} className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="flex-none w-10 text-sm font-semibold font-mono text-slate-100">v{v.version_number}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-300 truncate">
                  {formatWhen(v.created_at, lang)}
                  {v.version_number === currentVersion && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-300">{t.versionCurrent}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {v.created_by_name ?? '—'}
                  {v.restored_from !== null && ` · ${t.versionRestoredFrom.replace('{n}', String(v.restored_from))}`}
                </div>
              </div>
              <button
                onClick={() => void openVersion(v.version_number)}
                disabled={opening !== null}
                className="flex-none h-7 px-2.5 rounded text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40"
              >
                {opening === v.version_number ? '…' : t.versionView}
              </button>
              {v.version_number !== currentVersion && (
                <button
                  onClick={() => { setRestoreError(false); setConfirming(v.version_number) }}
                  className="flex-none h-7 px-2.5 rounded text-[11px] font-semibold text-indigo-300 bg-slate-800 hover:bg-slate-700 border border-indigo-700/60"
                >
                  {t.versionRestore}
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {viewing && (
        <VersionViewer
          version={viewing}
          canRestore={viewing.version_number !== currentVersion}
          onRestore={() => { setRestoreError(false); setConfirming(viewing.version_number) }}
          onClose={() => setViewing(null)}
        />
      )}

      {confirming !== null && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <p className="text-sm text-slate-100 mb-2">
              {t.versionRestoreConfirm
                .replace('{n}', String(confirming))
                .replace('{next}', String(currentVersion + 1))}
            </p>
            <p className="text-xs text-slate-400 mb-4">{t.versionRestoreUnsaved}</p>
            {restoreError && <p className="text-xs text-amber-400 mb-3">{t.versionRestoreError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                disabled={restoring}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => void restore(confirming)}
                disabled={restoring}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold disabled:opacity-40"
              >
                {restoring ? t.versionRestoring : t.versionRestore}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Visor de solo lectura: el mismo canvas en modo "mano" (los elementos no
// se pueden seleccionar ni mover), con pan/zoom local que no toca el
// editor. Exporta con el nombre y número de ESA versión.
function VersionViewer({ version, canRestore, onRestore, onClose }: {
  version: LayoutVersion
  canRestore: boolean
  onRestore: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [viewport, setViewport] = useState<CanvasViewport>(version.viewport)
  const updateViewport = useCallback((u: Partial<CanvasViewport>) => setViewport(v => ({ ...v, ...u })), [])
  const meta = normalizeLayoutMeta(version.meta, version.name)

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex-none h-11 bg-slate-900 border-b border-slate-700 flex items-center gap-2 px-3 sm:px-4">
        <span className="text-sm font-medium text-slate-100 truncate min-w-0">{meta.proyecto}</span>
        <span className="flex-none text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 whitespace-nowrap">
          {t.versionViewing.replace('{n}', String(version.version_number))}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => canvasRef.current?.exportPDF()}
          className="flex-none h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600"
        >
          PDF
        </button>
        <button
          onClick={() => canvasRef.current?.exportPNG()}
          className="flex-none h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600"
        >
          PNG
        </button>
        {canRestore && (
          <button
            onClick={onRestore}
            className="flex-none h-7 px-3 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            {t.versionRestore}
          </button>
        )}
        <button onClick={onClose} className="flex-none h-7 px-3 rounded text-xs text-slate-400 hover:text-slate-200">
          {t.versionClose}
        </button>
      </div>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <LayoutCanvas
          ref={canvasRef}
          elements={version.elements ?? []}
          selectedId={null}
          selectedIds={EMPTY_IDS}
          viewport={viewport}
          onSelect={noop}
          onToggleSelect={noop}
          onSelectMultiple={noop}
          onUpdateElement={noop}
          onUpdateElements={noop}
          onUpdateViewport={updateViewport}
          onAddPolygon={noop}
          onDeleteElement={noop}
          onDeleteElements={noop}
          activeTool="hand"
          measureMode="distance"
          drawings={version.drawings ?? []}
          onAddDrawing={noop}
          layoutMeta={meta}
          versionNumber={version.version_number}
          selectedDrawingId={null}
          onSelectDrawing={noop}
          onDeleteDrawing={noop}
          onUpdateDrawing={noop}
          onPushHistory={noop}
        />
      </main>
      <FooterLegend meta={meta} versionNumber={version.version_number} onUpdate={noop} readOnly />
    </div>
  )
}
