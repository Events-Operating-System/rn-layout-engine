import { useState } from 'react'
import type { LayoutElement, DrawingPrimitive, LayerId } from '@/types/layout'
import { LAYERS, layerOf } from '@/lib/layers'
import { useLang, getCategoryLabel, getAssetName } from '@/context/LangContext'
import { PIXELS_PER_METER } from '@/components/canvas/LayoutCanvas'
import { lengthMeters, angleDegrees, pointFromLengthAngle, elementAreaMeters, elementLengthMeters } from '@/lib/drawingMath'
import { sidesOf, sideInfo, withSegments, arcFromBulge, sagittaFromBulge, bulgeFromSagitta } from '@/lib/curves'
import type { Segment } from '@/types/layout'
import type { AlignMode } from '@/lib/arrange'

interface PropertiesPanelProps {
  element: LayoutElement | null
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  onDeleteElement: (id: string) => void
  onDuplicateElement: (id: string) => void
  selectedDrawing: DrawingPrimitive | null
  onUpdateDrawing: (id: string, updates: Partial<DrawingPrimitive>) => void
  onDeleteDrawing: (id: string) => void
  selectedIds: Set<string>
  onBringToFront: (ids: string[]) => void
  onSendToBack: (ids: string[]) => void
  onSaveGroupAsAsset: () => void
  onRotateGroup: (ids: string[], deltaDeg: number) => void
  onAlign: (ids: string[], mode: AlignMode) => void
  onDistribute: (ids: string[], axis: 'horizontal' | 'vertical') => void
  onRepeatGrid: (ids: string[], rows: number, cols: number, gap: number) => void
  // Separación por defecto entre copias (ajuste de la org table_spacing).
  defaultSpacing: number
  // Conjuntos: piezas de la selección que pertenecen a uno (mesa con sillas).
  groupedCount: number
  groupsCount: number
  onUngroup: (ids: string[]) => void
  // Planos viejos: agrupa las sillas sueltas con su mesa (sin selección).
  onGroupTablesWithChairs: () => { tables: number; chairs: number }
  // Capa de la selección (el conjunto entero de cada pieza).
  onSetLayer: (ids: string[], layer: LayerId) => void
  // Capa común de la selección múltiple, o null si hay varias.
  selectionLayer: LayerId | null
}

const COLOR_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#fbbf24', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#f8fafc', // white
  '#94a3b8', // gray
]

export default function PropertiesPanel({
  element, onUpdate, onDeleteElement, onDuplicateElement,
  selectedDrawing, onUpdateDrawing, onDeleteDrawing,
  selectedIds, onBringToFront, onSendToBack, onSaveGroupAsAsset, onRotateGroup,
  onAlign, onDistribute, onRepeatGrid, defaultSpacing,
  groupedCount, groupsCount, onUngroup, onGroupTablesWithChairs, onSetLayer, selectionLayer,
}: PropertiesPanelProps) {
  const { t } = useLang()
  const isMultiSelect = element === null && selectedDrawing === null && selectedIds.size > 1
  const hasSelection = element !== null || selectedDrawing !== null || isMultiSelect

  return (
    <aside className="w-60 flex-none bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex-none">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {t.propertiesTitle}
        </p>
      </div>

      {!hasSelection ? (
        <div className="flex-1 flex flex-col px-6">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              {t.selectHint}
            </p>
          </div>
          <GroupTablesTool onRun={onGroupTablesWithChairs} />
        </div>
      ) : selectedDrawing !== null ? (
        <DrawingProperties
          drawing={selectedDrawing}
          onUpdate={onUpdateDrawing}
          onDelete={onDeleteDrawing}
        />
      ) : element !== null ? (
        <>
        {groupedCount > 0 && <GroupSection count={groupedCount} groups={groupsCount} onUngroup={() => onUngroup([element.id])} />}
        <LayerSelect value={layerOf(element)} onChange={l => onSetLayer([element.id], l)} />
        <ElementProperties
          element={element}
          onUpdate={onUpdate}
          onDelete={onDeleteElement}
          onDuplicate={onDuplicateElement}
          onBringToFront={() => onBringToFront([element.id])}
          onSendToBack={() => onSendToBack([element.id])}
          onRepeatGrid={(rows, cols, gap) => onRepeatGrid([element.id], rows, cols, gap)}
          defaultSpacing={defaultSpacing}
        />
        </>
      ) : (
        <>
        {groupedCount > 0 && <GroupSection count={groupedCount} groups={groupsCount} onUngroup={() => onUngroup([...selectedIds])} />}
        <LayerSelect value={selectionLayer} onChange={l => onSetLayer([...selectedIds], l)} />
        <MultiSelectProperties
          count={selectedIds.size}
          onBringToFront={() => onBringToFront([...selectedIds])}
          onSendToBack={() => onSendToBack([...selectedIds])}
          onSaveAsAsset={onSaveGroupAsAsset}
          onRotate={(deltaDeg) => onRotateGroup([...selectedIds], deltaDeg)}
          onAlign={(mode) => onAlign([...selectedIds], mode)}
          onDistribute={(axis) => onDistribute([...selectedIds], axis)}
          onRepeatGrid={(rows, cols, gap) => onRepeatGrid([...selectedIds], rows, cols, gap)}
          defaultSpacing={defaultSpacing}
        />
        </>
      )}
    </aside>
  )
}

