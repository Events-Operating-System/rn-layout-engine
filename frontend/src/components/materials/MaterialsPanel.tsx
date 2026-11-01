// "Lista de materiales" (versión simple de L1, pedido de Javier 2026-11-01):
// cuenta las piezas del plano por tipo + variante; cada línea tiene origen
// (propio / tercero) y nota, que se guardan con el plano y sus versiones.
// Se compara con otra versión guardada y se exporta a PDF y Excel.
// No toca Inventarios ni Ventas.
import { useEffect, useMemo, useState } from 'react'
import { useLang, getAssetName } from '@/context/LangContext'
import type { LayoutElement, LayoutMeta, MaterialLineMeta, MaterialOrigin } from '@/types/layout'
import { materialLines, diffLines, originOf, mergeVocab, type MaterialLine, type Vocab } from '@/lib/materials'
import { layoutService, type LayoutVersionSummary } from '@/lib/layoutService'
import { materialsFileName } from '@/lib/layoutVersion'
import { buildMaterialsPdf, buildMaterialsXlsx, downloadBlob, type MaterialRow, type MaterialsDoc } from './exportMaterials'

interface Props {
  elements: LayoutElement[]
  meta: LayoutMeta
  versionNumber: number
  layoutId: string | null
  vocab: Vocab
  readOnly: boolean
  onSetLine: (key: string, value: MaterialLineMeta | undefined) => void
  onClose: () => void
}

