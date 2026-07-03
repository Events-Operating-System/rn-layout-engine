import type { DrawingTool } from '@/types/layout'
import { useLang } from '@/context/LangContext'

interface DrawingToolbarProps {
  activeTool: DrawingTool
  // What the mode indicator label shows — same as activeTool except while
  // Space is held, when it temporarily reads 'hand' without changing the
  // button highlighting (activeTool) or persisted tool.
  effectiveTool: DrawingTool
  onSetTool: (tool: DrawingTool) => void
  onClearDrawings: () => void
  onExport: () => void
  onExportPDF: () => void
  onToggleLibrary: () => void
  onToggleProperties: () => void
  libraryOpen: boolean
  propertiesOpen: boolean
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  // Measure tool sub-mode — explicit toggle, shown only while Medir is the
  // active tool. Never inferred from click count/timing (see LayoutCanvas).
  measureMode: 'distance' | 'area'
  onSetMeasureMode: (mode: 'distance' | 'area') => void
}

const TOOL_DEFS: { tool: DrawingTool; icon: string; shortcut: string }[] = [
  { tool: 'pointer',  icon: '↖', shortcut: 'S' },
  { tool: 'hand',     icon: '✋', shortcut: 'H' },
  { tool: 'line',     icon: '—', shortcut: 'L' },
  { tool: 'arrow',    icon: '→', shortcut: 'A' },
  { tool: 'polygon',  icon: '⬠', shortcut: 'P' },
  { tool: 'text',     icon: 'T', shortcut: 'T' },
  { tool: 'measure',  icon: '📐', shortcut: 'M' },
]

export default function DrawingToolbar({
  activeTool,
  effectiveTool,
  onSetTool,
  onClearDrawings,
  onExport,
  onExportPDF,
  onToggleLibrary,
  onToggleProperties,
  libraryOpen,
  propertiesOpen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  measureMode,
  onSetMeasureMode,
}: DrawingToolbarProps) {
  const { t } = useLang()

  const toolLabels: Record<DrawingTool, string> = {
    pointer: t.toolPointer,
    hand: t.toolHand,
    line: t.toolLine,
    arrow: t.toolArrow,
    text: t.toolText,
    polygon: t.toolPolygon,
    measure: t.toolMeasure,
  }

  const toolHints: Partial<Record<DrawingTool, string>> = {
    line: t.toolHint,
    arrow: t.toolHint,
    text: t.toolHint,
    polygon: t.toolHintPolygon,
    measure: measureMode === 'area' ? t.toolHintMeasureArea : t.toolHintMeasureDistance,
  }

  return (
    <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-3 gap-2">

      {/* Mobile panel toggles */}
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

      {/* Measure sub-mode — explicit, mutually exclusive; only visible while
          Medir is the active tool. Distancia never hit-tests elements (the
          click position is used exactly as-is); Área only hit-tests. */}
      {activeTool === 'measure' && (
        <>
          <div className="w-px h-5 bg-slate-700/60 mx-0.5" />
          <div className="flex items-center gap-0.5 bg-slate-800/60 rounded p-0.5">
            <button
              onClick={() => onSetMeasureMode('distance')}
              title={t.measureModeDistance}
              className={`h-7 px-2 flex items-center justify-center rounded text-[10px] font-mono transition-colors ${
                measureMode === 'distance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {t.measureModeDistance}
            </button>
            <button
              onClick={() => onSetMeasureMode('area')}
              title={t.measureModeArea}
              className={`h-7 px-2 flex items-center justify-center rounded text-[10px] font-mono transition-colors ${
                measureMode === 'area'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {t.measureModeArea}
            </button>
          </div>
        </>
      )}

      <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
            canUndo ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60' : 'text-slate-700 cursor-default'
          }`}
        >↩</button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
            canRedo ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60' : 'text-slate-700 cursor-default'
          }`}
        >↪</button>
      </div>

      <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

      <span className="hidden sm:block text-[10px] text-slate-500 font-mono uppercase tracking-wider select-none">
        {toolLabels[effectiveTool]}
      </span>

      {activeTool !== 'pointer' && activeTool !== 'hand' && effectiveTool === activeTool && (
        <span className="hidden md:block text-[9px] text-slate-600 font-mono select-none">
          {toolHints[activeTool] ?? t.toolHint}
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

      <div className="flex items-center gap-1">
        <button
          onClick={onExport}
          title="Exportar PNG"
          className="h-7 px-3 rounded text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors font-mono uppercase tracking-widest"
        >
          PNG
        </button>
        <button
          onClick={onExportPDF}
          title="Exportar PDF"
          className="h-7 px-3 rounded text-[10px] font-semibold text-white bg-indigo-700 hover:bg-indigo-600 border border-indigo-500/60 transition-colors font-mono uppercase tracking-widest"
        >
          PDF
        </button>
      </div>
    </div>
  )
}