// PDF profesional (bloque 8): hoja A4 o A3, plano a escala estándar
// (1:100, 1:200…) indicada en el cajetín y en una barra de escala, todo en
// vectores (líneas y texto nítidos, pocos KB). El plano del local de fondo va
// como una sola imagen JPEG ya mezclada con blanco a su transparencia y con
// la resolución justa para la hoja.
//
// Formas: jsPDF context2d (traslación y rotación por pieza). Texto: doc.text
// con la alineación calculada acá (context2d centra mal el texto rotado).

import { jsPDF } from 'jspdf'
import type { DrawingPrimitive, LayoutElement, LayoutMeta } from '@/types/layout'
import { flattenPath, sideInfo } from '@/lib/curves'
import { formatMeters } from '@/lib/dimension'
import { versionLabel } from '@/lib/layoutVersion'
import { getAssetName, type Lang } from '@/context/LangContext'
import {
  sheetLayout, pickScale, contentBounds, scaleBarMeters, paperLabel, FRAME_PAD_MM,
  type Bounds, type PaperChoice,
} from '@/lib/pdfLayout'

const PPM = 20 // px por metro de los dibujos (mismo PIXELS_PER_METER)
const PT_PER_MM = 72 / 25.4

// Plano del local ya preparado para la hoja: JPEG y dónde va (metros).
export interface BakedBackground {
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutPdfParams {
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  meta: LayoutMeta
  versionNumber: number
  lang: Lang
  decimals: number
  paper: PaperChoice
  // Caja extra a cubrir (el fondo entero al exportar todo). Opcional.
  extraBounds?: Bounds
  // Prepara el fondo para la región y la escala elegidas (lo hace el
  // navegador con un canvas). Sin esto, el PDF sale sin fondo.
  bakeBackground?: (mmPerM: number) => BakedBackground | null
  // "Selección" en el cajetín cuando se exporta solo lo seleccionado.
  selectionOnly?: boolean
}

export interface LayoutPdfResult {
  doc: jsPDF
  scale: number // denominador 1:N
}

type TextOpts = { size: number; bold?: boolean; align?: 'left' | 'center' | 'right'; baseline?: 'alphabetic' | 'middle' | 'top'; angle?: number; color?: string }

// Texto en mm con alineación y rotación propias. angle en grados, sentido
// horario como en pantalla.
function text(doc: jsPDF, s: string, x: number, y: number, o: TextOpts) {
  if (!s) return
  doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
  doc.setFontSize(o.size * PT_PER_MM)
  doc.setTextColor(o.color ?? '#000000')
  const w = doc.getTextWidth(s)
  const a = ((o.angle ?? 0) * Math.PI) / 180
  const ca = Math.cos(a), sa = Math.sin(a)
  const dx = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0
  const dy = o.baseline === 'middle' ? o.size * 0.35 : o.baseline === 'top' ? o.size * 0.72 : 0
  doc.text(s, x + dx * ca - dy * sa, y + dx * sa + dy * ca, { angle: -(o.angle ?? 0) })
}

// Achica la letra hasta que entre en el ancho.
function fitSize(doc: jsPDF, s: string, size: number, maxW: number, bold = false, min = 1.4): number {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  let sz = size
  while (sz > min) {
    doc.setFontSize(sz * PT_PER_MM)
    if (doc.getTextWidth(s) <= maxW) break
    sz -= 0.1
  }
  return sz
}

const DEFAULT_COLORS = ['#6366f1', '#0891b2', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#16a34a', '#64748b', '#d97706']

export function buildLayoutPdf(p: LayoutPdfParams): LayoutPdfResult | null {
  const sheet = sheetLayout(p.paper)
  const b0 = contentBounds(p.elements, p.drawings)
  const b = b0 && p.extraBounds
    ? { minX: Math.min(b0.minX, p.extraBounds.minX), minY: Math.min(b0.minY, p.extraBounds.minY), maxX: Math.max(b0.maxX, p.extraBounds.maxX), maxY: Math.max(b0.maxY, p.extraBounds.maxY) }
    : b0 ?? p.extraBounds ?? null
  if (!b) return null

  const availW = sheet.frame.w - FRAME_PAD_MM * 2
  const availH = sheet.frame.h - FRAME_PAD_MM * 2
  const cw = b.maxX - b.minX, ch = b.maxY - b.minY
  const denom = pickScale(cw, ch, availW, availH)
  const k = 1000 / denom // mm por metro
  // Centrado en el recuadro.
  const ox = sheet.frame.x + FRAME_PAD_MM + (availW - cw * k) / 2 - b.minX * k
  const oy = sheet.frame.y + FRAME_PAD_MM + (availH - ch * k) / 2 - b.minY * k
  const P = (xm: number, ym: number): [number, number] => [ox + xm * k, oy + ym * k]

  const doc = new jsPDF({ orientation: p.paper.landscape ? 'landscape' : 'portrait', unit: 'mm', format: p.paper.paper, compress: true })
  doc.setProperties({ title: p.meta.proyecto || 'Layout', creator: 'EventOS Layout' })
  const ctx = doc.context2d

  // Plano del local de fondo (debajo de todo).
  const bg = p.bakeBackground?.(k)
  if (bg) {
    const [bx, by] = P(bg.x, bg.y)
    doc.addImage(bg.dataUrl, 'JPEG', bx, by, bg.width * k, bg.height * k, undefined, 'FAST')
  }

  // ── Piezas ───────────────────────────────────────────────────────────────
  const labels: { s: string; x: number; y: number; size: number; angle: number; bold: boolean; color: string }[] = []
  for (const el of p.elements) {
    const w = el.width * k, h = el.height * k
    const [px, py] = P(el.x, el.y)
    const isTree = el.shape === 'tree'
    const isCircle = el.shape === 'circle'
    const isOval = el.shape === 'oval'
    const isPath = el.shape === 'path'
    const isPolygon = el.shape === 'polygon' || (isPath && !!el.closed)
    const isWall = el.shape === 'wall' || (isPath && !el.closed)
    const hasCustomColor = !DEFAULT_COLORS.includes(el.color)
    const fill = isTree ? '#16a34a' : hasCustomColor ? el.color : '#ffffff'

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate((el.rotation * Math.PI) / 180)
    if (el.flipX) { ctx.translate(w, 0); ctx.scale(-1, 1) }
    if (el.flipY) { ctx.translate(0, h); ctx.scale(1, -1) }
    ctx.fillStyle = fill
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 0.25
    ctx.lineJoin = 'round'

    if (isCircle || isTree) {
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2, false)
      ctx.fill(); ctx.stroke()
    } else if (isOval) {
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.scale(1, h / (w || 1))
      ctx.beginPath()
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2, false)
      ctx.restore()
      ctx.fill(); ctx.stroke()
    } else if (isWall && el.points && el.points.length >= 4) {
      const closed = !!el.closed && el.points.length >= 6
      const pts = flattenPath(el.points, el.segments, closed)
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = Math.max(0.2, (el.thickness ?? 0.15) * k)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0] * k, pts[1] * k)
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * k, pts[i + 1] * k)
      if (closed) ctx.closePath()
      ctx.stroke()
    } else if (isPolygon && el.points && el.points.length >= 4) {
      const pts = flattenPath(el.points, el.segments, true)
      ctx.beginPath()
      ctx.moveTo(pts[0] * k, pts[1] * k)
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * k, pts[i + 1] * k)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.rect(0, 0, w, h)
      ctx.fill(); ctx.stroke()
    }
    ctx.restore()

    // Medidas de cada tramo de muros y curvas abiertas.
    const rot = (el.rotation * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot)
    const toPage = (lx: number, ly: number): [number, number] => [px + lx * cr - ly * sr, py + lx * sr + ly * cr]
    if (isWall && el.points && el.points.length >= 4 && !el.flipX && !el.flipY) {
      const closed = !!el.closed && el.points.length >= 6
      const off = Math.max(0.2, (el.thickness ?? 0.15) * k) / 2 + 1.6
      for (const side of sideInfo(el.points, el.segments, closed)) {
        if (side.length * k < 8) continue
        const [lx, ly] = [side.mx * k - Math.sin(side.angle) * off, side.my * k + Math.cos(side.angle) * off]
        const [tx, ty] = toPage(lx, ly)
        let ang = (side.angle * 180) / Math.PI + el.rotation
        ang = ((ang % 360) + 360) % 360
        if (ang > 90 && ang < 270) ang -= 180
        labels.push({ s: formatMeters(side.length, p.decimals), x: tx, y: ty, size: 1.8, angle: ang, bold: false, color: '#333333' })
      }
    }

    // Nombre y medidas dentro de la pieza (si entra).
    if (!isPolygon && !isWall && w > 7 && h > 3.5) {
      const name = getAssetName(p.lang, el.name)
      const size = Math.min(3, Math.max(1.4, Math.min(w, h) / 4))
      const fs = fitSize(doc, name, size, w * (isCircle || isOval || isTree ? 0.68 : 0.9), true)
      const [cx, cy] = toPage(w / 2, h / 2)
      let ang = ((el.rotation % 360) + 360) % 360
      if (ang > 90 && ang < 270) ang -= 180
      const color = isTree ? '#ffffff' : '#1a1a1a'
      if (h > 7) {
        const [nx, ny] = toPage(w / 2, h / 2 - fs * 0.6)
        const [dx, dy] = toPage(w / 2, h / 2 + fs * 0.75)
        labels.push({ s: name, x: nx, y: ny, size: fs, angle: ang, bold: true, color })
        labels.push({ s: `${el.width}m × ${el.height}m`, x: dx, y: dy, size: Math.max(1.3, fs - 0.4), angle: ang, bold: false, color: isTree ? '#f1f5f9' : '#555555' })
      } else {
        labels.push({ s: name, x: cx, y: cy, size: fs, angle: ang, bold: true, color })
      }
    }
  }

  // ── Dibujos: líneas, flechas, cotas y textos ─────────────────────────────
  for (const d of p.drawings) {
    const pts: [number, number][] = []
    for (let i = 0; i + 1 < d.points.length; i += 2) pts.push(P(d.points[i] / PPM, d.points[i + 1] / PPM))
    if (!pts.length) continue
    ctx.strokeStyle = d.color || '#111111'
    ctx.fillStyle = d.color || '#111111'
    ctx.lineWidth = Math.max(0.2, (d.strokeWidth || 2) * 0.12)
    ctx.lineCap = 'round'
    if (d.tool === 'line' || d.tool === 'arrow') {
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1])
      ctx.stroke()
      if (d.tool === 'arrow' && pts.length >= 2) {
        const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1]
        const a = Math.atan2(y2 - y1, x2 - x1), L = 2.4, W = 1.9
        const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a)
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(bx + (W / 2) * Math.cos(a + Math.PI / 2), by + (W / 2) * Math.sin(a + Math.PI / 2))
        ctx.lineTo(bx + (W / 2) * Math.cos(a - Math.PI / 2), by + (W / 2) * Math.sin(a - Math.PI / 2))
        ctx.closePath()
        ctx.fill()
      }
    } else if (d.tool === 'dimension' && pts.length >= 2) {
      const [x1, y1] = pts[0], [x2, y2] = pts[1]
      const len = Math.hypot(x2 - x1, y2 - y1)
      if (len > 0) {
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, t = 1.6
        ctx.strokeStyle = '#111111'
        ctx.lineWidth = 0.2
        ctx.beginPath()
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
        ctx.moveTo(x1 + nx * t, y1 + ny * t); ctx.lineTo(x1 - nx * t, y1 - ny * t)
        ctx.moveTo(x2 + nx * t, y2 + ny * t); ctx.lineTo(x2 - nx * t, y2 - ny * t)
        ctx.stroke()
        let ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
        if (ang > 90 || ang < -90) ang += 180
        const meters = Math.hypot(d.points[2] - d.points[0], d.points[3] - d.points[1]) / PPM
        labels.push({ s: formatMeters(meters, p.decimals), x: (x1 + x2) / 2 + nx * 2, y: (y1 + y2) / 2 + ny * 2, size: 2, angle: ang, bold: false, color: '#111111' })
      }
    } else if (d.tool === 'text' && d.text) {
      // Tamaño en el mundo (como en pantalla), con un mínimo legible.
      const size = Math.max(1.6, ((d.fontSize ?? 14) / PPM) * k)
      text(doc, d.text, pts[0][0], pts[0][1], { size, baseline: 'top', color: d.color || '#111111' })
    }
  }

  // Textos al final, encima de todo.
  for (const l of labels) text(doc, l.s, l.x, l.y, { size: l.size, bold: l.bold, align: 'center', baseline: 'middle', angle: l.angle, color: l.color })

  // ── Recuadro, barra de escala y cajetín ──────────────────────────────────
  doc.setDrawColor('#000000')
  doc.setLineWidth(0.4)
  doc.rect(sheet.frame.x, sheet.frame.y, sheet.frame.w, sheet.frame.h)
  drawScaleBar(doc, denom, sheet.frame.x + 4, sheet.frame.y + sheet.frame.h - 4)
  drawTitleBlock(doc, sheet.titleBlock, p, denom)

  return { doc, scale: denom }
}