const KIND_LABEL: Record<string, string> = {
  table: 'h3dTable', chair: 'h3dChair', stage: 'h3dStage', dance: 'h3dDance', bar: 'h3dBar', screen: 'h3dScreen', wall: 'h3dWall',
  tent: 'h3dTent', service: 'h3dService', barrier: 'h3dBarrier', truss: 'h3dTruss', vehicle: 'h3dVehicle', other: 'h3dOther', floor: 'h3dFloor', tree: 'h3dTree',
  cloth: 'sCloth',
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()

export default function MaterialsPanel({ elements, meta, versionNumber, layoutId, vocab, readOnly, onSetLine, onClose }: Props) {
  const { t, lang } = useLang()
  const allVocab = useMemo(() => mergeVocab(vocab, elements), [vocab, elements])
  const lines = useMemo(() => materialLines(elements, allVocab), [elements, allVocab])
  const [versions, setVersions] = useState<LayoutVersionSummary[]>([])
  const [compareWith, setCompareWith] = useState<number | null>(null)
  const [prevLines, setPrevLines] = useState<MaterialLine[] | null>(null)
  const [loadError, setLoadError] = useState(false)

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

  const label = (l: MaterialLine) => String(t[KIND_LABEL[l.kind] as keyof typeof t] ?? l.kind)
  const unit = (l: MaterialLine) => (l.unit === 'm2' ? 'm²' : l.unit === 'm' ? 'm' : t.matUnitPieces)
  const detail = (l: MaterialLine) => [l.name ? getAssetName(lang, l.name) : '', ...l.variant].filter(Boolean).join(' · ') + (l.unit !== 'u' && l.pieces > 1 ? ` (${l.pieces} ${t.matPieces})` : '')
  const changeText = (key: string, qty: number) => {
    if (!diff) return undefined
    const prevHad = prevLines?.some(p => p.key === key)
    if (!prevHad) return t.matNew
    const d = diff.byKey.get(key) ?? 0
    return d === 0 ? '' : d > 0 ? `+${fmt(d)}` : `−${fmt(Math.abs(d))}`
  }
  const originLabel = (o: MaterialOrigin) => (o === 'third' ? t.matThird : t.matOwn)

  const rows: MaterialRow[] = [
    ...lines.map(l => {
      const o = originOf(meta.materials, l.key)
      return { type: label(l), detail: detail(l), qty: fmt(l.qty), unit: unit(l), origin: originLabel(o.origin), note: o.note ?? '', change: changeText(l.key, l.qty) }
    }),
    ...(diff?.removed ?? []).map(l => ({ type: label(l), detail: detail(l), qty: '0', unit: unit(l), origin: '', note: '', change: `−${fmt(l.qty)} (${t.matRemoved})`, removed: true })),
  ]

  const docData = (): MaterialsDoc => ({
    title: t.matTitle,
    headers: { type: t.matType, detail: t.matDetail, qty: t.matQty, unit: t.matUnit, origin: t.matOrigin, note: t.matNote, ...(diff ? { change: t.matChange.replace('{v}', String(compareWith)) } : {}) },
    rows, meta, versionNumber,
  })

  const setOrigin = (key: string, patch: Partial<MaterialLineMeta>) => {
    const cur = originOf(meta.materials, key)
    const next = { ...cur, ...patch }
    // Propio y sin nota es lo de siempre: no hace falta guardarlo.
    onSetLine(key, next.origin === 'own' && !next.note ? undefined : { origin: next.origin, ...(next.note ? { note: next.note } : {}) })
  }

  const cell = 'px-2 py-1.5 border-b border-slate-800 text-xs align-middle'
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mat-title" className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-700">
          <h3 id="mat-title" className="text-sm font-semibold text-slate-100">{t.matTitle}</h3>
          <span className="text-[11px] text-slate-500">{lines.length} {t.matLines} · v{versionNumber}</span>
          <div className="flex-1" />
          {layoutId && versions.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {t.matCompare}
              <select
                value={compareWith ?? ''}
                onChange={e => setCompareWith(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="">{t.matCompareNone}</option>
                {versions.map(v => <option key={v.version_number} value={v.version_number}>v{v.version_number}</option>)}
              </select>
            </label>
          )}
          <button
            onClick={() => { const d = buildMaterialsPdf(docData()); d.save(materialsFileName(meta.proyecto, versionNumber, 'pdf')) }}
            disabled={!rows.length}
            className="h-7 px-3 rounded text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40"
          >PDF</button>
          <button
            onClick={() => downloadBlob(buildMaterialsXlsx(docData()), materialsFileName(meta.proyecto, versionNumber, 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            disabled={!rows.length}
            className="h-7 px-3 rounded text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40"
          >Excel</button>
          <button onClick={onClose} className="h-7 px-3 rounded text-xs text-slate-400 hover:text-slate-200">{t.view3dClose}</button>
        </div>
        <div className="overflow-auto">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t.matEmpty}</p>
          ) : (
            <table className="w-full text-slate-200">
              <thead className="sticky top-0 bg-slate-900">
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
                {lines.map(l => {
                  const o = originOf(meta.materials, l.key)
                  const ch = changeText(l.key, l.qty)
                  return (
                    <tr key={l.key}>
                      <td className={cell}>{label(l)}</td>
                      <td className={cell}>{detail(l) || '—'}</td>
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
                        <NoteInput value={o.note ?? ''} disabled={readOnly} placeholder={o.origin === 'third' ? t.matNotePhThird : t.matNotePh} onCommit={v => setOrigin(l.key, { note: v || undefined })} />
                      </td>
                      {diff && <td className={`${cell} text-right font-mono ${ch?.startsWith('+') || ch === t.matNew ? 'text-emerald-400' : ch?.startsWith('−') ? 'text-red-400' : 'text-slate-500'}`}>{ch}</td>}
                    </tr>
                  )
                })}
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
        </div>
        <p className="px-5 py-2.5 border-t border-slate-700 text-[10px] text-slate-500 leading-relaxed">
          {loadError ? t.matLoadError : t.matHint}
        </p>
      </div>
    </div>
  )
}

function NoteInput({ value, disabled, placeholder, onCommit }: { value: string; disabled: boolean; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  if (prev !== value) { setPrev(value); setDraft(value) }
  return (
    <input
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { const v = draft.replace(/\s+/g, ' ').trim(); if (v !== value) onCommit(v) }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-full min-w-[8rem] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 disabled:opacity-60"
    />
  )
}
