// Exportar la lista de materiales (versión simple de L1): PDF con el cajetín
// del plano y Excel (.xlsx armado a mano con fflate, sin librerías pesadas).
// Nombre: "<Nombre> - vN - materiales.pdf/xlsx".
import { jsPDF } from 'jspdf'
import { zipSync, strToU8 } from 'fflate'
import type { LayoutMeta } from '@/types/layout'
import { drawTitleBlockWith, text, fitSize } from '@/components/canvas/pdfExport'
import { MARGIN_MM, TITLE_BLOCK_MM } from '@/lib/pdfLayout'
import { versionLabel } from '@/lib/layoutVersion'

// Una fila ya escrita para mostrar (la arma el panel con sus textos).
export interface MaterialRow {
  type: string
  detail: string
  qty: string
  unit: string
  origin: string
  note: string
  change?: string   // "+10", "−1", "nuevo", "ya no está"
  removed?: boolean
  subtotal?: boolean // fila de subtotal del grupo ("Sillas: 34")
  warn?: boolean     // aviso (mantel sin definir, silla sin tipo/color)
}

export interface MaterialsDoc {
  title: string
  headers: { type: string; detail: string; qty: string; unit: string; origin: string; note: string; change?: string }
  rows: MaterialRow[]
  meta: LayoutMeta
  versionNumber: number
  // Avisos bajo el título ("Sin cambios respecto a v3", "Manteles sin definir: 2").
  notices?: string[]
}

// ── PDF ─────────────────────────────────────────────────────────────────────
export function buildMaterialsPdf(d: MaterialsDoc): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: `${d.meta.proyecto || 'Layout'} - materiales`, creator: 'EventOS Layout' })
  const pageW = 210, pageH = 297
  const x0 = MARGIN_MM, w = pageW - MARGIN_MM * 2
  const tb = { x: x0, y: pageH - MARGIN_MM - TITLE_BLOCK_MM, w, h: TITLE_BLOCK_MM }
  const hasChange = d.headers.change !== undefined
  // Anchos de columna (mm).
  const cols = hasChange
    ? [{ k: 'type', w: 30 }, { k: 'detail', w: 54 }, { k: 'qty', w: 18 }, { k: 'unit', w: 12 }, { k: 'origin', w: 18 }, { k: 'note', w: 34 }, { k: 'change', w: 28 }]
    : [{ k: 'type', w: 32 }, { k: 'detail', w: 66 }, { k: 'qty', w: 20 }, { k: 'unit', w: 14 }, { k: 'origin', w: 20 }, { k: 'note', w: 42 }]
  const scale = w / cols.reduce((a, c) => a + c.w, 0)
  cols.forEach(c => { c.w *= scale })
  const rowH = 6.2
  const notices = d.notices ?? []
  const top = MARGIN_MM + 12
  const top0 = top + notices.length * 4.2
  const bottom = tb.y - 4
  const perPage = Math.max(1, Math.floor((bottom - top - rowH) / rowH))
  const perFirst = Math.max(1, Math.floor((bottom - top0 - rowH) / rowH))
  const pages = d.rows.length <= perFirst ? 1 : 1 + Math.ceil((d.rows.length - perFirst) / perPage)
  const slice = (pg: number) => (pg === 0 ? d.rows.slice(0, perFirst) : d.rows.slice(perFirst + (pg - 1) * perPage, perFirst + pg * perPage))
  const numeric = new Set(['qty', 'change'])

  for (let pg = 0; pg < pages; pg++) {
    if (pg) doc.addPage('a4', 'portrait')
    const titleSize = fitSize(doc, d.title, 4.6, w - 22, true, 3)
    text(doc, d.title, x0, MARGIN_MM + 5, { size: titleSize, bold: true })
    if (pages > 1) text(doc, `${pg + 1}/${pages}`, x0 + w, MARGIN_MM + 5, { size: 3, align: 'right', color: '#555555' })
    if (pg === 0 && notices.length) {
      notices.forEach((n, i) => text(doc, n, x0, MARGIN_MM + 10 + i * 4.2, { size: 2.8, color: '#9a3412' }))
    }
    // Encabezado de la tabla
    let y = pg === 0 ? top0 : top
    doc.setFillColor('#eef1f5'); doc.setDrawColor('#000000'); doc.setLineWidth(0.25)
    doc.rect(x0, y, w, rowH, 'FD')
    let cx = x0
    for (const c of cols) {
      const label = (d.headers as unknown as Record<string, string>)[c.k] ?? ''
      text(doc, label, numeric.has(c.k) ? cx + c.w - 1.5 : cx + 1.5, y + rowH / 2, { size: 2.3, bold: true, baseline: 'middle', align: numeric.has(c.k) ? 'right' : 'left' })
      cx += c.w
    }
    y += rowH
    for (const r of slice(pg)) {
      if (r.subtotal) { doc.setFillColor('#f3f4f6'); doc.rect(x0, y, w, rowH, 'F') }
      doc.setLineWidth(0.12); doc.setDrawColor('#c5cdd8')
      doc.line(x0, y + rowH, x0 + w, y + rowH)
      cx = x0
      for (const c of cols) {
        const v = (r as unknown as Record<string, string>)[c.k] ?? ''
        const color = r.removed ? '#888888' : r.warn && c.k === 'detail' ? '#9a3412' : c.k === 'change' ? (v.startsWith('+') || v === 'nuevo' ? '#15803d' : v.startsWith('−') ? '#b91c1c' : '#333333') : '#111111'
        const bold = c.k === 'qty' || !!r.subtotal
        const size = fitSize(doc, v, 2.6, c.w - 3, bold, 1.6)
        text(doc, v, numeric.has(c.k) ? cx + c.w - 1.5 : cx + 1.5, y + rowH / 2, { size, bold, baseline: 'middle', align: numeric.has(c.k) ? 'right' : 'left', color })
        cx += c.w
      }
      y += rowH
    }
    doc.setDrawColor('#000000'); doc.setLineWidth(0.25)
    doc.rect(x0, pg === 0 ? top0 : top, w, y - (pg === 0 ? top0 : top))
    drawTitleBlockWith(doc, tb, d.meta, d.versionNumber, [
      { label: 'DOCUMENTO', value: 'Lista de materiales' },
      { label: 'LÍNEAS', value: String(d.rows.filter(r => !r.removed && !r.subtotal).length) },
    ])
  }
  return doc
}

