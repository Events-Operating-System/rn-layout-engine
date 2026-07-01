import { useState, useCallback, useRef } from 'react'
import { layoutService, type SavedLayout, type LayoutData } from '@/lib/layoutService'

export function useLayoutPersistence(orgId: string, eventId?: string | null) {
  const [layoutId, setLayoutId] = useState<string | null>(null)
  const [layoutName, setLayoutName] = useState('Sin título')
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Keep layoutName in a ref so save() always uses the latest value
  const layoutNameRef = useRef(layoutName)
  layoutNameRef.current = layoutName

  // Keep eventId in a ref so save() always uses the latest value
  const eventIdRef = useRef(eventId)
  eventIdRef.current = eventId

  const fetchLayouts = useCallback(async () => {
    if (!orgId) return
    const data = await layoutService.list(orgId)
    setLayouts(data)
  }, [orgId])

  const save = useCallback(async (data: LayoutData, name?: string) => {
    if (!orgId) return
    setSaving(true)
    try {
      const finalName = name ?? layoutNameRef.current
      const id = await layoutService.save(layoutId, orgId, finalName, data, eventIdRef.current)
      setLayoutId(id)
      // Do NOT reset layoutName here — keep what the user typed
      await fetchLayouts()
    } finally {
      setSaving(false)
    }
  }, [orgId, layoutId, fetchLayouts])

  const load = useCallback(async (id: string): Promise<LayoutData> => {
    setLoading(true)
    try {
      const data = await layoutService.load(id)
      setLayoutId(id)
      const list = await layoutService.list(orgId)
      setLayouts(list)
      const layout = list.find(l => l.id === id)
      if (layout) setLayoutName(layout.name)
      return data
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const newLayout = useCallback(() => {
    setLayoutId(null)
    setLayoutName('Sin título')
  }, [])

  return {
    layoutId,
    layoutName,
    setLayoutName,
    layouts,
    saving,
    loading,
    fetchLayouts,
    save,
    load,
    newLayout,
  }
}