function drawScaleBar(doc: jsPDF, denom: number, x: number, y: number) {
  const meters = scaleBarMeters(denom, 40)
  const L = meters * (1000 / denom)
  const segs = 4
  doc.setLineWidth(0.15)
  doc.setDrawColor('#000000')
  for (let i = 0; i < segs; i++) {
    doc.setFillColor(i % 2 === 0 ? '#000000' : '#ffffff')
    doc.rect(x + (L / segs) * i, y - 1.2, L / segs, 1.2, 'FD')
  }
  text(doc, '0', x, y - 1.8, { size: 1.8, align: 'center' })
  text(doc, `${meters} m`, x + L, y - 1.8, { size: 1.8, align: 'center' })
  text(doc, `1:${denom}`, x + L + 3, y, { size: 2.2, bold: true })
}

function drawTitleBlock(doc: jsPDF, r: { x: number; y: number; w: number; h: number }, p: LayoutPdfParams, denom: number) {
  doc.setFillColor('#ffffff')
  doc.setDrawColor('#000000')
  doc.setLineWidth(0.4)
  doc.rect(r.x, r.y, r.w, r.h, 'FD')
  const leftW = 32
  doc.setLineWidth(0.25)
  doc.line(r.x + leftW, r.y, r.x + leftW, r.y + r.h)
  text(doc, 'EventOS', r.x + leftW / 2, r.y + r.h * 0.34, { size: 4, bold: true, align: 'center', baseline: 'middle' })
  text(doc, 'Layout', r.x + leftW / 2, r.y + r.h * 0.56, { size: 3, bold: true, align: 'center', baseline: 'middle' })
  text(doc, p.meta.company ? `by ${p.meta.company}` : 'by Reality Near', r.x + leftW / 2, r.y + r.h * 0.8, { size: 1.7, align: 'center', baseline: 'middle', color: '#666666' })

  const m = p.meta
  const cols: { label: string; value: string }[][] = [
    [{ label: 'PROYECTO', value: m.proyecto }, { label: 'CLIENTE', value: m.cliente }],
    [{ label: 'LUGAR EVENTO', value: m.lugarEvento }, { label: 'FECHA EVENTO', value: m.fechaEvento }],
    [{ label: 'PAX / INVITADOS', value: m.pax }, { label: 'VERSION DEL PLANO', value: versionLabel(p.versionNumber, m.version) }],
    [{ label: 'FECHA DEL PLANO', value: m.fechaPlano }, { label: 'CONTACTO', value: m.contacto }],
    [{ label: 'TELEFONO', value: m.telefono }, { label: 'CORREO', value: m.correo }],
    [{ label: 'ESCALA', value: `1:${denom}` }, { label: 'HOJA', value: paperLabel(p.paper, p.lang) + (p.selectionOnly ? ' · selección' : '') }],
  ]
  const colW = (r.w - leftW) / cols.length
  const rowH = r.h / 2
  cols.forEach((col, ci) => {
    const cx = r.x + leftW + ci * colW
    if (ci > 0) { doc.setLineWidth(0.18); doc.line(cx, r.y, cx, r.y + r.h) }
    col.forEach((f, ri) => {
      const ry = r.y + ri * rowH
      if (ri > 0) { doc.setLineWidth(0.18); doc.line(cx, ry, cx + colW, ry) }
      text(doc, f.label, cx + 1.6, ry + 1.4, { size: 1.6, baseline: 'top', color: '#666666' })
      const v = f.value || '—'
      const size = fitSize(doc, v, 2.9, colW - 3.2, true, 1.5)
      text(doc, v, cx + 1.6, ry + rowH - 1.6, { size, bold: true })
    })
  })
}
