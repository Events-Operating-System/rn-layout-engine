import type { LayoutMeta } from '@/types/layout'
import { versionNote } from '@/lib/layoutVersion'
import { useLang } from '@/context/LangContext'

interface FooterLegendProps {
  meta: LayoutMeta
  // layouts.version_number — fijo, lo numera la base al guardar.
  versionNumber: number
  onUpdate: (updates: Partial<LayoutMeta>) => void
  readOnly?: boolean
  // CLIENTE viene del evento vinculado: se muestra, no se edita acá.
  clienteFromEvent?: boolean
  // PAX automático (asientos dibujados). Escribir pasa a manual.
  paxAuto?: boolean
}

export const FOOTER_HEIGHT_PX = 88

export default function FooterLegend({ meta, versionNumber, onUpdate, readOnly = false, clienteFromEvent = false, paxAuto = false }: FooterLegendProps) {
  const { t } = useLang()
  return (
    <div
      className="flex-none bg-slate-900 border-t border-slate-600/80 flex overflow-hidden"
      style={{ height: FOOTER_HEIGHT_PX, fontFamily: 'ui-monospace, monospace' }}
    >
      {/* Left — product identity */}
      <div className="w-44 flex-none border-r border-slate-600/80 flex flex-col items-start justify-center px-3 py-2 gap-0">
        <span className="text-slate-100 font-bold text-[12px] tracking-tight">EventOS Layout</span>
        <span className="text-slate-600 text-[7px] uppercase tracking-[0.15em] leading-tight">powered by</span>
        <span className="text-slate-400 text-[10px] tracking-tight leading-tight">{meta.company}</span>
      </div>

      {/* Right — metadata grid (overflow-x-auto so it scrolls rather than squashes on narrow viewports) */}
      <div className="flex-1 overflow-x-auto">
      <div className="grid grid-cols-5 divide-x divide-slate-700/60 h-full min-w-[480px]">
        {/* Mismo orden que el cajetín del PNG/PDF (titleBlockColumns). */}
        <Column>
          {/* PROYECTO = nombre del layout; se edita en la barra de arriba. */}
          <MetaField label="PROYECTO"     value={meta.proyecto}     readOnly onChange={() => {}} />
          <MetaField label="CLIENTE"      value={meta.cliente}      readOnly={readOnly || clienteFromEvent} onChange={v => onUpdate({ cliente: v })} />
        </Column>
        <Column>
          <MetaField label="LUGAR EVENTO" value={meta.lugarEvento}  readOnly={readOnly} onChange={v => onUpdate({ lugarEvento: v })} />
          <MetaField label="FECHA EVENTO"   value={meta.fechaEvento} readOnly={readOnly} onChange={v => onUpdate({ fechaEvento: v })} />
        </Column>
        <Column>
          <PaxField
            value={meta.pax}
            auto={paxAuto}
            readOnly={readOnly}
            autoLabel={t.paxAutoLabel}
            backToAutoLabel={t.paxBackToAuto}
            onChange={v => onUpdate({ pax: v, paxAuto: false })}
            onBackToAuto={() => onUpdate({ paxAuto: true })}
          />
          <VersionField
            versionNumber={versionNumber}
            note={readOnly ? versionNote(meta.version) : meta.version === 'v1.0' ? '' : meta.version}
            placeholder={t.versionNotePlaceholder}
            readOnly={readOnly}
            onChange={v => onUpdate({ version: v })}
          />
        </Column>
        <Column>
          <MetaField label="FECHA DEL PLANO"   value={meta.fechaPlano}  readOnly={readOnly} onChange={v => onUpdate({ fechaPlano: v })} />
          <MetaField label="CONTACTO"  value={meta.contacto}  readOnly={readOnly} onChange={v => onUpdate({ contacto: v })} />
        </Column>
        <Column>
          <MetaField label="TELEFONO"  value={meta.telefono}  readOnly={readOnly} onChange={v => onUpdate({ telefono: v })} />
          <MetaField label="CORREO" value={meta.correo} readOnly={readOnly} onChange={v => onUpdate({ correo: v })} />
        </Column>
      </div>
      </div>
    </div>
  )
}

function Column({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-slate-700/40">
      {children}
    </div>
  )
}

// PAX: automático (cuenta las sillas) o escrito a mano. Escribir lo pasa a
// manual; "auto" vuelve a contar.
function PaxField({
  value, auto, readOnly, autoLabel, backToAutoLabel, onChange, onBackToAuto,
}: {
  value: string
  auto: boolean
  readOnly: boolean
  autoLabel: string
  backToAutoLabel: string
  onChange: (v: string) => void
  onBackToAuto: () => void
}) {
  return (
    <div className="flex-1 px-2 py-0.5 flex flex-col justify-center min-h-0">
      <span className="text-slate-600 text-[7px] uppercase tracking-[0.18em] leading-none mb-0.5 select-none flex items-center gap-1">
        PAX / INVITADOS
        {auto && <span className="normal-case tracking-normal text-indigo-400">· {autoLabel}</span>}
        {!auto && !readOnly && (
          <button
            type="button"
            onClick={onBackToAuto}
            title={backToAutoLabel}
            className="normal-case tracking-normal text-slate-500 hover:text-indigo-300"
          >
            ↺ {autoLabel}
          </button>
        )}
      </span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="text-slate-200 text-[10px] bg-transparent border-none outline-none w-full placeholder-slate-700 font-mono leading-none"
      />
    </div>
  )
}

// Número de versión fijo + nota libre escrita a mano (meta.version).
function VersionField({
  versionNumber, note, placeholder, readOnly, onChange,
}: {
  versionNumber: number
  note: string
  placeholder: string
  readOnly: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex-1 px-2 py-0.5 flex flex-col justify-center min-h-0">
      <span className="text-slate-600 text-[7px] uppercase tracking-[0.18em] leading-none mb-0.5 select-none">
        VERSION DEL PLANO
      </span>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="flex-none text-slate-100 text-[10px] font-mono font-bold leading-none">v{versionNumber}</span>
        <input
          type="text"
          value={note}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
          placeholder={readOnly ? '' : placeholder}
          title={placeholder}
          className="flex-1 min-w-0 text-slate-400 text-[10px] bg-transparent border-none outline-none placeholder-slate-700 font-mono leading-none"
        />
      </div>
    </div>
  )
}

function MetaField({
  label, value, onChange, readOnly = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex-1 px-2 py-0.5 flex flex-col justify-center min-h-0">
      <span className="text-slate-600 text-[7px] uppercase tracking-[0.18em] leading-none mb-0.5 select-none">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="text-slate-200 text-[10px] bg-transparent border-none outline-none w-full placeholder-slate-700 font-mono leading-none"
      />
    </div>
  )
}
