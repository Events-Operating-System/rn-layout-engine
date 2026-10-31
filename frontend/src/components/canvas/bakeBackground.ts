// Plano del local para el PDF (bloque 8): una sola imagen JPEG con la
// transparencia ya mezclada con blanco (jsPDF no aplica globalAlpha) y con
// la resolución justa para la hoja (150 ppp sobre su tamaño impreso). Antes
// iba el plano entero en PNG a resolución de pantalla: 5,4 MB.
import type { VenueBackground } from '@/types/layout'
import type { Bounds } from '@/lib/pdfLayout'
import type { BakedBackground } from './pdfExport'

const DPI = 150
const MAX_SIDE = 3500

export function bakeBackground(bg: VenueBackground, img: HTMLImageElement, region: Bounds | null, mmPerM: number): BakedBackground | null {
  const x0 = Math.max(bg.x, region?.minX ?? -Infinity)
  const y0 = Math.max(bg.y, region?.minY ?? -Infinity)
  const x1 = Math.min(bg.x + bg.width, region?.maxX ?? Infinity)
  const y1 = Math.min(bg.y + bg.height, region?.maxY ?? Infinity)
  const w = x1 - x0, h = y1 - y0
  if (w <= 0 || h <= 0 || !img.naturalWidth) return null
  const pxPerM = (mmPerM / 25.4) * DPI
  let outW = w * pxPerM, outH = h * pxPerM
  const shrink = Math.min(1, MAX_SIDE / Math.max(outW, outH))
  outW = Math.max(1, Math.round(outW * shrink)); outH = Math.max(1, Math.round(outH * shrink))
  const sx = ((x0 - bg.x) / bg.width) * img.naturalWidth
  const sy = ((y0 - bg.y) / bg.height) * img.naturalHeight
  const sw = (w / bg.width) * img.naturalWidth
  const sh = (h / bg.height) * img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outW, outH)
  ctx.globalAlpha = bg.opacity
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.8), x: x0, y: y0, width: w, height: h }
}