// Lados de una pieza con vértices (bloque 7): cada uno recto, en arco (con
// su flecha en metros: cuánto se separa el centro del arco de la cuerda) o
// curva libre. El largo y el radio se ven al lado.
const MAX_SIDES = 40
function SidesSection({ element, onUpdate }: {
  element: LayoutElement
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
}) {
  const { t } = useLang()
  const pts = element.points ?? []
  const closed = element.shape === 'polygon' ? true : !!element.closed
  const sides = sidesOf(pts, element.segments, closed)
  if (sides.length > MAX_SIDES) return null
  const info = sideInfo(pts, element.segments, closed)
  const n = pts.length / 2
  const chord = (i: number) => {
    const j = (i + 1) % n
    return Math.hypot(pts[j * 2] - pts[i * 2], pts[j * 2 + 1] - pts[i * 2 + 1])
  }
  const set = (i: number, seg: Segment) => {
    const next = sides.map((s, k) => (k === i ? seg : s))
    onUpdate(element.id, withSegments(element, next))
  }
  const toKind = (i: number, kind: Segment['kind']) => {
    const c = chord(i)
    if (kind === 'line') return set(i, { kind: 'line' })
    if (kind === 'arc') return set(i, { kind: 'arc', bulge: bulgeFromSagitta(Math.max(0.1, c * 0.15), c) })
    // curva libre: manijas a 1/3 y 2/3 de la cuerda, corridas hacia un lado
    const j = (i + 1) % n
    const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[j * 2], by = pts[j * 2 + 1]
    const nx = -(by - ay) / (c || 1), ny = (bx - ax) / (c || 1), off = c * 0.25
    set(i, { kind: 'bezier', c1: [ax + (bx - ax) / 3 + nx * off, ay + (by - ay) / 3 + ny * off], c2: [ax + (2 * (bx - ax)) / 3 + nx * off, ay + (2 * (by - ay)) / 3 + ny * off] })
  }
  const r2 = (v: number) => Math.round(v * 100) / 100
  return (
    <Section label={t.sSides}>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {sides.map((seg, i) => {
          const c = chord(i)
          const arc = seg.kind === 'arc' ? arcFromBulge({ x: pts[i * 2], y: pts[i * 2 + 1] }, { x: pts[((i + 1) % n) * 2], y: pts[((i + 1) % n) * 2 + 1] }, seg.bulge) : null
          return (
            <div key={i} className="rounded border border-slate-700/70 p-1.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 w-6">L{i + 1}</span>
                <select
                  value={seg.kind}
                  onChange={e => toKind(i, e.target.value as Segment['kind'])}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-slate-200"
                  aria-label={`L${i + 1}`}
                >
                  <option value="line">{t.sideLine}</option>
                  <option value="arc">{t.sideArc}</option>
                  <option value="bezier">{t.sideCurve}</option>
                </select>
                <span className="text-[10px] font-mono text-slate-400 w-14 text-right">{r2(info[i]?.length ?? c)} m</span>
              </div>
              {seg.kind === 'arc' && (
                <div className="flex items-center gap-1.5 pl-7">
                  <label className="text-[10px] text-slate-500 whitespace-nowrap">{t.sideSagitta}</label>
                  <div className="w-16">
                    <NumberInput
                      value={r2(Math.abs(sagittaFromBulge(seg.bulge, c)))}
                      step={0.1}
                      min={0}
                      onChange={v => set(i, { kind: 'arc', bulge: (Math.sign(seg.bulge) || 1) * bulgeFromSagitta(Math.max(0, v), c) })}
                    />
                  </div>
                  <button
                    onClick={() => set(i, { kind: 'arc', bulge: -seg.bulge })}
                    title={t.sideFlip}
                    aria-label={`L${i + 1} · ${t.sideFlip}`}
                    className="text-[11px] text-slate-400 hover:text-slate-100 px-1"
                  >⇅</button>
                  {arc && <span className="text-[10px] font-mono text-slate-500 ml-auto">R {r2(arc.r)}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{t.sidesHint}</p>
    </Section>
  )
}

// Capa de la pieza (o de toda la selección). Un conjunto va entero.
function LayerSelect({ value, onChange }: { value: LayerId | null; onChange: (l: LayerId) => void }) {
  const { t } = useLang()
  const names: Record<LayerId, string> = {
    structure: t.layerStructure, furniture: t.layerFurniture, decor: t.layerDecor, technical: t.layerTechnical, notes: t.layerNotes,
  }
  return (
    <div className="flex-none px-4 pt-4 -mb-2">
      <label className="flex items-center justify-between gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
        {t.fLayer}
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value as LayerId)}
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 normal-case tracking-normal"
        >
          {value === null && <option value="">{t.layerMixed}</option>}
          {LAYERS.filter(l => l !== 'notes').map(l => <option key={l} value={l}>{names[l]}</option>)}
        </select>
      </label>
    </div>
  )
}

// La selección es parte de un conjunto (mesa con sus sillas): se puede
// desarmar. Arrastrar la mesa mueve el conjunto; una silla se mueve sola.
function GroupSection({ count, groups, onUngroup }: { count: number; groups: number; onUngroup: () => void }) {
  const { t } = useLang()
  return (
    <div className="flex-none px-4 pt-4 -mb-2">
      <div className="rounded border border-slate-700 bg-slate-800/60 p-2.5 space-y-2">
        <p className="text-[10px] text-slate-400 leading-snug">{groups > 1 ? t.groupInfoMany.replace('{g}', String(groups)).replace('{n}', String(count)) : t.groupInfo.replace('{n}', String(count))}</p>
        <button
          onClick={onUngroup}
          className="w-full h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
        >
          {t.ungroup}
        </button>
      </div>
    </div>
  )
}

// Planos viejos: busca las sillas sueltas alrededor de cada mesa suelta y
// las agrupa. Se deshace en un paso (Cmd+Z). No corre solo al abrir.
function GroupTablesTool({ onRun }: { onRun: () => { tables: number; chairs: number } }) {
  const { t } = useLang()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="flex-none pb-5 space-y-2">
      <button
        onClick={() => {
          const r = onRun()
          setMsg(r.tables
            ? t.groupTablesDone.replace('{t}', String(r.tables)).replace('{c}', String(r.chairs))
            : t.groupTablesNone)
        }}
        className="w-full h-8 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
      >
        {t.groupTables}
      </button>
      <p className="text-[10px] text-slate-500 leading-snug">{msg ?? t.groupTablesHint}</p>
    </div>
  )
}

// ── Multi-selection properties (z-order only — other fields don't apply
// to a heterogeneous group) ─────────────────────────────────────────────────

function MultiSelectProperties({
  count, onBringToFront, onSendToBack, onSaveAsAsset, onRotate, onAlign, onDistribute, onRepeatGrid, defaultSpacing,
}: {
  count: number
  onBringToFront: () => void
  onSendToBack: () => void
  onSaveAsAsset: () => void
  onRotate: (deltaDeg: number) => void
  onAlign: (mode: AlignMode) => void
  onDistribute: (axis: 'horizontal' | 'vertical') => void
  onRepeatGrid: (rows: number, cols: number, gap: number) => void
  defaultSpacing: number
}) {
  const { t } = useLang()
  const smallBtn = 'h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider disabled:opacity-40'
  const aligns: { mode: AlignMode; label: string }[] = [
    { mode: 'left', label: t.alignLeft }, { mode: 'center', label: t.alignCenter }, { mode: 'right', label: t.alignRight },
    { mode: 'top', label: t.alignTop }, { mode: 'middle', label: t.alignMiddle }, { mode: 'bottom', label: t.alignBottom },
  ]
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <p className="text-xs text-slate-400">
        {count} {t.elementsSelected}
      </p>
      <Section label={t.sAlign}>
        <div className="grid grid-cols-3 gap-1.5">
          {aligns.map(a => (
            <button key={a.mode} onClick={() => onAlign(a.mode)} className={smallBtn}>{a.label}</button>
          ))}
        </div>
      </Section>
      <Section label={t.sDistribute}>
        <div className="flex gap-2">
          <button onClick={() => onDistribute('horizontal')} disabled={count < 3} className={`flex-1 ${smallBtn}`}>{t.distributeH}</button>
          <button onClick={() => onDistribute('vertical')} disabled={count < 3} className={`flex-1 ${smallBtn}`}>{t.distributeV}</button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">{t.distributeHint}</p>
      </Section>
      <Section label={t.sRepeatGrid}>
        <RepeatGrid onRepeat={onRepeatGrid} defaultSpacing={defaultSpacing} />
      </Section>
      <Section label={t.sOrder}>
        <div className="flex gap-2">
          <button
            onClick={onBringToFront}
            className="flex-1 h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
          >
            {t.bringToFront}
          </button>
          <button
            onClick={onSendToBack}
            className="flex-1 h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
          >
            {t.sendToBack}
          </button>
        </div>
      </Section>
      <Section label={t.rotateGroupDeg}>
        <GroupRotate onRotate={onRotate} />
      </Section>
      <Section label={t.sAsset}>
        <button
          onClick={onSaveAsAsset}
          className="w-full h-7 rounded text-[10px] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/40 border border-indigo-900/50 transition-colors font-mono uppercase tracking-wider"
        >
          {t.saveGroupAsAssetTitle}
        </button>
      </Section>
    </div>
  )
}

// Delta-rotation control for a multi-selection: the field is a delta (the
// group has no single rotation), applied on Enter or the button, then
// reset to 0. Orbits the combined bounding-box centre — see
// useCanvasState.rotateElements.
function GroupRotate({ onRotate }: { onRotate: (deltaDeg: number) => void }) {
  const { t } = useLang()
  const [delta, setDelta] = useState(0)
  const apply = () => {
    if (delta) onRotate(delta)
    setDelta(0)
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step={15}
        value={delta}
        onChange={e => setDelta(parseFloat(e.target.value) || 0)}
        onKeyDown={e => { if (e.key === 'Enter') apply() }}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-500"
      />
      <button
        onClick={apply}
        className="flex-none h-7 px-3 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
      >
        {t.apply}
      </button>
    </div>
  )
}

// ── Element properties ────────────────────────────────────────────────────────

function ElementProperties({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onRepeatGrid,
  defaultSpacing,
}: {
  element: LayoutElement
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onBringToFront: () => void
  onSendToBack: () => void
  onRepeatGrid: (rows: number, cols: number, gap: number) => void
  defaultSpacing: number
}) {
  const { t, lang } = useLang()

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <Section label={t.sIdentity}>
        <Field label={t.fName}>
          <Input
            value={getAssetName(lang, element.name)}
            onChange={v => onUpdate(element.id, { name: v })}
          />
        </Field>
        <Field label={t.fCategory}>
          <span className="text-xs text-slate-300">
            {getCategoryLabel(t, element.category)}
          </span>
        </Field>
      </Section>

      <Section label={t.sPosition}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.fX}>
            <NumberInput value={element.x} step={0.5} onChange={v => onUpdate(element.id, { x: v })} />
          </Field>
          <Field label={t.fY}>
            <NumberInput value={element.y} step={0.5} onChange={v => onUpdate(element.id, { y: v })} />
          </Field>
        </div>
      </Section>

      {(element.shape === 'wall' || (element.shape === 'path' && !element.closed)) && (
        <Section label={element.shape === 'wall' ? t.sWall : t.sStroke}>
          <Field label={t.wallThickness}>
            <NumberInput value={element.thickness ?? 0.15} step={0.05} min={0.01} onChange={v => onUpdate(element.id, { thickness: v })} />
          </Field>
          <p className="text-[10px] text-slate-400 mt-1">
            {t.wallLength}: {Math.round(elementLengthMeters(element) * 100) / 100} m
            {element.closed ? ` · ${t.wallClosed}` : ''}
          </p>
        </Section>
      )}

      {(element.shape === 'polygon' || element.shape === 'wall' || element.shape === 'path') && (element.points?.length ?? 0) >= 4 && (
        <SidesSection element={element} onUpdate={onUpdate} />
      )}

      <Section label={t.sDimensions}>
        {element.shape === 'polygon' || element.shape === 'wall' || element.shape === 'path' ? (
          // Width/height are just the polygon's bounding box — editing them
          // as plain numbers would desync `points` (the actual shape) from
          // them. Resize by dragging the Transformer handles instead, which
          // rescales `points` to match (see LayoutCanvas onTransformEnd).
          <p className="text-xs text-slate-300">
            {Math.round(element.width * 10) / 10}m × {Math.round(element.height * 10) / 10}m
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.fWidth}>
              <NumberInput value={element.width} step={0.5} min={0.5} onChange={v => onUpdate(element.id, { width: v })} />
            </Field>
            <Field label={t.fHeight}>
              <NumberInput value={element.height} step={0.5} min={0.5} onChange={v => onUpdate(element.id, { height: v })} />
            </Field>
          </div>
        )}
        <p className="text-[10px] text-slate-600 mt-1">
          {t.area}: {Math.round(elementAreaMeters(element) * 100) / 100} m²
        </p>
      </Section>

      <Section label={t.sRotation}>
        <Field label={t.fDegrees}>
          <NumberInput value={element.rotation} step={15} min={0} max={360} onChange={v => onUpdate(element.id, { rotation: v })} />
        </Field>
      </Section>

      <Section label={t.sFlip}>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(element.id, { flipX: !element.flipX })}
            className={`flex-1 h-7 rounded text-[10px] border transition-colors font-mono uppercase tracking-wider ${
              element.flipX
                ? 'text-indigo-300 bg-indigo-950/50 border-indigo-700'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border-slate-600'
            }`}
          >
            {t.flipHorizontal}
          </button>
          <button
            onClick={() => onUpdate(element.id, { flipY: !element.flipY })}
            className={`flex-1 h-7 rounded text-[10px] border transition-colors font-mono uppercase tracking-wider ${
              element.flipY
                ? 'text-indigo-300 bg-indigo-950/50 border-indigo-700'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border-slate-600'
            }`}
          >
            {t.flipVertical}
          </button>
        </div>
      </Section>

      <Section label={t.sOrder}>
        <div className="flex gap-2">
          <button
            onClick={onBringToFront}
            className="flex-1 h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
          >
            {t.bringToFront}
          </button>
          <button
            onClick={onSendToBack}
            className="flex-1 h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider"
          >
            {t.sendToBack}
          </button>
        </div>
      </Section>

      <Section label={t.sRepeatGrid}>
        <RepeatGrid onRepeat={onRepeatGrid} defaultSpacing={defaultSpacing} />
      </Section>

      <Section label={t.sColor}>
        <ColorPicker
          value={element.color}
          onChange={v => onUpdate(element.id, { color: v })}
        />
      </Section>

      <Section label={t.sOpacity}>
        <OpacitySlider
          value={element.opacity ?? 0.65}
          onChange={v => onUpdate(element.id, { opacity: v })}
        />
      </Section>

      <Section label={t.sNotes}>
        <textarea
          value={element.notes}
          rows={3}
          onChange={e => onUpdate(element.id, { notes: e.target.value })}
          placeholder={t.notesPlaceholder}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
        />
      </Section>

      <Section label={t.sState}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={element.locked}
            onChange={e => onUpdate(element.id, { locked: e.target.checked })}
            className="w-3 h-3 accent-indigo-500"
          />
          <span className="text-xs text-slate-400">{t.lockElement}</span>
        </label>
      </Section>

      <div className="flex gap-2">
        <button
          onClick={() => onDuplicate(element.id)}
          className="flex-1 h-7 rounded text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-indigo-900/50 transition-colors font-mono uppercase tracking-wider"
        >
          {t.duplicate}
        </button>
        <button
          onClick={() => onDelete(element.id)}
          className="flex-1 h-7 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition-colors font-mono uppercase tracking-wider"
        >
          {t.deleteElement}
        </button>
      </div>
    </div>
  )
}

