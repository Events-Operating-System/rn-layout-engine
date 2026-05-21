import type { LayoutElement } from '@/types/layout'
import { CATEGORY_LABELS } from '@/types/layout'

interface PropertiesPanelProps {
  element: LayoutElement | null
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void
}

export default function PropertiesPanel({ element, onUpdate }: PropertiesPanelProps) {
  return (
    <aside className="w-60 flex-none bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex-none">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Properties
        </p>
      </div>

      {!element ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            Select an element on the canvas to view and edit its properties.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Identity */}
          <Section label="Identity">
            <Field label="Name">
              <Input
                value={element.name}
                onChange={v => onUpdate(element.id, { name: v })}
              />
            </Field>
            <Field label="Category">
              <span className="text-xs text-slate-300">
                {CATEGORY_LABELS[element.category]}
              </span>
            </Field>
          </Section>

          {/* Position */}
          <Section label="Position (m)">
            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <NumberInput
                  value={element.x}
                  step={0.5}
                  onChange={v => onUpdate(element.id, { x: v })}
                />
              </Field>
              <Field label="Y">
                <NumberInput
                  value={element.y}
                  step={0.5}
                  onChange={v => onUpdate(element.id, { y: v })}
                />
              </Field>
            </div>
          </Section>

          {/* Dimensions */}
          <Section label="Dimensions (m)">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width">
                <NumberInput
                  value={element.width}
                  step={0.5}
                  min={0.5}
                  onChange={v => onUpdate(element.id, { width: v })}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={element.height}
                  step={0.5}
                  min={0.5}
                  onChange={v => onUpdate(element.id, { height: v })}
                />
              </Field>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              Area: {Math.round(element.width * element.height * 10) / 10} m²
            </p>
          </Section>

          {/* Rotation */}
          <Section label="Rotation">
            <Field label="Degrees">
              <NumberInput
                value={element.rotation}
                step={15}
                min={0}
                max={360}
                onChange={v => onUpdate(element.id, { rotation: v })}
              />
            </Field>
          </Section>

          {/* Notes */}
          <Section label="Notes">
            <textarea
              value={element.notes}
              rows={3}
              onChange={e => onUpdate(element.id, { notes: e.target.value })}
              placeholder="Operational notes..."
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
            />
          </Section>

          {/* State */}
          <Section label="State">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={element.locked}
                onChange={e => onUpdate(element.id, { locked: e.target.checked })}
                className="w-3 h-3 accent-indigo-500"
              />
              <span className="text-xs text-slate-400">Lock element</span>
            </label>
          </Section>
        </div>
      )}
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
