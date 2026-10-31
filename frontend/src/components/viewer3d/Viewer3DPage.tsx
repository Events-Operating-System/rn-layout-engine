// Ruta /3d/<plano> (bloque 9). Se abre en otra pestaña desde "Ver en 3D" y
// se carga aparte (React.lazy en App.tsx): si algo falla acá, el editor no
// se entera. Muestra la copia que dejó el editor (con lo no guardado) o, si
// no hay, el plano guardado. Respeta las capas ocultas del plano.
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import Viewer3D, { type Background3D, type Stats3D, type Viewer3DApi } from './Viewer3D'
import { toItems, countKinds } from '@/lib/scene3d'
import { applyLayers } from '@/lib/layers'
import { readSnapshot3D } from '@/lib/snapshot3d'
import { layoutService } from '@/lib/layoutService'
import { downloadBackground } from '@/lib/venueBackground'
import { useLang } from '@/context/LangContext'
import type { LayoutElement, LayoutMeta } from '@/types/layout'

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('[3d]', err) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

// El navegador tiene que poder dibujar en 3D (WebGL).
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Viewer3DPage({ layoutId }: { layoutId: string }) {
  const { t } = useLang()
  const [plan, setPlan] = useState<{ name: string; elements: LayoutElement[]; meta: Partial<LayoutMeta> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bg, setBg] = useState<Background3D | null>(null)
  const [stats, setStats] = useState<Stats3D | null>(null)
  const [api, setApi] = useState<Viewer3DApi | null>(null)

  useEffect(() => {
    let cancelled = false
    const snap = readSnapshot3D(layoutId)
    if (snap) { setPlan({ name: snap.name, elements: snap.elements, meta: snap.meta }); return }
    if (layoutId === 'nuevo') { setError(t.view3dNoData); return }
    layoutService.load(layoutId)
      .then(d => { if (!cancelled) setPlan({ name: d.name, elements: d.elements ?? [], meta: d.meta ?? {} }) })
      .catch(() => { if (!cancelled) setError(t.view3dLoadError) })
    return () => { cancelled = true }
  }, [layoutId, t])

  // Plano del local en el piso (si hay).
  useEffect(() => {
    const b = plan?.meta.background
    if (!b) return
    let url: string | null = null
    downloadBackground(b.path).then(u => { url = u; setBg({ url: u, x: b.x, y: b.y, width: b.width, height: b.height, opacity: b.opacity }) }).catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [plan])

  const items = useMemo(() => (plan ? toItems(applyLayers(plan.elements, plan.meta.layers).elements) : []), [plan])
  const kinds = useMemo(() => countKinds(items), [items])
  const webgl = useMemo(hasWebGL, [])

  const fail = (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        <p className="text-sm text-slate-200">{t.view3dFailed}</p>
        <button onClick={() => window.close()} className="h-8 px-4 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200">{t.view3dClose}</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col text-slate-200">
      <header className="flex-none h-11 bg-slate-900 border-b border-slate-700 flex items-center gap-2 px-3">
        <span className="text-sm font-medium truncate min-w-0">{plan?.name ?? '…'}</span>
        <span className="flex-none text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">{t.view3dBadge}</span>
        <span className="hidden md:inline text-[11px] text-slate-500 truncate">
          {items.length} {t.view3dPieces} · {kinds.chair} {t.view3dChairs} · {kinds.table} {t.view3dTables}
          {stats ? ` · ${stats.fps} fps` : ''}
        </span>
        <div className="flex-1" />
        <button onClick={() => api?.overview()} disabled={!api} className="h-7 px-3 rounded text-xs font-semibold bg-slate-800 border border-slate-600 hover:bg-slate-700 disabled:opacity-40">{t.view3dOverview}</button>
        <button onClick={() => api?.person()} disabled={!api} className="h-7 px-3 rounded text-xs font-semibold bg-slate-800 border border-slate-600 hover:bg-slate-700 disabled:opacity-40">{t.view3dPerson}</button>
        <button onClick={() => window.close()} className="h-7 px-3 rounded text-xs text-slate-400 hover:text-slate-200">{t.view3dClose}</button>
      </header>
      <main className="relative flex-1 min-h-0">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 p-6 text-center">{error}</div>
        ) : !webgl ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 p-6 text-center">{t.view3dNoWebgl}</div>
        ) : plan ? (
          <Boundary fallback={fail}>
            <Viewer3D items={items} background={bg} onStats={setStats} onReady={setApi} />
          </Boundary>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">{t.view3dLoading}</div>
        )}
        <p className="absolute left-3 bottom-3 text-[11px] text-slate-400 bg-slate-900/80 rounded px-2 py-1 pointer-events-none">{t.view3dHelp}</p>
      </main>
    </div>
  )
}