// ── Drawing properties ────────────────────────────────────────────────────────

function DrawingProperties({
  drawing,
  onUpdate,
  onDelete,
}: {
  drawing: DrawingPrimitive
  onUpdate: (id: string, updates: Partial<DrawingPrimitive>) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLang()
  const toolLabel = drawing.tool === 'line' ? t.toolLine : drawing.tool === 'arrow' ? t.toolArrow : drawing.tool === 'dimension' ? t.toolDimension : t.toolText

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <Section label={t.sDrawing}>
        <Field label={t.fType}>
          <span className="text-xs text-slate-300">{toolLabel}</span>
        </Field>
        {drawing.tool === 'text' && (
          <Field label={t.fText}>
            <Input
              value={drawing.text ?? ''}
              onChange={v => onUpdate(drawing.id, { text: v })}
            />
          </Field>
        )}
      </Section>

      {(drawing.tool === 'line' || drawing.tool === 'arrow' || drawing.tool === 'dimension') && (
        <Section label={t.sMeasurement}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.fLength}>
              <NumberInput
                value={Math.round(lengthMeters(drawing.points[0], drawing.points[1], drawing.points[2], drawing.points[3], PIXELS_PER_METER) * 100) / 100}
                step={0.1}
                min={0.1}
                onChange={v => {
                  const [x1, y1, x2, y2] = drawing.points
                  const angle = angleDegrees(x1, y1, x2, y2)
                  const end = pointFromLengthAngle({ x: x1, y: y1 }, Math.max(0.1, v), angle, PIXELS_PER_METER)
                  onUpdate(drawing.id, { points: [x1, y1, end.x, end.y] })
                }}
              />
            </Field>
            <Field label={t.fAngleDeg}>
              <NumberInput
                value={Math.round(angleDegrees(drawing.points[0], drawing.points[1], drawing.points[2], drawing.points[3]))}
                step={1}
                onChange={v => {
                  const [x1, y1, x2, y2] = drawing.points
                  const len = lengthMeters(x1, y1, x2, y2, PIXELS_PER_METER)
                  const end = pointFromLengthAngle({ x: x1, y: y1 }, len, v, PIXELS_PER_METER)
                  onUpdate(drawing.id, { points: [x1, y1, end.x, end.y] })
                }}
              />
            </Field>
          </div>
        </Section>
      )}

      <Section label={t.sColor}>
        <ColorPicker
          value={drawing.color}
          onChange={v => onUpdate(drawing.id, { color: v })}
        />
      </Section>

      {drawing.tool === 'text' && (
        <Section label={t.sFontSize}>
          <Field label={t.fPx}>
            <NumberInput
              value={drawing.fontSize ?? 14}
              step={1}
              min={6}
              max={72}
              onChange={v => onUpdate(drawing.id, { fontSize: v })}
            />
          </Field>
        </Section>
      )}

      {drawing.tool !== 'text' && (
        <Section label={t.sStrokeWidth}>
          <Field label={t.fPx}>
            <NumberInput
              value={drawing.strokeWidth}
              step={0.5}
              min={0.5}
              max={12}
              onChange={v => onUpdate(drawing.id, { strokeWidth: v })}
            />
          </Field>
        </Section>
      )}

      <Section label={t.sOpacity}>
        <OpacitySlider
          value={drawing.opacity ?? 1}
          onChange={v => onUpdate(drawing.id, { opacity: v })}
        />
      </Section>

      <button
        onClick={() => onDelete(drawing.id)}
        className="w-full h-7 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition-colors font-mono uppercase tracking-wider"
      >
        {t.deleteDrawing}
      </button>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500">{label}</p>
      {children}
    </div>
  )
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
    />
  )
}

