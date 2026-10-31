import type Konva from 'konva'
import { Line, Arrow, Text, Group } from 'react-konva'
import { formatMeters } from '@/lib/dimension'
import type { DrawingPrimitive } from '@/types/layout'
import { DRAW_COLOR, DRAW_STROKE, PIXELS_PER_METER } from './constants'

// ── Drawing primitive renderer ────────────────────────────────────────────────

export interface DrawingShapeProps {
  drawing: DrawingPrimitive
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
  onMoveDrawing?: (newPoints: number[]) => void
  onPushHistory?: () => void
  // Decimales de las cotas (ajuste de la org).
  decimals?: number
}

export function DrawingShape({ drawing, isSelected, interactive, onSelect, onMoveDrawing, onPushHistory, decimals = 2 }: DrawingShapeProps) {
  const opacity = drawing.opacity ?? 1

  const handleDragEnd = interactive && onMoveDrawing
    ? (e: Konva.KonvaEventObject<DragEvent>) => {
        onPushHistory?.()
        if (drawing.tool === 'text') {
          // Text position is absolute — use final position directly
          onMoveDrawing([e.target.x(), e.target.y()])
        } else {
          // Line/Arrow position is relative — apply offset to all points
          const ox = e.target.x()
          const oy = e.target.y()
          e.target.x(0)
          e.target.y(0)
          onMoveDrawing(drawing.points.map((p, i) => i % 2 === 0 ? p + ox : p + oy))
        }
      }
    : undefined

  const clickProps = {
    listening: interactive,
    onClick: interactive ? onSelect : undefined,
    onTap: interactive ? onSelect : undefined,
    hitStrokeWidth: 12,
    shadowEnabled: isSelected,
    shadowColor: '#60a5fa',
    shadowBlur: 10,
    shadowOpacity: 0.85,
    draggable: interactive,
    onDragEnd: handleDragEnd,
  }

  if (drawing.tool === 'line') {
    return (
      <Line
        points={drawing.points}
        stroke={drawing.color}
        strokeWidth={drawing.strokeWidth}
        lineCap="round"
        lineJoin="round"
        opacity={opacity}
        {...clickProps}
      />
    )
  }
  if (drawing.tool === 'arrow') {
    return (
      <Arrow
        points={drawing.points}
        stroke={drawing.color}
        fill={drawing.color}
        strokeWidth={drawing.strokeWidth}
        pointerWidth={8}
        pointerLength={10}
        lineCap="round"
        opacity={opacity}
        {...clickProps}
      />
    )
  }
  if (drawing.tool === 'dimension') {
    return <DimensionShape drawing={drawing} decimals={decimals} opacity={opacity} clickProps={clickProps} />
  }
  if (drawing.tool === 'text' && drawing.text) {
    return (
      <Text
        x={drawing.points[0]}
        y={drawing.points[1]}
        text={drawing.text}
        fill={drawing.color}
        fontSize={drawing.fontSize ?? 14}
        fontFamily="ui-monospace, monospace"
        opacity={opacity}
        {...clickProps}
      />
    )
  }
  return null
}

// ── In-progress drawing preview ───────────────────────────────────────────────

export function DrawingPreview({ tool, points }: { tool: string; points: number[] }) {
  if (tool === 'arrow') {
    return (
      <Arrow
        points={points}
        stroke={DRAW_COLOR}
        fill={DRAW_COLOR}
        strokeWidth={DRAW_STROKE}
        dash={[6, 4]}
        pointerWidth={8}
        pointerLength={10}
        lineCap="round"
        listening={false}
        opacity={0.7}
      />
    )
  }
  return (
    <Line
      points={points}
      stroke={DRAW_COLOR}
      strokeWidth={DRAW_STROKE}
      dash={[6, 4]}
      lineCap="round"
      listening={false}
      opacity={0.7}
    />
  )
}

// Cota: línea con topes perpendiculares en los extremos y la medida en el
// medio, siempre legible (nunca cabeza abajo). La medida sale de los puntos,
// así que al mover o estirar la cota se actualiza sola.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DimensionShape({ drawing, decimals, opacity, clickProps }: { drawing: DrawingPrimitive; decimals: number; opacity: number; clickProps: any }) {
  const [x1, y1, x2, y2] = drawing.points
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (!(len > 0)) return null
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len
  const nx = -uy, ny = ux
  const tick = 7
  let ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  if (ang > 90 || ang < -90) ang += 180
  const text = formatMeters(len / PIXELS_PER_METER, decimals)
  const { onDragEnd, draggable, listening, onClick, onTap, ...lineHit } = clickProps
  return (
    <Group draggable={draggable} listening={listening} onClick={onClick} onTap={onTap} onDragEnd={onDragEnd} opacity={opacity}>
      <Line points={[x1, y1, x2, y2]} stroke={drawing.color} strokeWidth={drawing.strokeWidth || 1.5} {...lineHit} />
      <Line points={[x1 + nx * tick, y1 + ny * tick, x1 - nx * tick, y1 - ny * tick]} stroke={drawing.color} strokeWidth={drawing.strokeWidth || 1.5} listening={false} />
      <Line points={[x2 + nx * tick, y2 + ny * tick, x2 - nx * tick, y2 - ny * tick]} stroke={drawing.color} strokeWidth={drawing.strokeWidth || 1.5} listening={false} />
      <Text
        x={(x1 + x2) / 2 + nx * 9}
        y={(y1 + y2) / 2 + ny * 9}
        rotation={ang}
        text={text}
        offsetX={text.length * 3.2}
        offsetY={6}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill={drawing.color}
        listening={false}
      />
    </Group>
  )
}
