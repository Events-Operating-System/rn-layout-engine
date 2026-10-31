// Cajetín de los exports (PNG oscuro y PDF blanco). Mismo orden de casillas
// que FooterLegend en pantalla.
import type { LayoutMeta } from '@/types/layout'
import { versionLabel } from '@/lib/layoutVersion'

// ── Footer renderer (PNG export only) ────────────────────────────────────────

function fillTextTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  if (!text || ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1)
  }
  ctx.fillText(s + '…', x, y)
}

// Shrinks font size until text fits rather than truncating
function fillTextAdaptive(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minSizePx = 7,
) {
  if (!text) { ctx.fillText(text, x, y); return }
  const sizeMatch = ctx.font.match(/(\d+(?:\.\d+)?)px/)
  const baseFont = ctx.font
  let size = sizeMatch ? parseFloat(sizeMatch[1]) : 10
  while (size > minSizePx && ctx.measureText(text).width > maxWidth) {
    size--
    ctx.font = baseFont.replace(/\d+(?:\.\d+)?px/, `${size}px`)
  }
  ctx.fillText(text, x, y)
  ctx.font = baseFont
}

// Mismo orden que FooterLegend (pantalla): 5 columnas × 2 filas.
export function titleBlockColumns(meta: LayoutMeta, versionNumber: number) {
  return [
    [{ label: 'PROYECTO', value: meta.proyecto }, { label: 'CLIENTE', value: meta.cliente }],
    [{ label: 'LUGAR EVENTO', value: meta.lugarEvento }, { label: 'FECHA EVENTO', value: meta.fechaEvento }],
    [{ label: 'PAX / INVITADOS', value: meta.pax }, { label: 'VERSION DEL PLANO', value: versionLabel(versionNumber, meta.version) }],
    [{ label: 'FECHA DEL PLANO', value: meta.fechaPlano }, { label: 'CONTACTO', value: meta.contacto }],
    [{ label: 'TELEFONO', value: meta.telefono }, { label: 'CORREO', value: meta.correo }],
  ]
}

export function renderFooterToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  yOffset: number,
  footerHeight: number,
  meta: LayoutMeta,
  versionNumber: number,
) {
  const leftW = 176

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, yOffset, width, footerHeight)

  // Top border
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, yOffset)
  ctx.lineTo(width, yOffset)
  ctx.stroke()

  // Product name "EventOS Layout"
  ctx.fillStyle = '#f1f5f9'
  ctx.font = 'bold 12px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('EventOS Layout', 6, yOffset + footerHeight * 0.25)

  // "powered by" label
  ctx.fillStyle = '#475569'
  ctx.font = '7px ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText('powered by', 6, yOffset + footerHeight * 0.52)

  // Company name
  ctx.fillStyle = '#94a3b8'
  ctx.font = '9px ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  fillTextTruncated(ctx, meta.company || 'Reality Near', 6, yOffset + footerHeight * 0.78, leftW - 12)

  // Left block divider
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftW, yOffset)
  ctx.lineTo(leftW, yOffset + footerHeight)
  ctx.stroke()

  // Right 5-column metadata grid
  const rightW = width - leftW
  const colW = rightW / 5
  const rowH = footerHeight / 2

  const cols = titleBlockColumns(meta, versionNumber)

  ctx.textAlign = 'left'

  cols.forEach((col, ci) => {
    const cx = leftW + ci * colW

    if (ci > 0) {
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, yOffset)
      ctx.lineTo(cx, yOffset + footerHeight)
      ctx.stroke()
    }

    col.forEach((field, ri) => {
      const ry = yOffset + ri * rowH

      if (ri > 0) {
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, ry)
        ctx.lineTo(cx + colW, ry)
        ctx.stroke()
      }

      if (!field.label) return

      ctx.fillStyle = '#475569'
      ctx.font = '7px ui-monospace, monospace'
      ctx.textBaseline = 'top'
      ctx.fillText(field.label, cx + 6, ry + 5)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '10px ui-monospace, monospace'
      ctx.textBaseline = 'bottom'
      fillTextAdaptive(ctx, field.value || '—', cx + 6, ry + rowH - 5, colW - 14)
    })
  })
}

export function renderFooterPDF(
  ctx: CanvasRenderingContext2D,
  width: number,
  yOffset: number,
  footerHeight: number,
  meta: LayoutMeta,
  versionNumber: number,
) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, yOffset, width, footerHeight)

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5
  ctx.strokeRect(0, yOffset, width, footerHeight)

  const leftW = 120
  const rightW = width - leftW
  const colCount = 5
  const colW = rightW / colCount
  const rowH = footerHeight / 2

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftW, yOffset)
  ctx.lineTo(leftW, yOffset + footerHeight)
  ctx.stroke()

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 14px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('EventOS', leftW / 2, yOffset + footerHeight * 0.28)
  ctx.font = 'bold 11px ui-monospace, monospace'
  ctx.fillText('Layout', leftW / 2, yOffset + footerHeight * 0.52)
  ctx.fillStyle = '#666666'
  ctx.font = '7px ui-monospace, monospace'
  ctx.fillText('by Reality Near', leftW / 2, yOffset + footerHeight * 0.76)

  const cols = titleBlockColumns(meta, versionNumber)

  cols.forEach((col, ci) => {
    const cx = leftW + ci * colW

    if (ci > 0) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 0.75
      ctx.beginPath()
      ctx.moveTo(cx, yOffset)
      ctx.lineTo(cx, yOffset + footerHeight)
      ctx.stroke()
    }

    col.forEach((field, ri) => {
      const ry = yOffset + ri * rowH

      if (ri > 0) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 0.75
        ctx.beginPath()
        ctx.moveTo(cx, ry)
        ctx.lineTo(cx + colW, ry)
        ctx.stroke()
      }

      if (!field.label) return

      ctx.fillStyle = '#666666'
      ctx.font = '7px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(field.label, cx + 6, ry + 5)

      ctx.fillStyle = '#000000'
      ctx.font = 'bold 11px ui-monospace, monospace'
      ctx.textBaseline = 'bottom'
      fillTextAdaptive(ctx, field.value || '—', cx + 6, ry + rowH - 5, colW - 12, 5)
    })
  })
}
