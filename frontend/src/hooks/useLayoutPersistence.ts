import { useState, useCallback } from 'react'
import { layoutService, type SavedLayout, type LayoutData } from '@/lib/layoutService'

export function useLayoutPersistence(orgId: string) {
  const [layoutId, setLayoutId] = useState<string | null>(null)
  const [layoutName, setLayoutName] = useState('Sin título')
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchLayouts = useCallback(async () => {
    if (!orgId) return
    const data = await layoutService.list(orgId)
    setLayouts(data)
  }, [orgId])

  const save = useCallback(async (data: LayoutData, name?: string) => {
    if (!orgId) return
    setSaving(true)
    try {
      const finalName = name ?? layoutName
      const id = await layoutService.save(layoutId, orgId, finalName, data)
      setLayoutId(id)
      setLayoutName(finalName)
      await fetchLayouts()
    } finally {
      setSaving(false)
    }
  }, [orgId, layoutId, layoutName, fetchLayouts])

  const load = useCallback(async (id: string): Promise<LayoutData> => {
    setLoading(true)
    try {
      const data = await layoutService.load(id)
      setLayoutId(id)
      const layout = layouts.find(l => l.id === id)
      if (layout) setLayoutName(layout.name)
      return data
    } finally {
      setLoading(false)
    }
  }, [layouts])

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