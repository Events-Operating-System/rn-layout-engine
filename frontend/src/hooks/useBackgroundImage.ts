import { useEffect, useState } from 'react'
import { downloadBackground } from '@/lib/venueBackground'

// Imagen del fondo del plano, bajada del bucket como blob (mismo origen).
export function useBackgroundImage(path: string | undefined | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    setImg(null)
    if (!path) return
    let cancelled = false
    let url: string | null = null
    downloadBackground(path)
      .then(u => {
        url = u
        if (cancelled) return
        const image = new Image()
        image.onload = () => { if (!cancelled) setImg(image) }
        image.src = u
      })
      .catch(err => console.error('[fondo] no se pudo bajar:', err))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [path])
  return img
}
