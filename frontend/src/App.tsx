import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type User } from '@/lib/supabase'
import LayoutEditor from '@/components/LayoutEditor'
import LayoutDashboard from '@/components/LayoutDashboard'
import OrgStatusGuard from '@/components/OrgStatusGuard'
import LangToggle from '@/components/LangToggle'
import { LangProvider, useLang } from '@/context/LangContext'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useOrgStatus } from '@/hooks/useOrgStatus'
import { layoutService } from '@/lib/layoutService'
import { withTimeout } from '@/lib/withTimeout'

function LoginScreen() {
  const { t } = useLang()
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.appName}</h1>
        <p className="text-gray-500 text-sm mb-8">{t.poweredBy}</p>
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
          {loading ? t.connecting : t.loginWithGoogle}
        </button>
      </div>
    </div>
  )
}

// Pantallas de estado previas al guard de organización. Viven bajo el
// LangProvider (hoisteado por encima de OrgStatusGuard en App) — antes de
// que resuelvan sesión/org, useLang() cae al bootstrap
// (localStorage / navigator.language / 'es').
function CheckingScreen() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">{t.loading}</div>
    </div>
  )
}

function RedirectingScreen() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">{t.redirecting}</div>
    </div>
  )
}

function SessionFailedScreen() {
  const { t } = useLang()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
      <div className="text-white text-sm opacity-70">{t.sessionCheckFailedMsg}</div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-lg border border-slate-700/60 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
      >
        {t.retry}
      </button>
    </div>
  )
}

interface AppShellProps {
  onGoToDashboard: () => void
  layoutIdToLoad: string | null
  eventId: string | null
  orgId: string
  onLayoutForked: (newId: string) => void
}

function AppShell({ onGoToDashboard, layoutIdToLoad, eventId, orgId, onLayoutForked }: AppShellProps) {
  const { t } = useLang()

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
      <header className="h-10 flex-none bg-slate-900 border-b border-slate-700/60 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        <button
          onClick={onGoToDashboard}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors flex-none"
          title="Volver a layouts"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-none">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide whitespace-nowrap">RN Layout Engine</span>
        </div>
        <span className="hidden sm:inline text-slate-700">|</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-none">
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
          <LangToggle className="flex-none" />
          <span className="hidden sm:inline text-[9px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 font-medium tracking-wider uppercase">MVP</span>
          <span className="hidden sm:block text-[9px] text-slate-600">Reality Near · Events Operating System</span>
        </div>
      </header>

      <LayoutEditor layoutIdToLoad={layoutIdToLoad} eventId={eventId} orgId={orgId} onLayoutForked={onLayoutForked} />

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

// supabase-js network calls have no internal timeout: if the underlying
// fetch stalls, the promise never settles and the app is stuck on the
// loading screen forever with no visible error. Bit this repo once already
// (2026-07-08, getSession() specifically) — withTimeout wraps this and any
// other auth-adjacent async chain (see useOrgStatus, which wraps its own
// org-status fetch independently for the same reason).
const AUTH_INIT_TIMEOUT_MS = 10000

async function resolveAuthState(): Promise<{ user: User | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  return { user: session?.user ?? null }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false)
  const [directLayoutId] = useState<string | null>(() => getLayoutIdFromPath())
  const [view, setView] = useState<View>(() => (directLayoutId ? 'editor' : 'dashboard'))
  const [layoutIdToLoad, setLayoutIdToLoad] = useState<string | null>(() => directLayoutId)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [eventId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event_id'))

  const { status: orgStatus, refresh: refreshOrgStatus } = useOrgStatus(user)

  // org_id real de la membership activa (organization_members vía
  // useOrgStatus) — antes de esta sesión este valor era user?.id, el id
  // del usuario, no el de la organización (mismo bug de "org_id mal
  // resuelto" cerrado en Inventarios/Agentes, aunque ahí la causa era un
  // fallback hardcodeado y acá era leer el campo equivocado). Sin efecto
  // en RLS hasta ahora porque public.layouts nunca usó su columna org_id
  // para scoping (siempre created_by = auth.uid()) — se corrige igual
  // porque la columna existe justamente para eso.
  const orgId = orgStatus.state === 'active' ? orgStatus.orgId : ''
  // Insumos de la cascada de idioma (LangProvider). Solo disponibles con
  // org activa; en el resto de los estados la cascada cae a
  // navigator.language / 'es'.
  const memberLocale = orgStatus.state === 'active' ? orgStatus.memberLocale : null
  const orgLocale = orgStatus.state === 'active' ? orgStatus.orgLocale : null
  const persistence = useLayoutPersistence(orgId)
  const { fetchLayouts, layouts, newLayout } = persistence

  useEffect(() => {
    let cancelled = false

    withTimeout(resolveAuthState(), AUTH_INIT_TIMEOUT_MS)
      .then(({ user: resolvedUser }) => {
        if (cancelled) return
        setUser(resolvedUser)
        setChecking(false)
      })
      .catch(() => {
        if (cancelled) return
        setSessionCheckFailed(true)
        setChecking(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSessionCheckFailed(false)
      setUser(session?.user ?? null)
      setChecking(false)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (orgId) {
      setDashboardLoading(true)
      fetchLayouts().finally(() => setDashboardLoading(false))
    }
  }, [orgId])

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

  // LangProvider hoisteado por encima de todo (incluidas las pantallas de
  // auth/loading y el OrgStatusGuard) para que todas tengan `t`. Antes de
  // que resuelvan sesión/org, sus props son undefined/null y el provider
  // cae al bootstrap (localStorage / navigator.language / 'es'), que es el
  // comportamiento correcto ahí. Una vez activa la org, recibe la cascada
  // real sin remontarse (misma posición en el árbol).
  let content: ReactNode
  if (checking) {
    content = <CheckingScreen />
  } else if (sessionCheckFailed && !user) {
    content = <SessionFailedScreen />
  } else if (!user) {
    content = directLayoutId ? <RedirectingScreen /> : <LoginScreen />
  } else {
    content = (
      <OrgStatusGuard status={orgStatus} onRefresh={refreshOrgStatus}>
        {view === 'dashboard' ? (
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
        ) : (
          <AppShell
            onGoToDashboard={handleGoToDashboard}
            layoutIdToLoad={layoutIdToLoad}
            eventId={eventId}
            orgId={orgId}
            onLayoutForked={handleLayoutForked}
          />
        )}
      </OrgStatusGuard>
    )
  }

  return (
    <LangProvider
      userId={user?.id ?? null}
      orgId={orgId || null}
      memberLocale={memberLocale}
      orgLocale={orgLocale}
    >
      {content}
    </LangProvider>
  )
}