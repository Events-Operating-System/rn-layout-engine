import { supabase } from '@/lib/supabase'

export default function SuspendedOrg({ orgName }: { orgName: string }) {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <h1 className="text-xl font-bold text-slate-100 mb-3">Organización suspendida</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Tu organización <span className="font-medium text-slate-200">{orgName}</span> está
          suspendida. Contactá al administrador.
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
