import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/layout'
import type { AssetCategory } from '@/types/layout'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AssetCategory[]

export default function LegendPanel() {
  return (
    <footer className="h-10 flex-none bg-slate-900 border-t border-slate-700/60 flex items-center px-4 gap-6 overflow-hidden">
      <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest flex-none">
        Legend
      </span>

      <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
        {CATEGORIES.map(cat => (
          <div key={cat} className="flex items-center gap-1.5 flex-none">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-none"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            <span className="text-[10px] text-slate-500">{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-5 text-[9px] text-slate-600 flex-none">
        <span>Scroll → Zoom</span>
        <span>Drag canvas → Pan</span>
        <span>Click element → Select</span>
        <span>Drag element → Move</span>
      </div>
    </footer>
  )
}
