import { useMemo, useState } from 'react'
import { CATEGORY_COLORS } from '@/types/layout'
import type { LayoutSettings } from '@/lib/layoutSettings'
import { DEFAULT_LAYOUT_SETTINGS } from '@/lib/layoutSettings'
import { roundTableWithChairs, rectTableWithChairs, rectTableSeats, CHAIR_NAME } from '@/lib/seating'
import type { AssetCategory, AssetTemplate, GroupChild } from '@/types/layout'
import { useLang, getCategoryLabel, getAssetName } from '@/context/LangContext'
import type { CustomAsset } from '@/lib/assetService'
import type { LayoutElement } from '@/types/layout'

interface AssetLibraryPanelProps {
  onAddElement: (template: AssetTemplate) => void
  onAddGroup: (children: GroupChild[]) => void
  customAssets: CustomAsset[]
  selectedElement: LayoutElement | null
  onSaveAsAsset: (element: LayoutElement) => void
  onDeleteAsset: (id: string) => Promise<void>
  // Medidas de mesas y sillas de la org (organizations.settings.layout).
  settings?: LayoutSettings
  // Biblioteca de la org (bloque 6).
  userId: string
  canShare: boolean
  onSetShared: (id: string, shared: boolean) => Promise<void>
  onSaveTemplate: () => void
  onUseTemplate: (asset: CustomAsset) => void
}

// Mesas y silla del catálogo con las medidas de la org.
function withOrgSizes(templates: AssetTemplate[], s: LayoutSettings): AssetTemplate[] {
  const out: AssetTemplate[] = []
  for (const tpl of templates) {
    if (tpl.name === 'Round Table 8') {
      // La silla va primero en Asientos: es la pieza que más se usa.
      out.push({ name: CHAIR_NAME, category: 'seating', defaultWidth: s.chairSize, defaultHeight: s.chairSize, shape: 'rounded-rect', defaultColor: '#d97706', seats: 1 })
      out.push({ ...tpl, defaultWidth: s.tableRound8, defaultHeight: s.tableRound8 })
    } else if (tpl.name === 'Round Table 10') {
      out.push({ ...tpl, defaultWidth: s.tableRound10, defaultHeight: s.tableRound10 })
      out.push({ name: 'Round Table 12', category: 'seating', defaultWidth: s.tableRound12, defaultHeight: s.tableRound12, shape: 'circle' })
    } else if (tpl.name === 'Rect Table') out.push({ ...tpl, defaultWidth: s.tableRectLength, defaultHeight: s.tableRectWidth })
    else out.push(tpl)
  }
  return out
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
  onAddElement, onAddGroup, customAssets, selectedElement, onSaveAsAsset, onDeleteAsset,
  settings = DEFAULT_LAYOUT_SETTINGS,
  userId, canShare, onSetShared, onSaveTemplate, onUseTemplate,
}: AssetLibraryPanelProps) {
  const { t, lang } = useLang()
  const [libError, setLibError] = useState<string | null>(null)
  const orgShared = customAssets.filter(a => a.shared && a.kind !== 'template')
  const templatesList = customAssets.filter(a => a.kind === 'template')
  const mine = customAssets.filter(a => !a.shared && a.kind !== 'template' && a.created_by === userId)

  async function run(fn: () => Promise<void>) {
    setLibError(null)
    try { await fn() } catch { setLibError(t.libNoPermission) }
  }
  const templates = useMemo(() => withOrgSizes(ASSET_TEMPLATES, settings), [settings])
  // Mesas que se colocan con sus sillas alrededor (un grupo: mesa + sillas).
  const tableSets = useMemo(() => [
    { key: 'r8', label: getAssetName(lang, 'Round Table 8'), seats: 8, build: () => roundTableWithChairs(8, settings) },
    { key: 'r10', label: getAssetName(lang, 'Round Table 10'), seats: 10, build: () => roundTableWithChairs(10, settings) },
    { key: 'r12', label: getAssetName(lang, 'Round Table 12'), seats: 12, build: () => roundTableWithChairs(12, settings) },
    { key: 'rect', label: getAssetName(lang, 'Rect Table'), seats: rectTableSeats(settings), build: () => rectTableWithChairs(settings) },
  ], [settings, lang])

  function handleAddCustomAsset(asset: CustomAsset) {
    if (asset.kind === 'group' && asset.children?.length) {
      onAddGroup(asset.children)
      return
    }
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
          const assets = templates.filter(a => a.category === category)
          return (
            <div key={category}>
            <div className="px-3 py-2">
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
            {category === 'seating' && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: CATEGORY_COLORS.seating }} />
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{t.tablesWithChairs}</span>
                </div>
                <div className="space-y-0.5">
                  {tableSets.map(set => (
                    <div
                      key={set.key}
                      onClick={() => onAddGroup(set.build())}
                      className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer group transition-colors"
                    >
                      <span className="truncate">{set.label}</span>
                      <span className="text-slate-600 text-[9px] font-mono ml-1 flex-none group-hover:text-slate-500">
                        {set.seats} {t.chairsUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )
        })}

        {libError && <p className="mx-3 mt-2 text-[10px] text-amber-400">{libError}</p>}

        {/* Biblioteca de la org: lo que alguien con "Compartir" publicó */}
        <LibSection title={t.libOrg} dot="bg-emerald-400">
          {orgShared.length === 0 ? (
            <p className="text-[9px] text-slate-600 px-2 leading-relaxed">{t.libOrgEmpty}</p>
          ) : orgShared.map(asset => (
            <AssetRow
              key={asset.id}
              asset={asset}
              mine={asset.created_by === userId}
              onClick={() => handleAddCustomAsset(asset)}
              onUnshare={canShare ? () => run(() => onSetShared(asset.id, false)) : undefined}
              onDelete={canShare ? () => run(() => onDeleteAsset(asset.id)) : undefined}
            />
          ))}
        </LibSection>

        {/* Plantillas de plano */}
        <LibSection
          title={t.libTemplates}
          dot="bg-sky-400"
          action={<PlusButton title={t.libSaveTemplate} onClick={onSaveTemplate} />}
        >
          {templatesList.length === 0 ? (
            <p className="text-[9px] text-slate-600 px-2 leading-relaxed">{t.libTemplatesEmpty}</p>
          ) : templatesList.map(asset => {
            const own = asset.created_by === userId
            return (
              <AssetRow
                key={asset.id}
                asset={asset}
                mine={own}
                onClick={() => onUseTemplate(asset)}
                onShare={canShare && own && !asset.shared ? () => run(() => onSetShared(asset.id, true)) : undefined}
                onUnshare={canShare && asset.shared ? () => run(() => onSetShared(asset.id, false)) : undefined}
                onDelete={(own && !asset.shared) || (asset.shared && canShare) ? () => run(() => onDeleteAsset(asset.id)) : undefined}
              />
            )
          })}
        </LibSection>

        {/* Mis assets: personales (solo los ve quien los creó) */}
        <LibSection
          title={t.libMine}
          dot="bg-indigo-400"
          action={selectedElement ? <PlusButton title={t.libSaveSelected} onClick={() => onSaveAsAsset(selectedElement)} /> : undefined}
        >
          {mine.length === 0 ? (
            <p className="text-[9px] text-slate-600 px-2 leading-relaxed">{t.libMineEmpty}</p>
          ) : mine.map(asset => (
            <AssetRow
              key={asset.id}
              asset={asset}
              mine
              onClick={() => handleAddCustomAsset(asset)}
              onShare={canShare ? () => run(() => onSetShared(asset.id, true)) : undefined}
              onDelete={() => run(() => onDeleteAsset(asset.id))}
            />
          ))}
        </LibSection>
      </div>

      <div className="px-4 py-2 border-t border-slate-700/60 flex-none">
        <p className="text-[9px] text-slate-600">{t.libraryHint}</p>
      </div>
    </aside>
  )
}

