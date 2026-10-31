// Export del plano a PNG (captura de la vista + cajetín) y a PDF (redibujo en
// blanco y negro de todas las piezas + cajetín). Movido tal cual desde
// LayoutCanvas.tsx (bloque 3): mismo resultado, byte a byte.
import type Konva from 'konva'
import jsPDF from 'jspdf'
import type { LayoutElement, DrawingPrimitive, LayoutMeta, VenueBackground } from '@/types/layout'
import { formatMeters } from '@/lib/dimension'
import { FOOTER_HEIGHT_PX } from '@/components/FooterLegend'
import { exportFileName } from '@/lib/layoutVersion'
import { getAssetName, type Lang } from '@/context/LangContext'
import { EXPORT_RATIO, PIXELS_PER_METER } from './constants'
import { renderFooterToCanvas, renderFooterPDF } from './titleBlock'

type Size = { width: number; height: number } | null

export function exportLayoutPng(stageArg: Konva.Stage | null, containerSize: Size, layoutMeta: LayoutMeta, versionNumber: number) {
    const stage = stageArg
    if (!stage || !containerSize) return

    const stageDataURL = stage.toDataURL({ pixelRatio: EXPORT_RATIO })
    const img = new Image()
    img.onload = () => {
      const ew = containerSize.width * EXPORT_RATIO
      const eh = (containerSize.height + FOOTER_HEIGHT_PX) * EXPORT_RATIO

      const canvas = document.createElement('canvas')
      canvas.width = ew
      canvas.height = eh

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Dark background (transparent areas of stage become dark)
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, ew, eh)

      // Stage content (already EXPORT_RATIO-scaled)
      ctx.drawImage(img, 0, 0)

      // Footer — scale context so renderFooterToCanvas works in CSS pixels
      ctx.save()
      ctx.scale(EXPORT_RATIO, EXPORT_RATIO)
      renderFooterToCanvas(ctx, containerSize.width, containerSize.height, FOOTER_HEIGHT_PX, layoutMeta, versionNumber)
      ctx.restore()

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = exportFileName(layoutMeta.proyecto, versionNumber, 'png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    img.src = stageDataURL
}

export function exportLayoutPdf(params: {
  containerSize: Size
  elements: LayoutElement[]
  drawings: DrawingPrimitive[]
  layoutMeta: LayoutMeta
  versionNumber: number
  lang: Lang
  // Bloque 5: decimales de muros/cotas y plano del local de fondo.
  dimensionDecimals?: number
  background?: VenueBackground
  backgroundImage?: HTMLImageElement | null
}) {
  const { containerSize, elements, drawings, layoutMeta, versionNumber, lang } = params
  const decimals = params.dimensionDecimals ?? 2
  const bg = params.background && params.backgroundImage ? params.background : undefined
    if (!containerSize || (!elements.length && !bg)) return

    const PADDING = 40
    const PPM = PIXELS_PER_METER

    // Calcular bounding box de todos los elementos + drawings (líneas/flechas/texto)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of elements) {
      minX = Math.min(minX, el.x * PPM)
      minY = Math.min(minY, el.y * PPM)
      maxX = Math.max(maxX, (el.x + el.width) * PPM)
      maxY = Math.max(maxY, (el.y + el.height) * PPM)
    }
    if (bg) {
      minX = Math.min(minX, bg.x * PPM)
      minY = Math.min(minY, bg.y * PPM)
      maxX = Math.max(maxX, (bg.x + bg.width) * PPM)
      maxY = Math.max(maxY, (bg.y + bg.height) * PPM)
    }
    // drawing.points ya están en world-pixel coords (mismo espacio que el.x * PPM)
    for (const drw of drawings) {
      for (let i = 0; i < drw.points.length; i += 2) {
        minX = Math.min(minX, drw.points[i])
        minY = Math.min(minY, drw.points[i + 1])
        maxX = Math.max(maxX, drw.points[i])
        maxY = Math.max(maxY, drw.points[i + 1])
      }
    }

    const contentW = maxX - minX + PADDING * 2
    const contentH = maxY - minY + PADDING * 2
    const FOOTER_H = FOOTER_HEIGHT_PX
    const SCALE = 2

    const canvasW = contentW * SCALE
    const canvasH = (contentH + FOOTER_H) * SCALE

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.save()
    ctx.scale(SCALE, SCALE)

    // Borde exterior del plano
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.strokeRect(8, 8, contentW - 16, contentH - 16)

    // Dibujar elementos
    const offsetX = -minX + PADDING
    const offsetY = -minY + PADDING

    // Plano del local de fondo, debajo de todo y con su transparencia.
    if (bg && params.backgroundImage) {
      ctx.save()
      ctx.globalAlpha = bg.opacity
      ctx.drawImage(params.backgroundImage, bg.x * PPM + offsetX, bg.y * PPM + offsetY, bg.width * PPM, bg.height * PPM)
      ctx.restore()
    }

    for (const el of elements) {
      const x = el.x * PPM + offsetX
      const y = el.y * PPM + offsetY
      const w = el.width * PPM
      const h = el.height * PPM

      const isTree = el.shape === 'tree'
      const isCircle = el.shape === 'circle'
      const isOval = el.shape === 'oval'
      const isPolygon = el.shape === 'polygon'
      const isWall = el.shape === 'wall'

      // Color: árbol=verde, color custom respetado, resto blanco
      const DEFAULT_COLORS = ['#6366f1','#0891b2','#f59e0b','#ef4444','#22c55e','#a855f7','#16a34a']
      const hasCustomColor = !DEFAULT_COLORS.includes(el.color)
      const fillColor = isTree ? '#16a34a' : hasCustomColor ? el.color : '#ffffff'
      const strokeColor = '#1a1a1a'

      // Pivote de rotación en (x, y) — esquina superior-izquierda —
      // igual que el Group de Konva en pantalla (sin offsetX/offsetY),
      // para que la orientación coincida exactamente con el canvas.
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((el.rotation * Math.PI) / 180)

      // Flip — misma matemática que el Group interno en pantalla
      // (offsetX/Y=w/h + scale -1), aplicado DESPUÉS de la rotación para
      // que el pivote de rotación (arriba) no se vea afectado.
      if (el.flipX) { ctx.translate(w, 0); ctx.scale(-1, 1) }
      if (el.flipY) { ctx.translate(0, h); ctx.scale(1, -1) }

      ctx.fillStyle = fillColor
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1.5

      if (isCircle || isTree) {
        const r = Math.min(w, h) / 2
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (isOval) {
        ctx.beginPath()
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (isWall && el.points && el.points.length >= 4) {
        // Muro: trazo negro con el grosor real + medida de cada tramo.
        const pts = el.points.map(v => v * PPM)
        const n = pts.length / 2
        const closed = !!el.closed && n >= 3
        ctx.strokeStyle = '#111111'
        ctx.lineWidth = Math.max(1, (el.thickness ?? 0.15) * PPM)
        ctx.lineJoin = 'miter'
        ctx.lineCap = 'square'
        ctx.beginPath()
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
        if (closed) ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = '#333333'
        ctx.font = '9px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const segs = closed ? n : n - 1
        for (let i = 0; i < segs; i++) {
          const j = (i + 1) % n
          const x1 = pts[i * 2], y1 = pts[i * 2 + 1], x2 = pts[j * 2], y2 = pts[j * 2 + 1]
          const len = Math.hypot(x2 - x1, y2 - y1)
          if (len < 20) continue
          const off = ctx.lineWidth / 2 + 7
          ctx.fillText(formatMeters(len / PPM, decimals), (x1 + x2) / 2 - ((y2 - y1) / len) * off, (y1 + y2) / 2 + ((x2 - x1) / len) * off)
        }
      } else if (isPolygon && el.points && el.points.length >= 6) {
        // el.points are meter offsets relative to (x,y) — same convention
        // as w/h above, so *PPM gives the same local pixel space already
        // established by the translate/rotate/flip block.
        ctx.beginPath()
        ctx.moveTo(el.points[0] * PPM, el.points[1] * PPM)
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(el.points[i] * PPM, el.points[i + 1] * PPM)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.rect(0, 0, w, h)
        ctx.fill()
        ctx.stroke()
      }

      // Label — bounding-box dims would be misleading over an irregular
      // polygon (e.g. an L-shape), so it's skipped there too.
      if (w > 20 && h > 12 && !isPolygon && !isWall) {
        ctx.fillStyle = isTree ? '#ffffff' : '#1a1a1a'
        const fontSize = Math.min(11, Math.max(7, Math.min(w, h) / 4))
        ctx.font = `600 ${fontSize}px ui-monospace, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(getAssetName(lang, el.name), w / 2, h > 20 ? h / 2 - h / 6 : h / 2)

        if (h > 24) {
          ctx.font = `${fontSize - 1}px ui-monospace, monospace`
          ctx.fillStyle = isTree ? 'rgba(255,255,255,0.8)' : '#555'
          ctx.fillText(`${el.width}m × ${el.height}m`, w / 2, h / 2 + h / 6)
        }
      }

      ctx.restore()
    }

    // Dibujar drawings (líneas, flechas, anotaciones de texto) — mismo
    // color/grosor/opacidad que en pantalla (ver DrawingShape), trasladados
    // con el mismo offsetX/offsetY que los elementos.
    for (const drw of drawings) {
      ctx.save()
      ctx.globalAlpha = drw.opacity ?? 1
      ctx.strokeStyle = drw.color
      ctx.fillStyle = drw.color
      ctx.lineWidth = drw.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (drw.tool === 'line') {
        ctx.beginPath()
        ctx.moveTo(drw.points[0] + offsetX, drw.points[1] + offsetY)
        for (let i = 2; i < drw.points.length; i += 2) {
          ctx.lineTo(drw.points[i] + offsetX, drw.points[i + 1] + offsetY)
        }
        ctx.stroke()
      } else if (drw.tool === 'arrow') {
        const x1 = drw.points[0] + offsetX
        const y1 = drw.points[1] + offsetY
        const x2 = drw.points[drw.points.length - 2] + offsetX
        const y2 = drw.points[drw.points.length - 1] + offsetY

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // Cabeza de flecha (pointerLength=10, pointerWidth=8 — igual que <Arrow> en pantalla)
        const POINTER_LENGTH = 10
        const POINTER_WIDTH = 8
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const baseX = x2 - POINTER_LENGTH * Math.cos(angle)
        const baseY = y2 - POINTER_LENGTH * Math.sin(angle)
        const leftX = baseX + (POINTER_WIDTH / 2) * Math.cos(angle + Math.PI / 2)
        const leftY = baseY + (POINTER_WIDTH / 2) * Math.sin(angle + Math.PI / 2)
        const rightX = baseX + (POINTER_WIDTH / 2) * Math.cos(angle - Math.PI / 2)
        const rightY = baseY + (POINTER_WIDTH / 2) * Math.sin(angle - Math.PI / 2)

        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(leftX, leftY)
        ctx.lineTo(rightX, rightY)
        ctx.closePath()
        ctx.fill()
      } else if (drw.tool === 'dimension') {
        // Cota: línea con topes y la medida en el medio (como en pantalla).
        const x1 = drw.points[0] + offsetX, y1 = drw.points[1] + offsetY
        const x2 = drw.points[2] + offsetX, y2 = drw.points[3] + offsetY
        const len = Math.hypot(x2 - x1, y2 - y1)
        if (len > 0) {
          const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
          ctx.strokeStyle = '#111111'
          ctx.fillStyle = '#111111'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
          ctx.moveTo(x1 + nx * 7, y1 + ny * 7); ctx.lineTo(x1 - nx * 7, y1 - ny * 7)
          ctx.moveTo(x2 + nx * 7, y2 + ny * 7); ctx.lineTo(x2 - nx * 7, y2 - ny * 7)
          ctx.stroke()
          let ang = Math.atan2(y2 - y1, x2 - x1)
          if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI
          ctx.save()
          ctx.translate((x1 + x2) / 2 + nx * 9, (y1 + y2) / 2 + ny * 9)
          ctx.rotate(ang)
          ctx.font = '10px ui-monospace, monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(formatMeters(len / PPM, decimals), 0, 0)
          ctx.restore()
        }
      } else if (drw.tool === 'text' && drw.text) {
        ctx.font = `${drw.fontSize ?? 14}px ui-monospace, monospace`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(drw.text, drw.points[0] + offsetX, drw.points[1] + offsetY)
      }

      ctx.restore()
    }

    // Footer
    renderFooterPDF(ctx, contentW, contentH, FOOTER_H, layoutMeta, versionNumber)

    ctx.restore()

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: contentW > contentH ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvasW, canvasH],
    })
    pdf.addImage(imgData, 'PNG', 0, 0, canvasW, canvasH)
    pdf.save(exportFileName(layoutMeta.proyecto, versionNumber, 'pdf'))
}
