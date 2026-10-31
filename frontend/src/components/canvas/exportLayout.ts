// Export del plano a PNG: la vista actual o solo lo seleccionado, con el
// cajetín. El PDF vive en pdfExport.ts (bloque 8).
import type Konva from 'konva'
import type { LayoutElement, DrawingPrimitive, LayoutMeta, VenueBackground } from '@/types/layout'
import { flattenPath, sideInfo } from '@/lib/curves'
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

// PNG de lo seleccionado (bloque 8): la zona de la selección (lo demás ya
// está oculto) con el cajetín debajo. El cajetín necesita un ancho mínimo
// para leerse: si la zona es angosta, se centra en una hoja más ancha.
export function exportSelectionPng(stage: Konva.Stage, region: { x: number; y: number; width: number; height: number }, layoutMeta: LayoutMeta, versionNumber: number) {
  const MIN_W = 960
  // Una selección chica se agranda hasta ocupar ~el ancho del cajetín.
  const grow = Math.min(8, Math.max(1, Math.min((MIN_W * 0.85) / Math.max(region.width, 1), 560 / Math.max(region.height, 1))))
  const regW = region.width * grow, regH = region.height * grow
  const ratio = EXPORT_RATIO
  const shot = stage.toCanvas({ ...region, pixelRatio: ratio * grow })
  const cssW = Math.max(MIN_W, regW)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cssW * ratio)
  canvas.height = Math.round((regH + FOOTER_HEIGHT_PX) * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#020617'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(shot, Math.round(((cssW - regW) / 2) * ratio), 0)
  ctx.save()
  ctx.scale(ratio, ratio)
  renderFooterToCanvas(ctx, cssW, regH, FOOTER_HEIGHT_PX, layoutMeta, versionNumber)
  ctx.restore()
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = exportFileName(layoutMeta.proyecto, versionNumber, 'png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