function NumberInput({
  value, step = 1, min, max, onChange,
}: {
  value: number
  step?: number
  min?: number
  max?: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-500"
    />
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {COLOR_PRESETS.map(color => (
        <button
          key={color}
          title={color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={`w-5 h-5 rounded-sm border-2 transition-all ${
            value.toLowerCase() === color.toLowerCase()
              ? 'border-white scale-110'
              : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
          }`}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-5 h-5 rounded-sm cursor-pointer border-0 bg-transparent p-0"
        title="Custom color"
        style={{ WebkitAppearance: 'none' }}
      />
    </div>
  )
}

function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-indigo-500 cursor-pointer"
      />
      <span className="text-[10px] text-slate-400 font-mono w-8 text-right tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

// Repetir en grilla: filas × columnas con una separación (por defecto, la de
// la org). La pieza o el conjunto elegido queda en la primera celda.
function RepeatGrid({ onRepeat, defaultSpacing }: { onRepeat: (rows: number, cols: number, gap: number) => void; defaultSpacing: number }) {
  const { t } = useLang()
  const [rows, setRows] = useState('1')
  const [cols, setCols] = useState('3')
  const [gap, setGap] = useState(String(defaultSpacing))
  const r = Math.max(1, Math.min(50, Math.floor(Number(rows) || 0)))
  const c = Math.max(1, Math.min(50, Math.floor(Number(cols) || 0)))
  const g = Math.max(0, Number(gap) || 0)
  const input = 'w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500'
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        <label className="text-[9px] text-slate-500">{t.gridRows}<input type="number" min={1} max={50} value={rows} onChange={e => setRows(e.target.value)} className={input} /></label>
        <label className="text-[9px] text-slate-500">{t.gridCols}<input type="number" min={1} max={50} value={cols} onChange={e => setCols(e.target.value)} className={input} /></label>
        <label className="text-[9px] text-slate-500">{t.gridGap}<input type="number" min={0} step={0.1} value={gap} onChange={e => setGap(e.target.value)} className={input} /></label>
      </div>
      <button
        onClick={() => onRepeat(r, c, g)}
        disabled={r * c < 2}
        className="w-full h-7 rounded text-[10px] text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 border border-slate-600 transition-colors font-mono uppercase tracking-wider disabled:opacity-40"
      >
        {t.repeatBtn} ({r} × {c})
      </button>
      <p className="text-[10px] text-slate-500">{t.repeatHint}</p>
    </div>
  )
}
