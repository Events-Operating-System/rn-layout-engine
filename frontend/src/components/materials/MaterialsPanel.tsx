// "Lista de materiales" (versión simple de L1, pedido de Javier 2026-11-01):
// cuenta las piezas del plano por tipo + variante, con subtotal por tipo y
// avisos de lo que falta definir. Cada línea tiene origen (propio / tercero,
// con proveedor del catálogo de la org o texto libre) que se guarda con el
// plano y sus versiones. Se compara con otra versión guardada y se exporta a
// PDF y Excel (todo, solo propio, solo terceros o un archivo por proveedor).
// No toca Inventarios ni Ventas (el catálogo de proveedores solo se lee).
import { useEffect, useMemo, useState } from 'react'
import { useLang, getAssetName } from '@/context/LangContext'
import type { LayoutElement, LayoutMeta, MaterialLineMeta, MaterialOrigin, PieceType } from '@/types/layout'
import {
  materialLines, diffLines, originOf, mergeVocab, subtotals, filterLines, providersIn, normKey,
  type MaterialLine, type MaterialFilter, type Vocab,
} from '@/lib/materials'
import { PIECE_TYPES } from '@/lib/heights3d'
import { layoutService, type LayoutVersionSummary } from '@/lib/layoutService'
import { materialsFileName } from '@/lib/layoutVersion'
import { useOrgProviders } from '@/hooks/useOrgProviders'
import { buildMaterialsPdf, buildMaterialsXlsx, downloadBlob, type MaterialRow, type MaterialsDoc } from './exportMaterials'

interface Props {
  elements: LayoutElement[]
  meta: LayoutMeta
  versionNumber: number
  layoutId: string | null
  orgId: string
  vocab: Vocab
  readOnly: boolean
  onSetLine: (key: string, value: MaterialLineMeta | undefined) => void
  // Elegir el tipo de las piezas de una línea "Otra pieza".
  onSetType: (ids: string[], type: PieceType) => void
  onClose: () => void
}

const KIND_LABEL: Record<string, string> = {
  table: 'h3dTable', chair: 'h3dChair', stage: 'h3dStage', dance: 'h3dDance', bar: 'h3dBar', screen: 'h3dScreen', wall: 'h3dWall',
  tent: 'h3dTent', service: 'h3dService', barrier: 'h3dBarrier', truss: 'h3dTruss', vehicle: 'h3dVehicle', lounge: 'h3dLounge',
  other: 'h3dOther', floor: 'h3dFloor', tree: 'h3dTree', cloth: 'sCloth',
}
// Plural para los subtotales ("Sillas: 34").
const KIND_PLURAL: Record<string, string> = { chair: 'matSubChairs', table: 'matSubTables', cloth: 'matSubCloths' }

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()

