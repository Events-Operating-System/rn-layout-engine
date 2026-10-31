import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { buildLayoutPdf } from './pdfExport'
import { DEFAULT_LAYOUT_META, type LayoutElement } from '@/types/layout'
import { roundTableWithChairs } from '@/lib/seating'
import { DEFAULT_LAYOUT_SETTINGS } from '@/lib/layoutSettings'
import { halfMoon } from '@/lib/curves'

function samplePlan(): LayoutElement[] {
  const els: LayoutElement[] = [
    { id: 'w', name: 'Perimeter', category: 'structure', shape: 'wall', x: 0, y: 0, width: 30, height: 20, rotation: 0, color: '#cbd5e1', locked: false, notes: '', points: [0, 0, 30, 0, 30, 20, 0, 20], closed: true, thickness: 0.15 },
    { id: 's', name: 'Half-Moon Stage', category: 'stage', shape: 'polygon', x: 11, y: 1, width: 8, height: 4, rotation: 0, color: '#6366f1', locked: false, notes: '', ...(() => { const h = halfMoon(8); return { points: h.points, segments: h.segments } })() },
    { id: 'b', name: 'Bar', category: 'structure', x: 24, y: 14, width: 5, height: 2, rotation: 30, color: '#0891b2', locked: false, notes: '' },
  ]
  let n = 0
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    for (const ch of roundTableWithChairs(10, DEFAULT_LAYOUT_SETTINGS)) {
      els.push({ id: `t${n++}`, name: ch.name, category: ch.category, shape: ch.shape, x: 4 + c * 6 + ch.dx, y: 8 + r * 5.5 + ch.dy, width: ch.width, height: ch.height, rotation: ch.rotation, color: ch.color, locked: false, notes: '', seats: ch.seats })
    }
  }
  return els
}

const OUT = process.env.PDF_OUT // carpeta para mirar los PDFs (opcional)

describe('PDF profesional', () => {
  const meta = { ...DEFAULT_LAYOUT_META, proyecto: 'Boda Pérez — Salón Ñandú', pax: '80' }
  it('A4 apaisado: 30 × 20 m entra a 1:150, vectorial y liviano', () => {
    const r = buildLayoutPdf({ elements: samplePlan(), drawings: [], meta, versionNumber: 3, lang: 'es', decimals: 2, paper: { paper: 'a4', landscape: true } })!
    expect(r.scale).toBe(150)
    expect(r.doc.internal.pageSize.getWidth()).toBeCloseTo(297, 0)
    const bytes = r.doc.output('arraybuffer').byteLength
    expect(bytes).toBeLessThan(60_000)
    if (OUT) writeFileSync(`${OUT}/a4.pdf`, Buffer.from(r.doc.output('arraybuffer')))
  })
  it('A3 apaisado: mismo plano a 1:100', () => {
    const r = buildLayoutPdf({ elements: samplePlan(), drawings: [], meta, versionNumber: 3, lang: 'es', decimals: 2, paper: { paper: 'a3', landscape: true } })!
    expect(r.scale).toBe(100)
    if (OUT) writeFileSync(`${OUT}/a3.pdf`, Buffer.from(r.doc.output('arraybuffer')))
  })
  it('solo lo seleccionado: una mesa con sillas sale a escala grande con el cajetín', () => {
    const sel = samplePlan().filter(e => /^t([0-9]|10)$/.test(e.id))
    const r = buildLayoutPdf({ elements: sel, drawings: [], meta, versionNumber: 3, lang: 'es', decimals: 2, paper: { paper: 'a4', landscape: true }, selectionOnly: true })!
    expect(r.scale).toBe(20)
    if (OUT) writeFileSync(`${OUT}/seleccion.pdf`, Buffer.from(r.doc.output('arraybuffer')))
  })
  it('plano de QA real (si está a mano)', () => {
    const f = OUT && `${OUT}/qa_plan.json`
    if (!f || !existsSync(f)) return
    const plan = JSON.parse(readFileSync(f, 'utf8'))
    const r = buildLayoutPdf({ elements: plan.elements, drawings: plan.drawings, meta: { ...DEFAULT_LAYOUT_META, ...plan.meta }, versionNumber: 1, lang: 'es', decimals: 2, paper: { paper: 'a4', landscape: true } })!
    writeFileSync(`${OUT}/qa.pdf`, Buffer.from(r.doc.output('arraybuffer')))
  })
})
