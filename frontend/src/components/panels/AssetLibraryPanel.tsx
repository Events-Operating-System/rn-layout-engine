import { CATEGORY_COLORS } from '@/types/layout'
import type { AssetCategory, AssetTemplate } from '@/types/layout'
import { useLang, getCategoryLabel, getAssetName } from '@/context/LangContext'
import type { CustomAsset } from '@/lib/assetService'
import type { LayoutElement } from '@/types/layout'

interface AssetLibraryPanelProps {
  onAddElement: (template: AssetTemplate) => void
  customAssets: CustomAsset[]
  selectedElement: LayoutElement | null
  onSaveAsAsset: (element: LayoutElement) => void
  onDeleteAsset: (id: string) => void
}

const ASSET_TEMPLATES: AssetTemplate[] = [
  // Stage
  { name: 'Main Stage',       category: 'stage',       defaultWidth: 20,  defaultHeight: 12  },
  { name: 'Secondary Stage',  category: 'stage',       defaultWidth: 10,  defaultHeight: 8   },
  { name: 'Dance Floor',      category: 'stage',       defaultWidth: 10,  defaultHeight: 10  },
  { name: 'LED Wall',         category: 'stage',       defaultWidth: 8,   defaultHeight: 3   },
  { name: 'Screen',           category: 'stage',       defaultWidth: 4,   defaultHeight: 3   },
  { name: 'DJ Booth PRO',     category: 'stage',       defaultWidth: 4,   defaultHeight: 3   },
  { name: 'DJ Booth',         category: 'stage',       defaultWidth: 3,   defaultHeight: 2   },
  { name: 'Podium',           category: 'stage',       defaultWidth: 1.2, defaultHeight: 0.8 },
  // Structure
  { name: 'Tent 10×10',       category: 'structure',   defaultWidth: 10,  defaultHeight: 10  },
  { name: 'Tent 20×20',       category: 'structure',   defaultWidth: 20,  defaultHeight: 20  },
  { name: 'Tent 20×40',       category: 'structure',   defaultWidth: 40,  defaultHeight: 20  },
  { name: 'Marquee',          category: 'structure',   defaultWidth: 30,  defaultHeight: 15  },
  { name: 'Bar',              category: 'structure',   defaultWidth: 5,   defaultHeight: 2   },
  { name: 'Buffet',           category: 'structure',   defaultWidth: 8,   defaultHeight: 2   },
  { name: 'Lounge',           category: 'structure',   defaultWidth: 6,   defaultHeight: 5   },
  { name: 'Backstage',        category: 'structure',   defaultWidth: 10,  defaultHeight: 6   },
  // Seating
  { name: 'Round Table 8',    category: 'seating',     defaultWidth: 1.5, defaultHeight: 1.5, shape: 'circle' },
  { name: 'Round Table 10',   category: 'seating',     defaultWidth: 1.8, defaultHeight: 1.8, shape: 'circle' },
  { name: 'Head Table',       category: 'seating',     defaultWidth: 4,   defaultHeight: 1.5 },
  { name: 'Rect Table',       category: 'seating',     defaultWidth: 2.4, defaultHeight: 0.75},
  { name: 'Chair Row Block',  category: 'seating',     defaultWidth: 5,   defaultHeight: 2   },
  { name: 'Bleacher Block',   category: 'seating',     defaultWidth: 10,  defaultHeight: 4   },
  // Barrier
  { name: 'Crowd Barrier',    category: 'barrier',     defaultWidth: 2.5, defaultHeight: 0.15},
  { name: 'Fence',            category: 'barrier',     defaultWidth: 10,  defaultHeight: 0.15},
  { name: 'Fence Panel',      category: 'barrier',     defaultWidth: 3,   defaultHeight: 2   },
  // Utility
  { name: 'Kitchen',          category: 'utility',     defaultWidth: 6,   defaultHeight: 4   },
  { name: 'Restrooms',        category: 'utility',     defaultWidth: 6,   defaultHeight: 3   },
  { name: 'Generator',        category: 'utility',     defaultWidth: 3,   defaultHeight: 1.5 },
  { name: 'First Aid',        category: 'utility',     defaultWidth: 4,   defaultHeight: 3   },
  // Circulation
  { name: 'Entrance',         category: 'circulation', defaultWidth: 6,   defaultHeight: 1   },
  { name: 'Entrance Gate',    category: 'circulation', defaultWidth: 4,   defaultHeight: 0.5 },
  { name: 'Exit Gate',        category: 'circulation', defaultWidth: 4,   defaultHeight: 0.5 },
  { name: 'Emergency Exit',   category: 'circulation', defaultWidth: 2,   defaultHeight: 0.5 },
  // Primitives
  { name: 'Rectangle',        category: 'primitive',   defaultWidth: 6,   defaultHeight: 4,  shape: 'rect'         },
  { name: 'Circle',           category: 'primitive',   defaultWidth: 4,   defaultHeight: 4,  shape: 'circle'       },
  { name: 'Oval',             category: 'primitive',   defaultWidth: 8,   defaultHeight: 5,  shape: 'oval'         },
  { name: 'Rounded Box',      category: 'primitive',   defaultWidth: 6,   defaultHeight: 4,  shape: 'rounded-rect' },
  { name: 'Tree',             category: 'primitive',   defaultWidth: 3,   defaultHeight: 3,  shape: 'tree',        defaultColor: '#16a34a' },
  { name: 'Square',           category: 'primitive',   defaultWidth: 4,   defaultHeight: 4,  shape: 'rect'         },
]

