import { useEffect, useRef } from 'react'
import LayoutEditor from '@/components/LayoutEditor'

// ── DEBUG-0014: React render + layout diagnostic ──────────────────────────────
// Inline styles only — works regardless of Tailwind/CSS state.
// Remove after iPhone diagnosis is confirmed fixed.
function DebugOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.getElementById('root')!
    const rootRect = root.getBoundingClientRect()
    const appEl = root.firstElementChild as HTMLElement | null
    const appRect = appEl?.getBoundingClientRect()
    el.textContent = [
      'React OK',
      `root:${Math.round(rootRect.width)}×${Math.round(rootRect.height)}`,
      `app:${appRect ? `${Math.round(appRect.width)}×${Math.round(appRect.height)}` : 'null'}`,
      `scroll:${document.documentElement.scrollHeight}`,
    ].join(' | ')
    // Update JS debug bar to show React mounted
    const jsBar = document.getElementById('__dbg_js')
    if (jsBar) jsBar.style.background = '#f59e0b'
  }, [])
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 20,
        left: 0,
        right: 0,
        background: '#3b82f6',
        color: '#fff',
        padding: '6px 10px',
        zIndex: 999999,
        fontSize: 11,
        fontFamily: 'monospace',
        wordBreak: 'break-all',
        lineHeight: 1.4,
      }}
    >
      React mounting...
    </div>
  )
}

export default function App() {
  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
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

      <DebugOverlay />
      <LayoutEditor />

      <footer className="h-10 flex-none bg-slate-900 border-t border-slate-700/60 flex items-center px-4 gap-6 overflow-hidden">
        <LegendInline />
        <div className="hidden sm:flex items-center gap-5 text-[9px] text-slate-600 ml-auto flex-none">
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
