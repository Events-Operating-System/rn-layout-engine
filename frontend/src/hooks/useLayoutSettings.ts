import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_LAYOUT_SETTINGS, parseLayoutSettings, type LayoutSettings } from '@/lib/layoutSettings'

// Ajustes de Layout de la org. Si la consulta falla se usan los valores por
// defecto (no bloquea el editor).
export function useLayoutSettings(orgId: string): LayoutSettings {
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT_SETTINGS)
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    supabase.rpc('org_settings', { p_org_id: orgId }).then(({ data, error }) => {
      if (!cancelled && !error) setSettings(parseLayoutSettings(data))
    })
    return () => { cancelled = true }
  }, [orgId])
  return settings
}
