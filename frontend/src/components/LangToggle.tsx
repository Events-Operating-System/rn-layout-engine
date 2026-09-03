import { useLang, type Lang } from '@/context/LangContext'

// Selector de 3 vías ES | EN | PT — mismo criterio visual que Identity /
// Ventas / Eventos / Portal Cliente (tres botones, el activo resaltado).
// setLang persiste a organization_members.locale (ver LangProvider), así
// que el idioma viaja entre dispositivos.
const LANGS: Lang[] = ['es', 'en', 'pt']

export default function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`flex items-center rounded border border-slate-700/60 overflow-hidden ${className}`}>
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 transition-colors ${
            lang === l
              ? 'bg-indigo-600 text-white'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