function LibSection({ title, dot, action, children }: { title: string; dot: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-t border-slate-700/60 mt-1">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm flex-none ${dot}`} />
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{title}</span>
        </div>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function PlusButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="text-indigo-400 hover:text-indigo-300 transition-colors">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

function AssetRow({ asset, mine, onClick, onShare, onUnshare, onDelete }: {
  asset: CustomAsset
  mine: boolean
  onClick: () => void
  onShare?: () => void
  onUnshare?: () => void
  onDelete?: () => void
}) {
  const { t } = useLang()
  const count = asset.kind === 'group' ? asset.children?.length ?? 0
    : asset.kind === 'template' ? (asset.payload?.elements?.length ?? 0) : 0
  const iconBtn = 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-500 transition-all p-0.5 text-[10px] leading-none'
  return (
    <div
      className="group flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer transition-colors"
      onClick={onClick}
      title={asset.kind === 'template' ? t.libUseTemplate : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-sm flex-none" style={{ backgroundColor: asset.default_color ?? '#6366f1' }} />
        <span className="truncate">
          {asset.name}
          {count > 0 && <span className="text-slate-500"> ({count} {t.libPieces})</span>}
          {asset.shared && asset.kind === 'template' && <span className="text-emerald-500"> · {t.libOrgBadge}</span>}
          {asset.shared && mine && asset.kind !== 'template' && <span className="text-slate-500"> · {t.libMineBadge}</span>}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-none">
        {asset.kind !== 'template' && (
          <span className="text-slate-600 text-[9px] font-mono">{asset.default_width}×{asset.default_height}</span>
        )}
        {onShare && (
          <button onClick={e => { e.stopPropagation(); onShare() }} title={t.libShare} aria-label={t.libShare} className={`${iconBtn} hover:text-emerald-400`}>⇪</button>
        )}
        {onUnshare && (
          <button onClick={e => { e.stopPropagation(); onUnshare() }} title={t.libUnshare} aria-label={t.libUnshare} className={`${iconBtn} hover:text-amber-400`}>⇩</button>
        )}
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete() }} title={t.libDelete} aria-label={t.libDelete} className={`${iconBtn} hover:text-red-400`}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M4.5 3V2h3v1M4 4.5l.5 5M8 4.5l-.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