// ── Excel (.xlsx mínimo: una hoja, texto en línea, encabezado en negrita) ────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const colName = (i: number) => String.fromCharCode(65 + i)

type Cell = { v: string | number; bold?: boolean }

function sheetXml(rows: Cell[][], widths: number[]): string {
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
    const ref = `${colName(ci)}${ri + 1}`
    const s = c.bold ? ' s="1"' : ''
    return typeof c.v === 'number'
      ? `<c r="${ref}"${s}><v>${c.v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
  }).join('')}</row>`).join('')
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`
}

export function buildMaterialsXlsx(d: MaterialsDoc): Uint8Array {
  const m = d.meta
  const hasChange = d.headers.change !== undefined
  const rows: Cell[][] = [
    [{ v: d.title, bold: true }],
    [{ v: 'Proyecto', bold: true }, { v: m.proyecto || '' }],
    [{ v: 'Cliente', bold: true }, { v: m.cliente || '' }],
    [{ v: 'Lugar del evento', bold: true }, { v: m.lugarEvento || '' }],
    [{ v: 'Fecha del evento', bold: true }, { v: m.fechaEvento || '' }],
    [{ v: 'PAX / invitados', bold: true }, { v: m.pax || '' }],
    [{ v: 'Versión del plano', bold: true }, { v: versionLabel(d.versionNumber, m.version) }],
    [{ v: 'Fecha del plano', bold: true }, { v: m.fechaPlano || '' }],
    [{ v: 'Contacto', bold: true }, { v: [m.contacto, m.telefono, m.correo].filter(Boolean).join(' · ') }],
    ...(d.notices ?? []).map(n => [{ v: n, bold: true }]),
    [],
    [d.headers.type, d.headers.detail, d.headers.qty, d.headers.unit, d.headers.origin, d.headers.note, ...(hasChange ? [d.headers.change!] : [])].map(v => ({ v, bold: true })),
    ...d.rows.map(r => {
      const q = Number(r.qty.replace(',', '.'))
      const b = !!r.subtotal
      return [{ v: r.type, bold: b }, { v: r.detail, bold: b }, Number.isFinite(q) && r.qty !== '' ? { v: q, bold: b } : { v: r.qty, bold: b }, { v: r.unit, bold: b }, { v: r.origin }, { v: r.note }, ...(hasChange ? [{ v: r.change ?? '' }] : [])]
    }),
  ]
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Materiales" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml(rows, [22, 40, 12, 8, 12, 30, 14])),
  }
  return zipSync(files)
}

export function downloadBlob(data: Uint8Array | Blob, name: string, type: string) {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
