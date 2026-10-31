import { useState, useCallback, useEffect } from 'react'
import { assetService, type CustomAsset, type NewCustomAsset } from '@/lib/assetService'

// Biblioteca de la org activa: lo propio y lo compartido con la org.
export function useCustomAssets(userId: string, orgId: string) {
  const [assets, setAssets] = useState<CustomAsset[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAssets = useCallback(async () => {
    if (!userId || !orgId) return
    setLoading(true)
    try {
      setAssets(await assetService.list(orgId))
    } finally {
      setLoading(false)
    }
  }, [userId, orgId])

  useEffect(() => {
    void fetchAssets()
  }, [fetchAssets])

  const createAsset = useCallback(async (asset: NewCustomAsset) => {
    const created = await assetService.create(orgId, asset)
    setAssets(prev => [created, ...prev])
    return created
  }, [orgId])

  const deleteAsset = useCallback(async (id: string) => {
    await assetService.delete(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const setShared = useCallback(async (id: string, shared: boolean) => {
    await assetService.setShared(id, shared)
    // Sacar de la org un asset ajeno lo deja de ver: se vuelve a pedir la lista.
    await fetchAssets()
  }, [fetchAssets])

  return { assets, loading, fetchAssets, createAsset, deleteAsset, setShared }
}
