import { useState, useCallback, useEffect } from 'react'
import { assetService, type CustomAsset, type NewCustomAsset } from '@/lib/assetService'

export function useCustomAssets(userId: string) {
  const [assets, setAssets] = useState<CustomAsset[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAssets = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await assetService.list()
      setAssets(data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchAssets()
  }, [userId])

  const createAsset = useCallback(async (asset: NewCustomAsset) => {
    const created = await assetService.create(asset)
    setAssets(prev => [created, ...prev])
    return created
  }, [])

  const deleteAsset = useCallback(async (id: string) => {
    await assetService.delete(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  return {
    assets,
    loading,
    fetchAssets,
    createAsset,
    deleteAsset,
  }
}