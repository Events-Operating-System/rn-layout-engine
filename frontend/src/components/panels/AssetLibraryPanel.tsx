import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/layout'
import type { AssetCategory, AssetTemplate } from '@/types/layout'

const ASSET_TEMPLATES: AssetTemplate[] = [
  { name: 'Main Stage',       category: 'stage',       defaultWidth: 20,  defaultHeight: 12  },
  { name: 'Secondary Stage',  category: 'stage',       defaultWidth: 10,  defaultHeight: 8   },
  { name: 'Podium',           category: 'stage',       defaultWidth: 1.2, defaultHeight: 0.8 },
  { name: 'DJ Booth',         category: 'stage',       defaultWidth: 3,   defaultHeight: 2   },
  { name: 'Tent 10×10',       category: 'structure',   defaultWidth: 10,  defaultHeight: 10  },
  { name: 'Tent 20×20',       category: 'structure',   defaultWidth: 20,  defaultHeight: 20  },
  { name: 'Tent 20×40',       category: 'structure',   defaultWidth: 40,  defaultHeight: 20  },
  { name: 'Marquee',          category: 'structure',   defaultWidth: 30,  defaultHeight: 15  },
  { name: 'Round Table 8',    category: 'seating',     defaultWidth: 1.5, defaultHeight: 1.5 },
  { name: 'Round Table 10',   category: 'seating',     defaultWidth: 1.8, defaultHeight: 1.8 },
  { name: 'Rect Table',       category: 'seating',     defaultWidth: 2.4, defaultHeight: 0.75},
  { name: 'Chair Row Block',  category: 'seating',     defaultWidth: 5,   defaultHeight: 2   },
  { name: 'Bleacher Block',   category: 'seating',     defaultWidth: 10,  defaultHeight: 4   },
  { name: 'Crowd Barrier',    category: 'barrier',     defaultWidth: 2.5, defaultHeight: 0.15},
  { name: 'Fence Panel',      category: 'barrier',     defaultWidth: 3,   defaultHeight: 2   },
  { name: 'Generator',        category: 'utility',     defaultWidth: 3,   defaultHeight: 1.5 },
  { name: 'Restroom Block',   category: 'utility',     defaultWidth: 6,   defaultHeight: 3   },
  { name: 'First Aid',        category: 'utility',     defaultWidth: 4,   defaultHeight: 3   },
  { name: 'Entrance Gate',    category: 'circulation', defaultWidth: 4,   defaultHeight: 0.5 },
  { name: 'Exit Gate',        category: 'circulation', defaultWidth: 4,   defaultHeight: 0.5 },
  { name: 'Emergency Exit',   category: 'circulation', defaultWidth: 2,   defaultHeight: 0.5 },
]

const CATEGORY_ORDER: AssetCategory[] = [
  'stage', 'structure', 'seating', 'barrier', 'utility', 'circulation',
]

export default function AssetLibraryPanel() {
  return (
    <aside className="w-56 flex-none bg-slate-900 border-r border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex-none">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Asset Library
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {CATEGORY_ORDER.map(category => {
          const assets = ASSET_TEMPLATES.filter(a => a.category === category)
          return (
            <div key={category} className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-sm flex-none"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="space-y-0.5">
                {assets.map(asset => (
                  <div
                    key={asset.name}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer group transition-colors"
                  >
                    <span className="truncate">{asset.name}</span>
                    <span className="text-slate-600 text-[9px] font-mono ml-1 flex-none group-hover:text-slate-500">
                      {asset.defaultWidth}×{asset.defaultHeight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-2 border-t border-slate-700/60 flex-none">
        <p className="text-[9px] text-slate-600">Click to place on canvas</p>
      </div>
    </aside>
  )
}
