import type { LayoutMeta } from '@/types/layout'

interface FooterLegendProps {
  meta: LayoutMeta
  onUpdate: (updates: Partial<LayoutMeta>) => void
}

export const FOOTER_HEIGHT_PX = 88

export default function FooterLegend({ meta, onUpdate }: FooterLegendProps) {
  return (
    <div
      className="flex-none bg-slate-900 border-t border-slate-600/80 flex overflow-hidden"
      style={{ height: FOOTER_HEIGHT_PX, fontFamily: 'ui-monospace, monospace' }}
    >
      {/* Left — company identity */}
      <div className="w-44 flex-none border-r border-slate-600/80 flex flex-col items-center justify-center px-3 py-2 gap-0.5">
        <span className="text-slate-100 font-bold text-[13px] tracking-tight">{meta.company}</span>
        <span className="text-slate-600 text-[8px] uppercase tracking-[0.2em]">Layout Engine</span>
      </div>

      {/* Right — metadata grid (overflow-x-auto so it scrolls rather than squashes on narrow viewports) */}
      <div className="flex-1 overflow-x-auto">
      <div className="grid grid-cols-5 divide-x divide-slate-700/60 h-full min-w-[480px]">
        <Column>
          <MetaField label="CLIENTE"      value={meta.cliente}      onChange={v => onUpdate({ cliente: v })} />
          <MetaField label="LUGAR EVENTO" value={meta.lugarEvento}  onChange={v => onUpdate({ lugarEvento: v })} />
        </Column>
        <Column>
          <MetaField label="FECHA EVENTO"   value={meta.fechaEvento} onChange={v => onUpdate({ fechaEvento: v })} />
          <MetaField label="PAX / INVITADOS" value={meta.pax}       onChange={v => onUpdate({ pax: v })} />
        </Column>
        <Column>
          <MetaField label="VERSION DEL PLANO" value={meta.version}     onChange={v => onUpdate({ version: v })} />
          <MetaField label="FECHA DEL PLANO"   value={meta.fechaPlano}  onChange={v => onUpdate({ fechaPlano: v })} />
        </Column>
        <Column>
          <MetaField label="CONTACTO"  value={meta.contacto}  onChange={v => onUpdate({ contacto: v })} />
          <MetaField label="TELEFONO"  value={meta.telefono}  onChange={v => onUpdate({ telefono: v })} />
        </Column>
        <Column>
          <MetaField label="CORREO" value={meta.correo} onChange={v => onUpdate({ correo: v })} />
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

function MetaField({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex-1 px-2 py-0.5 flex flex-col justify-center min-h-0">
      <span className="text-slate-600 text-[7px] uppercase tracking-[0.18em] leading-none mb-0.5 select-none">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="text-slate-200 text-[10px] bg-transparent border-none outline-none w-full placeholder-slate-700 font-mono leading-none"
      />
    </div>
  )
}
