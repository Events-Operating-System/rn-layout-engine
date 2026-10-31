import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NO_LAYOUT_PERMISSIONS, parseLayoutPermissions, type LayoutPermissions } from '@/lib/layoutPermissions'

// Depende solo del id de la org (no de objetos que cambian al renovar el
// token). Falla cerrado: si la consulta falla, no se ofrece escribir; la
// base igual es el candado real.
export function useLayoutPermissions(orgId: string): LayoutPermissions {
  const [perms, setPerms] = useState<LayoutPermissions>({ ...NO_LAYOUT_PERMISSIONS, loading: true })

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setPerms(p => ({ ...p, loading: true }))
    supabase.rpc('get_my_permissions', { p_org_id: orgId }).then(({ data, error }) => {
      if (cancelled) return
      setPerms({ loading: false, ...(error ? NO_LAYOUT_PERMISSIONS : parseLayoutPermissions(data)) })
    })
    return () => { cancelled = true }
  }, [orgId])

  return perms
}
