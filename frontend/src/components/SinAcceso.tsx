import { supabase } from '@/lib/supabase'

const IDENTITY_URL = 'https://eventos-identity-frontend.vercel.app'

export default function SinAcceso() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = IDENTITY_URL
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <div className="flex justify-center mb-5">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-slate-500">
            <path
              d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="15.5" r="0.75" fill="currentColor"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-100 mb-3">Sin acceso</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Tu cuenta no tiene acceso a ninguna organización en EventOS.
          Contacta al administrador de tu organización.
        </p>
        <button
          onClick={handleSignOut}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
