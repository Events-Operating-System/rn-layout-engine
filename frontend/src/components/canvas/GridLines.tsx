import type Konva from 'konva'
import { Shape } from 'react-konva'
import { GRID_METERS, GRID_TOTAL_PX, PIXELS_PER_METER } from './constants'

// ── Grid lines ────────────────────────────────────────────────────────────────

export default function GridLines() {
  return (
    <Shape
      width={GRID_TOTAL_PX}
      height={GRID_TOTAL_PX}
      sceneFunc={(ctx: Konva.Context) => {
        const nc = (ctx as unknown as { _context: CanvasRenderingContext2D })._context
        nc.save()

        // 5m grid — very faint
        nc.strokeStyle = 'rgba(148, 163, 184, 0.07)'
        nc.lineWidth = 0.5
        nc.beginPath()
        for (let i = 0; i <= GRID_METERS; i += 5) {
          const p = i * PIXELS_PER_METER
          nc.moveTo(p, 0); nc.lineTo(p, GRID_TOTAL_PX)
          nc.moveTo(0, p); nc.lineTo(GRID_TOTAL_PX, p)
        }
        nc.stroke()

        // 10m grid — slightly more visible
        nc.strokeStyle = 'rgba(148, 163, 184, 0.14)'
        nc.lineWidth = 0.7
        nc.beginPath()
        for (let i = 0; i <= GRID_METERS; i += 10) {
          const p = i * PIXELS_PER_METER
          nc.moveTo(p, 0); nc.lineTo(p, GRID_TOTAL_PX)
          nc.moveTo(0, p); nc.lineTo(GRID_TOTAL_PX, p)
        }
        nc.stroke()

        // Boundary
        nc.strokeStyle = 'rgba(148, 163, 184, 0.25)'
        nc.lineWidth = 1
        nc.strokeRect(0, 0, GRID_TOTAL_PX, GRID_TOTAL_PX)

        nc.restore()
      }}
    />
  )
}
