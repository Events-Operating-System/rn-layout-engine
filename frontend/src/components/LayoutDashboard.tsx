import { useEffect, useState } from 'react'
import type { SavedLayout } from '@/lib/layoutService'

interface Props {
  layouts: SavedLayout[]
  loading: boolean
  onOpen: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => Promise<void>
  userName: string
  onSignOut: () => void
  eventId?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function LayoutDashboard({
  layouts, loading, onOpen, onNew, onDelete, onDuplicate, userName, onSignOut, eventId
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Filtro client-side por nombre — la lista carga entera de una sola
  // consulta (layoutService.list, sin paginación), así que no hace falta
  // ir al backend ni debounce.
  const q = query.trim().toLowerCase()
  const filtered = q ? layouts.filter(l => l.name.toLowerCase().includes(q)) : layouts

  // index.html sets <body class="overflow-hidden"> so the Editor's Konva
  // canvas can own the exact viewport with no native page scroll/pinch. This
  // dashboard is a normal scrolling page, not a canvas — its grid can grow
  // taller than the viewport (min-h-screen below), so it needs page scroll
  // back for as long as it's mounted. Restored on unmount for the Editor.
  useEffect(() => {
    document.body.classList.remove('overflow-hidden')
    return () => {
      document.body.classList.add('overflow-hidden')
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {eventId && (
        <div className="flex-none bg-indigo-950/60 border-b border-indigo-800/60 px-6 py-2 text-xs text-indigo-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-none" />
          Creando layout para evento <span className="font-mono text-indigo-200">{eventId}</span>
        </div>
      )}
      <header className="h-14 flex-none bg-slate-900 border-b border-slate-700/60 flex items-center px-4 sm:px-6 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-none">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold tracking-wide whitespace-nowrap">EventOS Layout</span>
        </div>
        <span className="hidden sm:inline text-slate-700">|</span>
        <span className="hidden sm:inline text-xs text-slate-500">Mis Layouts</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-none">
          <a
            href="https://eventos-identity-frontend.vercel.app/dashboard"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L2 5l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            EventOS
          </a>
          <span className="text-slate-700">|</span>
          <span className="text-xs text-slate-500 hidden sm:block">{userName}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 px-3 py-1.5 rounded border border-slate-700/60 transition-colors whitespace-nowrap"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Layouts</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {layouts.length === 0
                ? 'Ningún layout guardado aún'
                : q
                  ? `${filtered.length} de ${layouts.length}`
                  : `${layouts.length} layout${layouts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
                placeholder="Buscar por nombre"
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={onNew}
              className="flex-none flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Nuevo layout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm text-slate-500">Cargando layouts...</div>
          </div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-5xl opacity-20">🗂</div>
            <p className="text-slate-500 text-sm">Aún no tienes layouts guardados.</p>
            <button
              onClick={onNew}
              className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4 transition-colors"
            >
              Crear tu primer layout
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="text-4xl opacity-15">🔍</div>
            <p className="text-slate-500 text-sm">Ningún layout coincide con «{query.trim()}».</p>
            <button
              onClick={() => setQuery('')}
              className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4 transition-colors"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(layout => (
              <div
                key={layout.id}
                className="group bg-slate-900 border border-slate-700/60 rounded-xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer relative"
                onClick={() => onOpen(layout.id)}
              >
                <div className="w-full h-24 bg-slate-800 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-2xl opacity-10">⚡</div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{layout.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(layout.updated_at)}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 flex-none">
                    <button
                      disabled={duplicatingId === layout.id}
                      onClick={async e => {
                        e.stopPropagation()
                        setDuplicatingId(layout.id)
                        try {
                          await onDuplicate(layout.id)
                        } finally {
                          setDuplicatingId(null)
                        }
                      }}
                      title="Duplicar layout"
                      className="text-slate-600 hover:text-indigo-400 transition-colors p-1 rounded disabled:opacity-40"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="4.5" y="4.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M1.5 9.5V2a.5.5 0 0 1 .5-.5h7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDelete(layout.id) }}
                      title="Eliminar layout"
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 5.5l.5 5M9 5.5l-.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">¿Eliminar layout?</h3>
            <p className="text-xs text-slate-400 mb-6">Esta acción archivará el layout. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null) }}
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