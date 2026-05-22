import type { DrawingTool } from '@/types/layout'

interface DrawingToolbarProps {
  activeTool: DrawingTool
  onSetTool: (tool: DrawingTool) => void
  onClearDrawings: () => void
  onExport: () => void
}

const TOOLS: { tool: DrawingTool; icon: string; title: string }[] = [
  { tool: 'pointer', icon: '↖',  title: 'Select / Pan  (S)' },
  { tool: 'line',    icon: '—',  title: 'Line  (L)' },
  { tool: 'arrow',   icon: '→',  title: 'Arrow  (A)' },
  { tool: 'text',    icon: 'T',  title: 'Text annotation  (T)' },
]

export default function DrawingToolbar({
  activeTool,
  onSetTool,
  onClearDrawings,
  onExport,
}: DrawingToolbarProps) {
  return (
    <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-3 gap-2">
      {/* Tool group */}
      <div className="flex items-center gap-0.5 bg-slate-800/60 rounded p-0.5">
        {TOOLS.map(({ tool, icon, title }) => (
          <button
            key={tool}
            onClick={() => onSetTool(tool)}
            title={title}
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

      {/* Tool label */}
      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider select-none">
        {activeTool === 'pointer' ? 'Select · Pan' : activeTool === 'line' ? 'Line' : activeTool === 'arrow' ? 'Arrow' : 'Text'}
      </span>

      {activeTool !== 'pointer' && (
        <span className="text-[9px] text-slate-600 font-mono select-none">
          Click &amp; drag to draw · Press S to return to select
        </span>
      )}

      {/* Separator */}
      <div className="flex-1" />

      {/* Clear annotations */}
      <button
        onClick={onClearDrawings}
        title="Clear all annotations"
        className="h-7 px-2.5 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors font-mono"
      >
        Clear annotations
      </button>

      <div className="w-px h-5 bg-slate-700/60" />

      {/* Export */}
      <button
        onClick={onExport}
        title="Exportar plano como PNG"
        className="h-7 px-3 rounded text-[10px] font-semibold text-white bg-indigo-700 hover:bg-indigo-600 border border-indigo-500/60 transition-colors font-mono uppercase tracking-widest"
      >
        Exportar Plano
      </button>
    </div>
  )
}
