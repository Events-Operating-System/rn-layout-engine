import { useLang, type Lang } from '@/context/LangContext'

interface Props {
  // updated_at del draft (ISO). Se muestra como fecha/hora local; no se
  // resuelve updated_by a un nombre en v1 (org_staff_directory vive en el
  // schema `ventas`, acceso cross-schema no probado desde este repo).
  updatedAt: string
  onRecover: () => void
  onDiscard: () => void
}

const DATE_LOCALE: Record<Lang, string> = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' }

function formatWhen(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(DATE_LOCALE[lang], {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RecoveryBanner({ updatedAt, onRecover, onDiscard }: Props) {
  const { t, lang } = useLang()
  const [before, after] = t.recoveryText.split('{when}')

  return (
    <div className="flex-none bg-amber-950/60 border-b border-amber-800/60 px-4 py-2 flex items-center gap-3 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-none" />
      <span className="text-amber-200">
        {before}
        <span className="font-medium text-amber-100">{formatWhen(updatedAt, lang)}</span>
        {after}
      </span>
      <div className="ml-auto flex items-center gap-2 flex-none">
        <button
          onClick={onRecover}
          className="h-6 px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
        >
          {t.recover}
        </button>
        <button
          onClick={onDiscard}
          className="h-6 px-3 rounded border border-amber-800/70 text-amber-300 hover:bg-amber-900/40 transition-colors"
        >
          {t.discard}
        </button>
      </div>
    </div>
  )
}
