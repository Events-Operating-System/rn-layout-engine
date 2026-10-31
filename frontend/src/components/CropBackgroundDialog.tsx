import { useRef, useState } from 'react'
import { useLang } from '@/context/LangContext'
import type { BackgroundCrop } from '@/types/layout'

// "Recortar" el plano del local: se arrastra sobre la imagen original para
// quedarse con el área útil (sin cajetín, logos ni márgenes del arquitecto).
// El archivo no se toca: el recorte va en el plano.
interface Props {
  imageUrl: string
  crop?: BackgroundCrop
  onApply: (crop: BackgroundCrop | null) => void
  onClose: () => void
}

const FULL: BackgroundCrop = { x: 0, y: 0, w: 1, h: 1 }

export default function CropBackgroundDialog({ imageUrl, crop, onApply, onClose }: Props) {
  const { t } = useLang()
  const boxRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<BackgroundCrop>(crop ?? FULL)

  const point = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = point(e)
    startRef.current = p
    setRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }
  const onMove = (e: React.PointerEvent) => {
    const s = startRef.current
    if (!s) return
    const p = point(e)
    setRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
  }
  const onUp = () => {
    startRef.current = null
    // Un clic sin arrastrar no deja un recorte vacío.
    setRect(r => (r.w < 0.02 || r.h < 0.02 ? crop ?? FULL : r))
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`
  const isFull = rect.w > 0.999 && rect.h > 0.999
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="crop-title" className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-[92vw] space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 id="crop-title" className="text-sm font-semibold text-slate-100">{t.cropTitle}</h3>
          <span className="text-[11px] font-mono text-slate-400">{isFull ? t.cropNone : `${pct(rect.w)} × ${pct(rect.h)}`}</span>
        </div>
        <p className="text-[11px] text-slate-400">{t.cropHint}</p>
        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="relative overflow-hidden select-none cursor-crosshair bg-white mx-auto w-fit touch-none"
        >
          <img src={imageUrl} alt="" draggable={false} className="block max-w-[84vw] max-h-[62vh] pointer-events-none" />
          {!isFull && (
            <div
              className="absolute border-2 border-dashed border-sky-400 pointer-events-none"
              style={{
                left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h),
                boxShadow: '0 0 0 9999px rgba(2,6,23,0.6)',
              }}
            />
          )}
        </div>
        <div className="flex gap-3">
          <button autoFocus onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors">{t.cancel}</button>
          {crop && (
            <button onClick={() => onApply(null)} className="flex-1 py-2 rounded-lg border border-slate-600 text-xs text-slate-200 hover:bg-slate-800 transition-colors">{t.cropRemove}</button>
          )}
          <button onClick={() => onApply(isFull ? null : rect)} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold transition-colors">{t.cropApply}</button>
        </div>
      </div>
    </div>
  )
}
