import LayoutEditor from '@/components/LayoutEditor'

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <header className="h-10 flex-none bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            RN Layout Engine
          </span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-xs text-slate-500">Playground</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[9px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900 font-medium tracking-wider uppercase">
            MVP
          </span>
          <span className="text-[9px] text-slate-600">Reality Near · Events Operating System</span>
        </div>
      </header>

      <LayoutEditor />

      <footer className="h-10 flex-none bg-slate-900 border-t border-slate-700/60 flex items-center px-4 gap-6 overflow-hidden">
        <LegendInline />
        <div className="flex items-center gap-5 text-[9px] text-slate-600 ml-auto flex-none">
          <span>Scroll → Zoom</span>
          <span>Drag canvas → Pan</span>
          <span>Click element → Select</span>
          <span>Drag element → Move</span>
        </div>
      </footer>
    </div>
  )
}

function LegendInline() {
  const items = [
    { label: 'Stage',       color: '#6366f1' },
    { label: 'Structure',   color: '#0891b2' },
    { label: 'Seating',     color: '#f59e0b' },
    { label: 'Barrier',     color: '#ef4444' },
    { label: 'Utility',     color: '#22c55e' },
    { label: 'Circulation', color: '#a855f7' },
  ] as const

  return (
    <div className="flex items-center gap-4">
      <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest flex-none">
        Legend
      </span>
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5 flex-none">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-[10px] text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  )
}
