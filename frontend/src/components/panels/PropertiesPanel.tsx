import type { LayoutElement, DrawingPrimitive } from '@/types/layout'
import { useLang, getCategoryLabel } from '@/context/LangContext'

interface PropertiesPanelProps {
  element: LayoutElement | null
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  onDeleteElement: (id: string) => void
  onDuplicateElement: (id: string) => void
  selectedDrawing: DrawingPrimitive | null
  onUpdateDrawing: (id: string, updates: Partial<DrawingPrimitive>) => void
  onDeleteDrawing: (id: string) => void
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
}: PropertiesPanelProps) {
  const { t } = useLang()
  const hasSelection = element !== null || selectedDrawing !== null

  return (
    <aside className="w-60 flex-none bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex-none">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {t.propertiesTitle}
        </p>
      </div>

      {!hasSelection ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            {t.selectHint}
          </p>
        </div>
      ) : selectedDrawing !== null ? (
        <DrawingProperties
          drawing={selectedDrawing}
          onUpdate={onUpdateDrawing}
          onDelete={onDeleteDrawing}
        />
      ) : element !== null ? (
        <ElementProperties
          element={element}
          onUpdate={onUpdate}
          onDelete={onDeleteElement}
          onDuplicate={onDuplicateElement}
        />
      ) : null}
    </aside>
  )
}

// ── Element properties ────────────────────────────────────────────────────────

function ElementProperties({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  element: LayoutElement
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const { t } = useLang()

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <Section label={t.sIdentity}>
        <Field label={t.fName}>
          <Input
            value={element.name}
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

      <Section label={t.sDimensions}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.fWidth}>
            <NumberInput value={element.width} step={0.5} min={0.5} onChange={v => onUpdate(element.id, { width: v })} />
          </Field>
          <Field label={t.fHeight}>
            <NumberInput value={element.height} step={0.5} min={0.5} onChange={v => onUpdate(element.id, { height: v })} />
          </Field>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          {t.area}: {Math.round(element.width * element.height * 10) / 10} m²
        </p>
      </Section>

      <Section label={t.sRotation}>
        <Field label={t.fDegrees}>
          <NumberInput value={element.rotation} step={15} min={0} max={360} onChange={v => onUpdate(element.id, { rotation: v })} />
        </Field>
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
  const toolLabel = drawing.tool === 'line' ? t.toolLine : drawing.tool === 'arrow' ? t.toolArrow : t.toolText

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

      <Section label={t.sColor}>
        <ColorPicker
          value={drawing.color}
          onChange={v => onUpdate(drawing.id, { color: v })}
        />
      </Section>

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
