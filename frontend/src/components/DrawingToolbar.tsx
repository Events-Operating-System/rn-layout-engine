import type { DrawingTool } from '@/types/layout'
import { useLang } from '@/context/LangContext'

interface DrawingToolbarProps {
  activeTool: DrawingTool
  onSetTool: (tool: DrawingTool) => void
  onClearDrawings: () => void
  onExport: () => void
  onToggleLibrary: () => void
  onToggleProperties: () => void
  libraryOpen: boolean
  propertiesOpen: boolean
}

const TOOL_DEFS: { tool: DrawingTool; icon: string; shortcut: string }[] = [
  { tool: 'pointer', icon: '↖', shortcut: 'S' },
  { tool: 'line',    icon: '—', shortcut: 'L' },
  { tool: 'arrow',   icon: '→', shortcut: 'A' },
  { tool: 'text',    icon: 'T', shortcut: 'T' },
]

export default function DrawingToolbar({
  activeTool,
  onSetTool,
  onClearDrawings,
  onExport,
  onToggleLibrary,
  onToggleProperties,
  libraryOpen,
  propertiesOpen,
}: DrawingToolbarProps) {
  const { t } = useLang()

  const toolLabels: Record<DrawingTool, string> = {
    pointer: t.toolPointer,
    line: t.toolLine,
    arrow: t.toolArrow,
    text: t.toolText,
  }

  return (
    <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-3 gap-2">

      {/* Mobile panel toggles — visible only below md breakpoint */}
      <div className="flex items-center gap-0.5 md:hidden">
        <button
          onClick={onToggleLibrary}
          title={t.libraryTitle}
          className={`w-8 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
            libraryOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
          }`}
        >
          ☰
        </button>
        <button
          onClick={onToggleProperties}
          title={t.propertiesTitle}
          className={`w-8 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
            propertiesOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
          }`}
        >
          ⊟
        </button>
        <div className="w-px h-5 bg-slate-700/60 mx-0.5" />
      </div>

      {/* Tool group */}
      <div className="flex items-center gap-0.5 bg-slate-800/60 rounded p-0.5">
        {TOOL_DEFS.map(({ tool, icon, shortcut }) => (
          <button
            key={tool}
            onClick={() => onSetTool(tool)}
            title={`${toolLabels[tool]}  (${shortcut})`}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
              activeTool === tool
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

      <span className="hidden sm:block text-[10px] text-slate-500 font-mono uppercase tracking-wider select-none">
        {toolLabels[activeTool]}
      </span>

      {activeTool !== 'pointer' && (
        <span className="hidden md:block text-[9px] text-slate-600 font-mono select-none">
          {t.toolHint}
        </span>
      )}

      <div className="flex-1" />

      <button
        onClick={onClearDrawings}
        title={t.clearAnnotations}
        className="hidden sm:block h-7 px-2.5 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors font-mono"
      >
        {t.clearAnnotations}
      </button>

      <div className="hidden sm:block w-px h-5 bg-slate-700/60" />

      <button
        onClick={onExport}
        title={t.exportPlan}
        className="h-7 px-3 rounded text-[10px] font-semibold text-white bg-indigo-700 hover:bg-indigo-600 border border-indigo-500/60 transition-colors font-mono uppercase tracking-widest"
      >
        <span className="hidden sm:inline">{t.exportPlan}</span>
        <span className="sm:hidden">↑PNG</span>
      </button>
    </div>
  )
}
