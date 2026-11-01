import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface OrgProvider { id: string; name: string }

// Catálogo de proveedores de la org (inventarios.providers, solo lectura;
// la RLS deja leer a los miembros). Si no se puede leer, lista vacía: la nota
// sigue aceptando texto libre.
export function useOrgProviders(orgId: string): OrgProvider[] {
  const [list, setList] = useState<OrgProvider[]>([])
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    supabase.schema('inventarios').from('providers').select('id, name').eq('org_id', orgId).eq('is_active', true).order('name')
      .then(({ data, error }) => { if (!cancelled && !error && data) setList(data as OrgProvider[]) })
    return () => { cancelled = true }
  }, [orgId])
  return list
}
