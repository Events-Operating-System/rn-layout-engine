import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveFunctionErrorMessage } from '@/lib/functionsError'

export default function NoOrganization({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Ingresá un nombre para tu organización.')
      return
    }

    setError(null)
    setSubmitting(true)

    const { data, error: invokeError } = await supabase.functions.invoke<{
      organization?: unknown
      error?: string
    }>('create-organization', { body: { name: trimmedName } })

    setSubmitting(false)

    if (invokeError) {
      setError(await resolveFunctionErrorMessage(invokeError, 'No se pudo crear la organización. Intentá de nuevo.'))
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    onCreated()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <h1 className="text-xl font-bold text-slate-100 mb-2 text-center">Crear tu organización</h1>
        <p className="text-slate-400 text-sm mb-8 text-center leading-relaxed">
          Todavía no formás parte de ninguna organización en EventOS.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orgName" className="mb-1 block text-xs font-medium text-slate-400">
              Nombre de tu organización
            </label>
            <input
              id="orgName"
              type="text"
              required
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear organización'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="w-full mt-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
