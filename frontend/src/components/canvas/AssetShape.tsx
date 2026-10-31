import { useRef, useCallback } from 'react'
import type Konva from 'konva'
import { Rect, Circle, Ellipse, Text, Group, Shape, Line } from 'react-konva'
import type { LayoutElement } from '@/types/layout'
import { elementAreaMeters } from '@/lib/drawingMath'
import { PIXELS_PER_METER } from './constants'

// ── Individual placed asset ───────────────────────────────────────────────────

export interface AssetShapeProps {
  element: LayoutElement
  isSelected: boolean
  interactive: boolean
  onSelect: (shiftKey: boolean) => void
  onDragStart: () => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  onTransformEnd: (x: number, y: number, w: number, h: number, rotation: number) => void
  displayName: string
}

export default function AssetShape({
  element, displayName, isSelected, interactive,
  onSelect, onDragStart, onDragMove, onDragEnd, onTransformEnd,
}: AssetShapeProps) {
  const groupRef = useRef<Konva.Group>(null)

  const px = element.x * PIXELS_PER_METER
  const py = element.y * PIXELS_PER_METER
  const pw = element.width * PIXELS_PER_METER
  const ph = element.height * PIXELS_PER_METER

  const isCircle = element.shape === 'circle'
  const isOval = element.shape === 'oval'
  const isRoundedRect = element.shape === 'rounded-rect'
  const isTree = element.shape === 'tree'
  const isPolygon = element.shape === 'polygon'
  const radius = Math.min(pw, ph) / 2
  const fontSize = Math.min(13, Math.max(8, Math.min(pw, ph) / 4))
  // Bounding-box dims would be misleading printed over an irregular
  // polygon (e.g. an L-shape), so it's excluded the same way `tree` is.
  const showLabel = !isTree && !isPolygon && pw > 30 && ph > 16

  const baseOpacity = element.opacity ?? 0.65

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    const newW = Math.max(0.5, Math.round((element.width * scaleX) * 10) / 10)
    const newH = Math.max(0.5, Math.round((element.height * scaleY) * 10) / 10)
    onTransformEnd(
      Math.round((node.x() / PIXELS_PER_METER) * 10) / 10,
      Math.round((node.y() / PIXELS_PER_METER) * 10) / 10,
      newW, newH,
      Math.round(node.rotation()),
    )
  }, [element.width, element.height, onTransformEnd])

  const shapeStyle = {
    fill: element.color,
    opacity: isSelected ? Math.min(1, baseOpacity + 0.2) : baseOpacity,
    stroke: isSelected ? '#f8fafc' : element.color,
    strokeWidth: isSelected ? 1.5 : 0.5,
  }

  return (
    <Group
      id={element.id}
      ref={groupRef}
      x={px}
      y={py}
      rotation={element.rotation}
      draggable={interactive && !element.locked}
      onClick={interactive ? (e => onSelect(e.evt.shiftKey)) : undefined}
      onTap={interactive ? () => onSelect(false) : undefined}
      onDragStart={interactive ? onDragStart : undefined}
      onDragMove={interactive ? (e => onDragMove(e.target.x(), e.target.y())) : undefined}
      onDragEnd={interactive ? (e => onDragEnd(e.target.x(), e.target.y())) : undefined}
      onTransformEnd={handleTransformEnd}
    >
      {/* Flip lives on its own inner Group, decoupled from the outer Group's
          drag/rotate/resize (Transformer manipulates the outer Group's own
          scaleX/scaleY during resize, then handleTransformEnd resets it to
          1 — mixing that with a persistent flip scale would corrupt both).
          offsetX/Y = pw/ph mirrors content in place around its own center
          without shifting the outer bounding box or touching the rotation
          pivot (still the outer Group's x,y, unaffected by this nesting). */}
      <Group
        offsetX={element.flipX ? pw : 0}
        offsetY={element.flipY ? ph : 0}
        scaleX={element.flipX ? -1 : 1}
        scaleY={element.flipY ? -1 : 1}
      >
        {isCircle ? (
          <Circle x={pw / 2} y={ph / 2} radius={radius} {...shapeStyle} />
        ) : isOval ? (
          <Ellipse x={pw / 2} y={ph / 2} radiusX={pw / 2} radiusY={ph / 2} {...shapeStyle} />
        ) : isRoundedRect ? (
          <Rect width={pw} height={ph} cornerRadius={Math.min(pw, ph) * 0.25} {...shapeStyle} />
        ) : isPolygon ? (
          <Line points={(element.points ?? []).map(v => v * PIXELS_PER_METER)} closed {...shapeStyle} />
        ) : isTree ? (
          <Group>
            <Circle x={pw / 2} y={ph / 2} radius={radius} {...shapeStyle} />
            <Circle
              x={pw / 2} y={ph / 2}
              radius={radius * 0.42}
              fill="rgba(255,255,255,0.18)"
              stroke="transparent"
              strokeWidth={0}
              listening={false}
            />
          </Group>
        ) : (
          <Rect width={pw} height={ph} cornerRadius={2} {...shapeStyle} />
        )}

        {showLabel && (
          <Text
            text={displayName}
            width={pw}
            height={ph * 0.6}
            y={isCircle ? ph * 0.2 : 0}
            align="center"
            verticalAlign="middle"
            fill="#f8fafc"
            fontSize={fontSize}
            fontFamily="ui-monospace, monospace"
            fontStyle="500"
            listening={false}
            ellipsis
            wrap="none"
          />
        )}

        {showLabel && (
          <Text
            text={`${element.width}m × ${element.height}m`}
            width={pw}
            height={ph * 0.4}
            y={isCircle ? ph * 0.5 : ph * 0.6}
            align="center"
            verticalAlign="middle"
            fill="rgba(248,250,252,0.55)"
            fontSize={Math.min(10, fontSize - 1)}
            fontFamily="ui-monospace, monospace"
            listening={false}
          />
        )}
      </Group>
    </Group>
  )
}
