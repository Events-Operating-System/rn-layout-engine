// "Ajustar a pantalla": viewport que encuadra todo el plano (piezas y
// dibujos) en el área visible, con margen. Sin dependencias de React/Konva.

interface Box { x: number; y: number; width: number; height: number; rotation?: number }
interface Drawing { points: number[] }

export interface FitViewport { x: number; y: number; scale: number }

const MARGIN_PX = 48

export function fitViewportToContent(
  elements: Box[],
  drawings: Drawing[],
  container: { width: number; height: number },
  pixelsPerMeter: number,
  minScale: number,
  maxScale: number,
): FitViewport | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    // Caja que contiene la pieza rotada (rota sobre su esquina x,y, como Konva).
    const w = el.width * pixelsPerMeter
    const h = el.height * pixelsPerMeter
    const ox = el.x * pixelsPerMeter
    const oy = el.y * pixelsPerMeter
    const rad = ((el.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    for (const [dx, dy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const px = ox + dx * cos - dy * sin
      const py = oy + dx * sin + dy * cos
      minX = Math.min(minX, px); maxX = Math.max(maxX, px)
      minY = Math.min(minY, py); maxY = Math.max(maxY, py)
    }
  }
  for (const d of drawings) {
    for (let i = 0; i + 1 < d.points.length; i += 2) {
      minX = Math.min(minX, d.points[i]); maxX = Math.max(maxX, d.points[i])
      minY = Math.min(minY, d.points[i + 1]); maxY = Math.max(maxY, d.points[i + 1])
    }
  }
  if (!Number.isFinite(minX)) return null

  const contentW = Math.max(maxX - minX, pixelsPerMeter)
  const contentH = Math.max(maxY - minY, pixelsPerMeter)
  const availW = Math.max(container.width - MARGIN_PX * 2, 1)
  const availH = Math.max(container.height - MARGIN_PX * 2, 1)
  const scale = Math.min(maxScale, Math.max(minScale, Math.min(availW / contentW, availH / contentH)))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    scale,
    x: container.width / 2 - cx * scale,
    y: container.height / 2 - cy * scale,
  }
}
