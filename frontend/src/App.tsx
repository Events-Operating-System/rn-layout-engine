import { useEffect, useState, useCallback } from 'react'
import { supabase, checkOrgMembership, type User } from '@/lib/supabase'
import LayoutEditor from '@/components/LayoutEditor'
import LayoutDashboard from '@/components/LayoutDashboard'
import SinAcceso from '@/components/SinAcceso'
import { LangProvider, useLang } from '@/context/LangContext'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { layoutService } from '@/lib/layoutService'

function LoginScreen() {
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <div className="text-4xl mb-4">⚡</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">EventOS Layout</h1>
        <p className="text-gray-500 text-sm mb-8">Powered by Reality Near</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>
      </div>
    </div>
  )
}

interface AppShellProps {
  onGoToDashboard: () => void
  layoutIdToLoad: string | null
  eventId: string | null
  onLayoutForked: (newId: string) => void
}

function AppShell({ onGoToDashboard, layoutIdToLoad, eventId, onLayoutForked }: AppShellProps) {
  const { lang, setLang, t } = useLang()

  const items = [
    { label: t.catStage,       color: '#6366f1' },
    { label: t.catStructure,   color: '#0891b2' },
    { label: t.catSeating,     color: '#f59e0b' },
    { label: t.catBarrier,     color: '#ef4444' },
    { label: t.catUtility,     color: '#22c55e' },
    { label: t.catCirculation, color: '#a855f7' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <header className="h-10 flex-none bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-3">
        <button
          onClick={onGoToDashboard}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Volver a layouts"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">RN Layout Engine</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://eventos-identity-frontend.vercel.app/dashboard"
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L2 5l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            EventOS
          </a>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 transition-colors tracking-wider"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
          <span className="text-[9px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 font-medium tracking-wider uppercase">MVP</span>
          <span className="hidden sm:block text-[9px] text-slate-600">Reality Near · Events Operating System</span>
        </div>
      </header>

      <LayoutEditor layoutIdToLoad={layoutIdToLoad} eventId={eventId} onLayoutForked={onLayoutForked} />

      <footer className="h-10 flex-none bg-slate-900 border-t border-slate-700/60 flex items-center px-4 gap-6 overflow-hidden">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest flex-none">Legend</span>
          {items.map(({ label, color }) => (
            <div key={color} className="flex items-center gap-1.5 flex-none">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-5 text-[9px] text-slate-600 ml-auto flex-none">
          <span>{t.hintZoom}</span>
          <span>{t.hintPan}</span>
          <span>{t.hintSelect}</span>
          <span>{t.hintMove}</span>
        </div>
      </footer>
    </div>
  )
}

type View = 'dashboard' | 'editor'

const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL
  ?? 'https://eventos-identity-frontend.vercel.app'

// The path can arrive as either `/editor/:id` or `/editor/:id/callback` —
// the latter happens when this URL was the target of an Identity OAuth
// handoff (see eventos-identity-frontend Login.tsx), which appends
// `/callback` to the deep link so the session lands on this app's own
// origin. Both forms must resolve to the same layout id.
function getLayoutIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/editor\/([^/]+?)(?:\/callback)?\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

// supabase-js's initial getSession() call has no internal timeout: if the
// implicit-grant callback's underlying network fetch stalls, the promise
// never settles and the app is stuck on the loading screen forever with no
// visible error. Race it against a hard timeout so a stalled session check
// fails loudly instead of silently.
const SESSION_CHECK_TIMEOUT_MS = 10000

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [directLayoutId] = useState<string | null>(() => getLayoutIdFromPath())
  const [view, setView] = useState<View>(() => (directLayoutId ? 'editor' : 'dashboard'))
  const [layoutIdToLoad, setLayoutIdToLoad] = useState<string | null>(() => directLayoutId)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [eventId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event_id'))

  const orgId = user?.id ?? ''
  const persistence = useLayoutPersistence(orgId)
  const { fetchLayouts, layouts, newLayout } = persistence

  useEffect(() => {
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      setSessionCheckFailed(true)
      setChecking(false)
    }, SESSION_CHECK_TIMEOUT_MS)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      window.clearTimeout(timeoutId)
      if (timedOut) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const access = await checkOrgMembership()
        setHasAccess(access)
      }
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      window.clearTimeout(timeoutId)
      setSessionCheckFailed(false)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const access = await checkOrgMembership()
        setHasAccess(access)
      } else {
        setHasAccess(null)
      }
      setChecking(false)
    })
    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      setDashboardLoading(true)
      fetchLayouts().finally(() => setDashboardLoading(false))
    }
  }, [user])

  useEffect(() => {
    if (!checking && !user && directLayoutId && !sessionCheckFailed) {
      window.location.replace(`${IDENTITY_URL}?redirect=${window.location.href}`)
    }
  }, [checking, user, directLayoutId, sessionCheckFailed])

  // Once a session is confirmed, drop the `/callback` segment from the
  // address bar so it doesn't stick around (see getLayoutIdFromPath above).
  useEffect(() => {
    if (user && window.location.pathname.endsWith('/callback')) {
      const cleanPath = window.location.pathname.replace(/\/callback\/?$/, '') || '/'
      window.history.replaceState(null, '', cleanPath + window.location.search)
    }
  }, [user])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const handleNewLayout = useCallback(() => {
    newLayout()
    setLayoutIdToLoad(null)
    setView('editor')
  }, [newLayout])

  const handleOpenLayout = useCallback(async (id: string) => {
    if (eventId) {
      await layoutService.setEventId(id, eventId)
    }
    setLayoutIdToLoad(id)
    setView('editor')
  }, [eventId])

  const handleDeleteLayout = useCallback(async (id: string) => {
    await layoutService.delete(id)
    await fetchLayouts()
  }, [fetchLayouts])

  const handleDuplicateLayout = useCallback(async (id: string) => {
    const original = await layoutService.getForDuplicate(id)
    const newName = `${original.name} (copia)`
    const newId = await layoutService.duplicate(
      original.org_id,
      newName,
      {
        elements: original.elements,
        drawings: original.drawings,
        meta: { ...original.meta, cliente: newName },
        viewport: original.viewport,
      },
      id
    )
    await fetchLayouts()
    setLayoutIdToLoad(newId)
    setView('editor')
  }, [fetchLayouts])

  // Editor-side duplicate actions ("Duplicar" and "Guardar como copia")
  // already create the row themselves — this just navigates the SPA to it.
  const handleLayoutForked = useCallback((newId: string) => {
    setLayoutIdToLoad(newId)
  }, [])

  const handleGoToDashboard = useCallback(async () => {
    if (getLayoutIdFromPath()) {
      window.history.replaceState(null, '', '/' + window.location.search)
    }
    await fetchLayouts()
    setView('dashboard')
  }, [fetchLayouts])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">Cargando...</div>
    </div>
  )

  if (sessionCheckFailed && !user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
      <div className="text-white text-sm opacity-70">No se pudo verificar tu sesión.</div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-lg border border-slate-700/60 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )

  if (!user) {
    if (directLayoutId) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white text-sm opacity-50">Redirigiendo...</div>
      </div>
    )
    return <LoginScreen />
  }

  if (hasAccess === null) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">Verificando acceso...</div>
    </div>
  )

  if (!hasAccess) return <SinAcceso />

  if (view === 'dashboard') return (
    <LangProvider>
      <LayoutDashboard
        layouts={layouts}
        loading={dashboardLoading}
        onOpen={handleOpenLayout}
        onNew={handleNewLayout}
        onDelete={handleDeleteLayout}
        onDuplicate={handleDuplicateLayout}
        userName={user.email ?? ''}
        onSignOut={handleSignOut}
        eventId={eventId}
      />
    </LangProvider>
  )

  return (
    <LangProvider>
      <AppShell
        onGoToDashboard={handleGoToDashboard}
        layoutIdToLoad={layoutIdToLoad}
        eventId={eventId}
        onLayoutForked={handleLayoutForked}
      />
    </LangProvider>
  )
}