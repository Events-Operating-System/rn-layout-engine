import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/context/LangContext'

// module_key propio de este repo en public.modules — mismo valor que usa
// Identity para armar el handoff (eventos-identity-frontend/src/pages/
// Dashboard.tsx, HANDOFF_MODULE_KEY.layouts). Mismo patrón que
// eventos-ventas-frontend y eventos-administracion-frontend Callback.tsx.
const MODULE_KEY = 'layout'

type CallbackState = 'working' | 'blocked' | 'error'

// Receptor del handoff de un solo uso emitido por Identity al hacer click
// en el tile de este módulo (create-module-handoff-code). Vive en la ruta
// plana `/callback` (sin router — ver getLayoutIdFromPath en App.tsx, que
// resuelve el caso distinto `/editor/:id/callback` del flujo OAuth viejo
// con tokens crudos, ya manejado automáticamente por supabase-js).
export default function CallbackScreen() {
  const { t } = useLang()
  const [state, setState] = useState<CallbackState>('working')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const code = params.get('code')

    if (!code) {
      window.location.replace('/')
      return
    }

    redeemHandoffCode(code)

    async function redeemHandoffCode(code: string) {
      // fetch() directo, NO supabase.functions.invoke(): este endpoint es
      // deliberadamente pre-auth (verify_jwt=false) y no debe depender de
      // una sesión existente en el navegador — invoke() adjunta la sesión
      // actual como Authorization y eso rompe la redención cuando ya había
      // sesión previa en este módulo. Bug confirmado en vivo en
      // Administración (ver frontend/CLAUDE.md). fetch() sin ese header
      // funciona siempre, con o sin sesión previa.
      let data: { token_hash?: string; org_id?: string; error?: string } | null
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-module-handoff-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ code, module_key: MODULE_KEY }),
          },
        )
        data = await res.json().catch(() => null)
      } catch {
        data = null
      }

      if (!data?.token_hash || !data?.org_id) {
        setErrorMessage(data?.error ?? null)
        setState('error')
        return
      }

      const { token_hash, org_id } = data

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'magiclink',
      })

      if (verifyError || !verifyData.user) {
        setErrorMessage(verifyError?.message ?? null)
        setState('error')
        return
      }

      // Defensa en profundidad: el código ya autenticó a este usuario, pero
      // eso solo prueba que Identity lo emitió — el rol del usuario en esta
      // org puede haber cambiado entre que Identity chequeó acceso (al
      // emitir el código) y este momento. Se vuelve a resolver rol +
      // módulos con la sesión recién creada antes de dejar pasar a
      // cualquier pantalla.
      const { data: roleRows, error: roleError } = await supabase.rpc('get_user_role_and_modules', {
        p_org_id: org_id,
      })

      const moduleKeys: string[] = roleRows?.[0]?.module_keys ?? []
      if (roleError || !moduleKeys.includes(MODULE_KEY)) {
        // Solo la sesión de este navegador (scope 'local'): un signOut() global
        // revoca TODAS las sesiones de la persona — los demás módulos y los otros
        // dispositivos —, y acá basta con un rol sin este módulo o un error
        // pasajero de la RPC para dispararlo.
        await supabase.auth.signOut({ scope: 'local' })
        setState('blocked')
        return
      }

      // Reload duro (no history.replaceState): la sesión ya quedó
      // persistida por verifyOtp, así que App vuelve a montar en `/` y la
      // toma directo vía getSession() — evita coordinar el estado local de
      // esta pantalla con el árbol principal de App.
      window.location.replace('/')
    }
  }, [])

  if (state === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.callbackBlockedTitle}</h1>
          <p className="text-sm text-gray-500">{t.callbackBlockedBody}</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.callbackErrorTitle}</h1>
          <p className="text-sm text-gray-500">{errorMessage ?? t.callbackErrorGeneric}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white text-sm opacity-50">{t.callbackSigningIn}</div>
    </div>
  )
}
