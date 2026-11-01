import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPTY_VOCAB, type Vocab } from '@/lib/materials'

// Valores ya usados en los planos de la org (tipos de silla, telas, nombres
// de color), para sugerirlos y no contar "Blanco" y "blanco" por separado.
// Si falla, sin sugerencias de la org (no bloquea nada).
export function useLayoutVocab(orgId: string): { vocab: Vocab; refresh: () => void } {
  const [vocab, setVocab] = useState<Vocab>(EMPTY_VOCAB)
  const load = useCallback(() => {
    if (!orgId) return
    supabase.rpc('layout_vocab', { p_org_id: orgId }).then(({ data, error }) => {
      if (error || !data) return
      const d = data as Partial<Vocab>
      setVocab({
        chairTypes: Array.isArray(d.chairTypes) ? d.chairTypes : [],
        fabrics: Array.isArray(d.fabrics) ? d.fabrics : [],
        colorNames: Array.isArray(d.colorNames) ? d.colorNames : [],
      })
    })
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { vocab, refresh: load }
}
