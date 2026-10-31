import type Konva from 'konva'
import { Line, Arrow, Text } from 'react-konva'
import type { DrawingPrimitive } from '@/types/layout'
import { DRAW_COLOR, DRAW_STROKE } from './constants'

// ── Drawing primitive renderer ────────────────────────────────────────────────

export interface DrawingShapeProps {
  drawing: DrawingPrimitive
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
  onMoveDrawing?: (newPoints: number[]) => void
  onPushHistory?: () => void
}

export function DrawingShape({ drawing, isSelected, interactive, onSelect, onMoveDrawing, onPushHistory }: DrawingShapeProps) {
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
