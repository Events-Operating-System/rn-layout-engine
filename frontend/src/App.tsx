import { useEffect, useState, useCallback } from 'react'
import { supabase, type User } from '@/lib/supabase'
import LayoutEditor from '@/components/LayoutEditor'
import LayoutDashboard from '@/components/LayoutDashboard'
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
}

function AppShell({ onGoToDashboard, layoutIdToLoad }: AppShellProps) {
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

      <LayoutEditor layoutIdToLoad={layoutIdToLoad} />

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

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState<View>('dashboard')
  const [layoutIdToLoad, setLayoutIdToLoad] = useState<string | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const orgId = user?.id ?? ''
  const persistence = useLayoutPersistence(orgId)
  const { fetchLayouts, layouts, newLayout } = persistence

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      setDashboardLoading(true)
      fetchLayouts().finally(() => setDashboardLoading(false))
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

  const handleOpenLayout = useCallback((id: string) => {
    setLayoutIdToLoad(id)
    setView('editor')
  }, [])

  const handleDeleteLayout = useCallback(async (id: string) => {
    await layoutService.delete(id)
    await fetchLayouts()
  }, [fetchLayouts])

  const handleGoToDashboard = useCallback(async () => {
    await fetchLayouts()
    setView('dashboard')
  }, [fetchLayouts])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">Cargando...</div>
    </div>
  )

  if (!user) return <LoginScreen />

  if (view === 'dashboard') return (
    <LangProvider>
      <LayoutDashboard
        layouts={layouts}
        loading={dashboardLoading}
        onOpen={handleOpenLayout}
        onNew={handleNewLayout}
        onDelete={handleDeleteLayout}
        userName={user.email ?? ''}
        onSignOut={handleSignOut}
      />
    </LangProvider>
  )

  return (
    <LangProvider>
      <AppShell
        onGoToDashboard={handleGoToDashboard}
        layoutIdToLoad={layoutIdToLoad}
      />
    </LangProvider>
  )
}