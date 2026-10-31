import { useRef, useState } from 'react'
import { useLang } from '@/context/LangContext'
import type { VenueBackground } from '@/types/layout'
import { uploadBackground, kindOf, BackgroundError, applyCrop } from '@/lib/venueBackground'
import CropBackgroundDialog from '@/components/CropBackgroundDialog'

// "Plano del local" (bloque 5): subir el plano de fondo (imagen o PDF, según
// los formatos que permita la org), transparencia, bloquearlo, calibrar la
// escala y quitarlo. Si no hay plano, se dibuja con la herramienta Muro.
interface Props {
  orgId: string
  background?: VenueBackground
  allowImage: boolean
  allowPdf: boolean
  onChange: (bg: VenueBackground | undefined) => void
  onStartCalibrate: () => void
  onClose: () => void
  // Imagen original ya bajada (para recortar).
  imageUrl?: string
}

// Tamaño inicial: 50 m de ancho (se ajusta al calibrar).
const INITIAL_WIDTH_M = 50

export default function VenueBackgroundPanel({ orgId, background, allowImage, allowPdf, onChange, onStartCalibrate, onClose, imageUrl }: Props) {
  const [cropping, setCropping] = useState(false)
  const { t } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = [allowImage ? 'image/png,image/jpeg,image/webp' : '', allowPdf ? 'application/pdf,.pdf' : ''].filter(Boolean).join(',')
  const uploadLabel = allowImage && allowPdf ? t.venueUpload : allowPdf ? 'PDF' : t.venueUploadImage

  async function handleFile(file: File) {
    setError(null)
    const kind = kindOf(file)
    if (!kind || (kind === 'pdf' && !allowPdf) || (kind === 'image' && !allowImage)) {
      setError(t.venueErrFormat)
      return
    }
    setUploading(true)
    try {
      const { path, pxWidth, pxHeight } = await uploadBackground(orgId, file)
      const width = background?.width ?? INITIAL_WIDTH_M
      // Un archivo nuevo empieza sin recorte (el anterior era de otra imagen).
      onChange({
        path,
        x: background?.x ?? 0,
        y: background?.y ?? 0,
        width,
        height: Math.round((width * pxHeight / pxWidth) * 1000) / 1000,
        opacity: background?.opacity ?? 0.5,
        locked: false,
      })
    } catch (err) {
      const code = err instanceof BackgroundError ? err.code : 'other'
      setError(code === 'size' ? t.venueErrSize : code === 'storage-full' ? t.venueErrFull : code === 'format' ? t.venueErrFormat : code === 'permission' ? t.noPermission : t.venueErrOther)
    } finally {
      setUploading(false)
    }
  }

  const btn = 'w-full h-8 rounded text-xs font-semibold border transition-colors disabled:opacity-40'
  return (
    <div className="absolute right-3 top-full mt-1 z-40 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-100">{t.venueTitle}</h3>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{t.venueHint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleFile(f) }}
      />
      {(allowImage || allowPdf) && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`${btn} text-white bg-indigo-600 hover:bg-indigo-500 border-indigo-500`}
        >
          {uploading ? t.venueUploading : background ? `${t.venueReplace} · ${uploadLabel}` : uploadLabel}
        </button>
      )}
      {error && <p className="text-[11px] text-amber-400">{error}</p>}
      {background && (
        <>
          <label className="block text-[11px] text-slate-400">
            {t.venueOpacity}
            <input
              type="range" min={0.1} max={1} step={0.05}
              value={background.opacity}
              onChange={e => onChange({ ...background, opacity: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" checked={background.locked} onChange={e => onChange({ ...background, locked: e.target.checked })} />
            {t.venueLock}
          </label>
          <button onClick={() => setCropping(true)} disabled={!imageUrl} className={`${btn} text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-600`}>
            ✂ {background.crop ? t.cropEdit : t.cropBtn}
          </button>
          <button onClick={onStartCalibrate} className={`${btn} text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-600`}>
            📐 {t.venueCalibrate}
          </button>
          <button onClick={() => onChange(undefined)} className={`${btn} text-red-300 bg-transparent hover:bg-red-950/40 border-red-900/60`}>
            {t.venueRemove}
          </button>
        </>
      )}
      {cropping && background && imageUrl && (
        <CropBackgroundDialog
          imageUrl={imageUrl}
          crop={background.crop}
          onClose={() => setCropping(false)}
          onApply={c => { setCropping(false); onChange(applyCrop(background, c)) }}
        />
      )}
    </div>
  )
}