const CATEGORY_ORDER: AssetCategory[] = [
  'stage', 'structure', 'seating', 'barrier', 'utility', 'circulation', 'primitive',
]

export default function AssetLibraryPanel({
  onAddElement, customAssets, selectedElement, onSaveAsAsset, onDeleteAsset
}: AssetLibraryPanelProps) {
  const { t, lang } = useLang()

  function handleAddCustomAsset(asset: CustomAsset) {
    onAddElement({
      name: asset.name,
      category: asset.category as AssetCategory,
      defaultWidth: asset.default_width,
      defaultHeight: asset.default_height,
      defaultColor: asset.default_color,
      shape: asset.shape as AssetTemplate['shape'],
      points: asset.shape === 'polygon' && asset.points ? asset.points : undefined,
    })
  }

  return (
    <aside className="w-56 flex-none bg-slate-900 border-r border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex-none">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {t.libraryTitle}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* Sistema */}
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
                  {getCategoryLabel(t, category)}
                </span>
              </div>
              <div className="space-y-0.5">
                {assets.map(asset => (
                  <div
                    key={asset.name}
                    onClick={() => onAddElement(asset)}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer group transition-colors"
                  >
                    <span className="truncate">{getAssetName(lang, asset.name)}</span>
                    <span className="text-slate-600 text-[9px] font-mono ml-1 flex-none group-hover:text-slate-500">
                      {asset.defaultWidth}×{asset.defaultHeight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Mis Assets */}
        <div className="px-3 py-2 border-t border-slate-700/60 mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm flex-none bg-indigo-400" />
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                Mis Assets
              </span>
            </div>
            {selectedElement && (
              <button
                onClick={() => onSaveAsAsset(selectedElement)}
                title="Guardar elemento seleccionado como asset"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {customAssets.length === 0 ? (
            <p className="text-[9px] text-slate-600 px-2 leading-relaxed">
              Selecciona un elemento y toca + para guardarlo.
            </p>
          ) : (
            <div className="space-y-0.5">
              {customAssets.map(asset => (
                <div
                  key={asset.id}
                  className="group flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer transition-colors"
                  onClick={() => handleAddCustomAsset(asset)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-sm flex-none"
                      style={{ backgroundColor: asset.default_color ?? '#6366f1' }}
                    />
                    <span className="truncate">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-none">
                    <span className="text-slate-600 text-[9px] font-mono">
                      {asset.default_width}×{asset.default_height}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteAsset(asset.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 3h8M4.5 3V2h3v1M4 4.5l.5 5M8 4.5l-.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-700/60 flex-none">
        <p className="text-[9px] text-slate-600">{t.libraryHint}</p>
      </div>
    </aside>
  )
}