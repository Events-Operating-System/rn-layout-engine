import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/context/LangContext'

// module_key propio de este repo en public.modules — mismo valor que ya usa
// CallbackScreen.tsx (ver redeem-module-handoff-code) para validar el
// handoff que emite Identity. Ese chequeo corre una sola vez, al entrar
// por el handoff; este guard lo repite en cada carga con sesión ya
// establecida (URL directa, refresh) para cerrar el hueco por el que un
// rol sin este módulo entraba igual con sesión propia — ver diagnóstico
// "permisos por rol/organización no se aplican en runtime" (2026-09-21):
// el único lugar que consultaba get_user_role_and_modules() era el
// Callback del handoff; nada más en la app lo hacía.
const MODULE_KEY = 'layout'

type GuardState = 'loading' | 'allowed' | 'denied'

interface ModuleAccessGuardProps {
  orgId: string
  children: ReactNode
}

// Esta SPA no usa router (rutas parseadas a mano en App.tsx) — mismo
// patrón "children wrapper" que OrgStatusGuard.tsx, el único choke point
// antes de este componente. Va anidado DENTRO de OrgStatusGuard (nunca al
// revés): orgId solo es un id real cuando status.state === 'active', así
// que este guard nunca corre para no-org/pending/suspended/rejected/error
// — esos estados los sigue resolviendo OrgStatusGuard antes de llegar acá.
export default function ModuleAccessGuard({ orgId, children }: ModuleAccessGuardProps) {
  const { t } = useLang()
  const [state, setState] = useState<GuardState>('loading')
  // Guard de staleness: solo la invocación más reciente puede aplicar su
  // resultado. Sin esto, un orgId cambiando rápido podía dejar aplicado el
  // resultado de una consulta vieja sobre la org anterior.
  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (!orgId) return
    const fetchId = ++fetchIdRef.current
    setState('loading')
    supabase
      .rpc('get_user_role_and_modules', { p_org_id: orgId })
      .then(({ data, error }) => {
        if (fetchId !== fetchIdRef.current) return
        // Falla cerrado: un error de red o de RPC nunca se trata como
        // acceso concedido.
        const moduleKeys: string[] = error ? [] : (data?.[0]?.module_keys ?? [])
        setState(moduleKeys.includes(MODULE_KEY) ? 'allowed' : 'denied')
      })
  }, [orgId])

  if (!orgId || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white text-sm opacity-50">{t.verifyingAccess}</div>
      </div>
    )
  }

  if (state === 'denied') {
    // Mismas claves que ya usa CallbackScreen.tsx para el mismo bloqueo
    // (callbackBlockedTitle/callbackBlockedBody, definidas en las 3
    // cascadas de idioma de LangContext.tsx — evita duplicarlas).
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center">
        <h1 className="text-white text-base font-semibold">{t.callbackBlockedTitle}</h1>
        <p className="text-slate-400 text-sm max-w-sm">{t.callbackBlockedBody}</p>
      </div>
    )
  }

  return <>{children}</>
}