export default function MaterialsPanel({ elements, meta, versionNumber, layoutId, orgId, vocab, readOnly, onSetLine, onSetType, onClose }: Props) {
  const { t, lang } = useLang()
  const tt = (k: string) => String((t as unknown as Record<string, string>)[k] ?? k)
  const providers = useOrgProviders(orgId)
  const providerNames = useMemo(() => Object.fromEntries(providers.map(p => [p.id, p.name])), [providers])
  const allVocab = useMemo(() => mergeVocab(vocab, elements), [vocab, elements])
  const lines = useMemo(() => materialLines(elements, allVocab), [elements, allVocab])
  const [versions, setVersions] = useState<LayoutVersionSummary[]>([])
  const [compareWith, setCompareWith] = useState<number | null>(null)
  const [prevLines, setPrevLines] = useState<MaterialLine[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [exportMenu, setExportMenu] = useState<'pdf' | 'xlsx' | null>(null)

  // Versiones guardadas para comparar (por defecto, la anterior a la actual).
  useEffect(() => {
    if (!layoutId) return
    layoutService.listVersions(layoutId).then(vs => {
      setVersions(vs)
      const prev = vs.find(v => v.version_number === versionNumber - 1)
      if (prev) setCompareWith(prev.version_number)
    }).catch(() => setLoadError(true))
  }, [layoutId, versionNumber])

  useEffect(() => {
    setPrevLines(null)
    if (!layoutId || compareWith === null) return
    layoutService.getVersion(layoutId, compareWith)
      .then(v => setPrevLines(materialLines(v.elements ?? [], allVocab)))
      .catch(() => setLoadError(true))
  }, [layoutId, compareWith, allVocab])

  const diff = useMemo(() => (prevLines ? diffLines(lines, prevLines) : null), [lines, prevLines])
  const noChanges = !!diff && diff.removed.length === 0 && [...diff.byKey.values()].every(v => v === 0)

  // ── Textos de cada línea ──────────────────────────────────────────────
  const label = (l: MaterialLine) => tt(KIND_LABEL[l.kind] ?? l.kind)
  const unit = (l: { unit: string }) => (l.unit === 'm2' ? 'm²' : l.unit === 'm' ? 'm' : t.matUnitPieces)
  const detail = (l: MaterialLine) => {
    let parts: string[]
    if (l.undefinedCloth) parts = [t.matUndefined, ...l.variant]
    else if (l.kind === 'chair' && (l.missingType || l.missingColor)) {
      parts = l.missingType && l.missingColor ? [t.matNoTypeColor] : l.missingType ? [t.matNoType, ...l.variant] : [...l.variant, t.matNoColor]
    } else parts = [l.name ? getAssetName(lang, l.name) : '', ...l.variant]
    return parts.filter(Boolean).join(' · ') + (l.unit !== 'u' && l.pieces > 1 ? ` (${l.pieces} ${t.matPieces})` : '')
  }
  const isWarn = (l: MaterialLine) => !!l.undefinedCloth || (l.kind === 'chair' && !!(l.missingType || l.missingColor)) || l.kind === 'other'
  const changeText = (key: string) => {
    if (!diff) return undefined
    if (!prevLines?.some(p => p.key === key)) return t.matNew
    const d = diff.byKey.get(key) ?? 0
    return d === 0 ? '' : d > 0 ? `+${fmt(d)}` : `−${fmt(Math.abs(d))}`
  }
  const originText = (o: MaterialLineMeta) => (o.origin === 'third' ? t.matThird : t.matOwn)
  const noteText = (o: MaterialLineMeta) => (o.providerId ? providerNames[o.providerId] ?? o.note ?? '' : o.note ?? '')
  const subtotalText = (s: ReturnType<typeof subtotals>[number]) => {
    const name = KIND_PLURAL[s.kind] ? tt(KIND_PLURAL[s.kind]) : tt(KIND_LABEL[s.kind] ?? s.kind)
    const u = s.unit === 'u' ? '' : ` ${unit(s)}`
    return `${name}: ${fmt(s.qty)}${u}${s.undefinedQty ? ` + ${fmt(s.undefinedQty)} ${t.matUndefinedShort}` : ''}`
  }

  // Avisos de lo que falta definir.
  const undefCloths = lines.filter(l => l.undefinedCloth).reduce((a, l) => a + l.qty, 0)
  const undefChairs = lines.filter(l => l.kind === 'chair' && l.missingType && l.missingColor).reduce((a, l) => a + l.qty, 0)
  const otherPieces = lines.filter(l => l.kind === 'other').reduce((a, l) => a + l.pieces, 0)
  const notices = (forExport: boolean): string[] => [
    ...(diff && noChanges ? [t.matNoChanges.replace('{v}', String(compareWith))] : []),
    ...(undefCloths ? [t.matUndefinedCloths.replace('{n}', fmt(undefCloths))] : []),
    ...(undefChairs ? [t.matUndefinedChairs.replace('{n}', fmt(undefChairs))] : []),
    ...(!forExport && otherPieces ? [t.matOtherPieces.replace('{n}', String(otherPieces))] : []),
  ]

  // Filas (pantalla y export): grupo por tipo + subtotal + lo que ya no está.
  const buildRows = (src: MaterialLine[]): MaterialRow[] => {
    const rows: MaterialRow[] = []
    const subs = subtotals(src)
    for (const s of subs) {
      for (const l of src.filter(x => x.kind === s.kind)) {
        const o = originOf(meta.materials, l.key)
        rows.push({ type: label(l), detail: detail(l), qty: fmt(l.qty), unit: unit(l), origin: originText(o), note: noteText(o), change: changeText(l.key), warn: isWarn(l) })
      }
      rows.push({ type: '', detail: subtotalText(s), qty: '', unit: '', origin: '', note: '', subtotal: true })
    }
    for (const l of diff?.removed ?? []) rows.push({ type: label(l), detail: detail(l), qty: '0', unit: unit(l), origin: '', note: '', change: `−${fmt(l.qty)} (${t.matRemoved})`, removed: true })
    return rows
  }

  const title = (provider?: string) => `${t.matTitle} — ${meta.proyecto || 'Layout'} · v${versionNumber}${provider ? ` · ${provider}` : ''}`
  const docFor = (src: MaterialLine[], provider?: string): MaterialsDoc => ({
    title: title(provider),
    headers: { type: t.matType, detail: t.matDetail, qty: t.matQty, unit: t.matUnit, origin: t.matOrigin, note: t.matNote, ...(diff ? { change: t.matChange.replace('{v}', String(compareWith)) } : {}) },
    rows: buildRows(src), meta, versionNumber, notices: notices(true),
  })

  const doExport = (kind: 'pdf' | 'xlsx', f: MaterialFilter) => {
    setExportMenu(null)
    const save = (d: MaterialsDoc, suffix?: string) => {
      if (kind === 'pdf') buildMaterialsPdf(d).save(materialsFileName(meta.proyecto, versionNumber, 'pdf', suffix))
      else downloadBlob(buildMaterialsXlsx(d), materialsFileName(meta.proyecto, versionNumber, 'xlsx', suffix), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    }
    if (f.mode === 'provider') {
      // Un archivo por proveedor, con su nombre en el título.
      providersIn(lines, meta.materials, providerNames).forEach((p, i) => {
        const name = p.name || t.matNoProvider
        setTimeout(() => save(docFor(filterLines(lines, meta.materials, { mode: 'provider', key: p.key }), name), name), i * 400)
      })
      return
    }
    const suffix = f.mode === 'own' ? t.matOnlyOwn : f.mode === 'third' ? t.matOnlyThird : undefined
    save(docFor(filterLines(lines, meta.materials, f), suffix), suffix)
  }

  const setOrigin = (key: string, patch: Partial<MaterialLineMeta>) => {
    const cur = originOf(meta.materials, key)
    const next = { ...cur, ...patch }
    if (next.origin === 'own') delete next.providerId
    // Propio y sin nota es lo de siempre: no hace falta guardarlo.
    onSetLine(key, next.origin === 'own' && !next.note ? undefined : { origin: next.origin, ...(next.note ? { note: next.note } : {}), ...(next.providerId ? { providerId: next.providerId } : {}) })
  }
  // Nota de un tercero: si coincide con un proveedor del catálogo, se guarda
  // ese proveedor; si no, texto libre.
  const commitNote = (key: string, origin: MaterialOrigin, v: string) => {
    const hit = origin === 'third' ? providers.find(p => normKey(p.name) === normKey(v)) : undefined
    setOrigin(key, hit ? { note: hit.name, providerId: hit.id } : { note: v || undefined, providerId: undefined })
  }

  const thirdProviders = providersIn(lines, meta.materials, providerNames)
  const rowsView = buildRows(lines)
  const cell = 'px-2 py-1.5 border-b border-slate-800 text-xs align-middle'
  const btn = 'h-7 px-3 rounded text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40'
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { if (exportMenu) setExportMenu(null); else onClose() } }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mat-title" className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-700">
          <h3 id="mat-title" className="text-sm font-semibold text-slate-100 truncate">{title()}</h3>
          <span className="text-[11px] text-slate-500">{lines.length} {t.matLines}</span>
          <div className="flex-1" />
          {layoutId && versions.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {t.matCompare}
              <select value={compareWith ?? ''} onChange={e => setCompareWith(e.target.value ? Number(e.target.value) : null)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
                <option value="">{t.matCompareNone}</option>
                {versions.map(v => <option key={v.version_number} value={v.version_number}>v{v.version_number}</option>)}
              </select>
            </label>
          )}
          <div className="relative flex gap-2">
            <button onClick={() => setExportMenu(m => (m === 'pdf' ? null : 'pdf'))} disabled={!lines.length} className={btn} aria-expanded={exportMenu === 'pdf'}>PDF ▾</button>
            <button onClick={() => setExportMenu(m => (m === 'xlsx' ? null : 'xlsx'))} disabled={!lines.length} className={btn} aria-expanded={exportMenu === 'xlsx'}>Excel ▾</button>
            {exportMenu && (
              <div role="menu" className="absolute right-0 top-full mt-1 z-10 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1">
                {([
                  [t.matExportAll, { mode: 'all' }],
                  [t.matOnlyOwn, { mode: 'own' }],
                  [t.matOnlyThird, { mode: 'third' }],
                ] as [string, MaterialFilter][]).map(([lbl, f]) => (
                  <button key={lbl} role="menuitem" onClick={() => doExport(exportMenu, f)} className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700">{lbl}</button>
                ))}
                <button
                  role="menuitem"
                  disabled={!thirdProviders.length}
                  onClick={() => doExport(exportMenu, { mode: 'provider', key: '' })}
                  className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  {t.matByProvider.replace('{n}', String(thirdProviders.length))}
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="h-7 px-3 rounded text-xs text-slate-400 hover:text-slate-200">{t.view3dClose}</button>
        </div>
        {notices(false).length > 0 && (
          <ul className="px-5 py-2 border-b border-slate-800 text-[11px] text-amber-300 space-y-0.5">
            {notices(false).map(n => <li key={n}>⚠ {n}</li>)}
          </ul>
        )}
        <div className="overflow-auto">
          {lines.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t.matEmpty}</p>
          ) : (
            <table className="w-full text-slate-200">
              <thead className="sticky top-0 bg-slate-900 z-[1]">
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 text-left">
                  <th className={cell}>{t.matType}</th>
                  <th className={cell}>{t.matDetail}</th>
                  <th className={`${cell} text-right`}>{t.matQty}</th>
                  <th className={cell}>{t.matUnit}</th>
                  <th className={cell}>{t.matOrigin}</th>
                  <th className={cell}>{t.matNote}</th>
                  {diff && <th className={`${cell} text-right`}>{t.matChange.replace('{v}', String(compareWith))}</th>}
                </tr>
              </thead>
              <tbody>
                {subtotals(lines).map(s => (
                  <GroupRows key={s.kind}>
                    {lines.filter(l => l.kind === s.kind).map(l => {
                      const o = originOf(meta.materials, l.key)
                      const ch = changeText(l.key)
                      const warn = isWarn(l)
                      return (
                        <tr key={l.key}>
                          <td className={cell}>{label(l)}</td>
                          <td className={`${cell} ${warn ? 'text-amber-300' : ''}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{detail(l) || '—'}</span>
                              {l.kind === 'other' && !readOnly && (
                                <select
                                  value=""
                                  onChange={e => e.target.value && onSetType(l.ids, e.target.value as PieceType)}
                                  aria-label={`${t.matChooseType} · ${detail(l)}`}
                                  className="bg-amber-950/40 border border-amber-700/60 rounded px-1.5 py-0.5 text-[11px] text-amber-200"
                                >
                                  <option value="">{t.matChooseType}</option>
                                  {PIECE_TYPES.filter(k => k !== 'other').map(k => <option key={k} value={k}>{label({ kind: k } as MaterialLine)}</option>)}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className={`${cell} text-right font-mono font-semibold`}>{fmt(l.qty)}</td>
                          <td className={cell}>{unit(l)}</td>
                          <td className={cell}>
                            <select
                              value={o.origin}
                              disabled={readOnly}
                              onChange={e => setOrigin(l.key, { origin: e.target.value as MaterialOrigin })}
                              aria-label={`${t.matOrigin} · ${label(l)} ${detail(l)}`}
                              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 disabled:opacity-60"
                            >
                              <option value="own">{t.matOwn}</option>
                              <option value="third">{t.matThird}</option>
                            </select>
                          </td>
                          <td className={cell}>
                            <NoteInput
                              value={noteText(o)}
                              disabled={readOnly}
                              listId={o.origin === 'third' ? 'mat-providers' : undefined}
                              placeholder={o.origin === 'third' ? t.matNotePhThird : t.matNotePh}
                              onCommit={v => commitNote(l.key, o.origin, v)}
                            />
                            {o.providerId && <span className="ml-1 text-[10px] text-emerald-400" title={t.matFromCatalog}>✓</span>}
                          </td>
                          {diff && <td className={`${cell} text-right font-mono ${ch?.startsWith('+') || ch === t.matNew ? 'text-emerald-400' : ch?.startsWith('−') ? 'text-red-400' : 'text-slate-500'}`}>{ch}</td>}
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-800/50">
                      <td className={cell} />
                      <td className={`${cell} font-semibold text-slate-100`} colSpan={diff ? 6 : 5}>{subtotalText(s)}</td>
                    </tr>
                  </GroupRows>
                ))}
                {diff?.removed.map(l => (
                  <tr key={`x-${l.key}`} className="text-slate-500">
                    <td className={cell}>{label(l)}</td>
                    <td className={cell}>{detail(l) || '—'}</td>
                    <td className={`${cell} text-right font-mono`}>0</td>
                    <td className={cell}>{unit(l)}</td>
                    <td className={cell} />
                    <td className={cell} />
                    <td className={`${cell} text-right font-mono text-red-400`}>−{fmt(l.qty)} ({t.matRemoved})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <datalist id="mat-providers">{providers.map(p => <option key={p.id} value={p.name} />)}</datalist>
        </div>
        <p className="px-5 py-2.5 border-t border-slate-700 text-[10px] text-slate-500 leading-relaxed">
          {loadError ? t.matLoadError : t.matHint}
          {rowsView.length > 0 && !loadError && providers.length === 0 ? ` ${t.matNoCatalog}` : ''}
        </p>
      </div>
    </div>
  )
}

function GroupRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function NoteInput({ value, disabled, placeholder, listId, onCommit }: { value: string; disabled: boolean; placeholder: string; listId?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  if (prev !== value) { setPrev(value); setDraft(value) }
  return (
    <input
      value={draft}
      list={listId}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { const v = draft.replace(/\s+/g, ' ').trim(); if (v !== value) onCommit(v) }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-[calc(100%-1rem)] min-w-[8rem] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 disabled:opacity-60"
    />
  )
}
