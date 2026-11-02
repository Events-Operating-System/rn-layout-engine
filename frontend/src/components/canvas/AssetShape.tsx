import { useRef, useCallback } from 'react'
import type Konva from 'konva'
import { Rect, Circle, Ellipse, Text, Group, Shape, Line } from 'react-konva'
import type { LayoutElement } from '@/types/layout'
import { elementAreaMeters } from '@/lib/drawingMath'
import { formatMeters } from '@/lib/dimension'
import { flattenPath, sideInfo } from '@/lib/curves'
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
  // Decimales de las medidas de los muros (ajuste de la org).
  decimals?: number
  // Doble clic (agregar vértice en un lado, pieza en edición).
  onDblClick?: () => void
}

export default function AssetShape({
  element, displayName, isSelected, interactive, decimals = 2, onDblClick,
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
  // Curva cerrada: se dibuja como polígono (relleno); abierta, como trazo.
  const isPath = element.shape === 'path'
  const isPolygon = element.shape === 'polygon' || (isPath && !!element.closed)
  const isWall = element.shape === 'wall' || (isPath && !element.closed)
  const radius = Math.min(pw, ph) / 2
  const fontSize = Math.min(13, Math.max(8, Math.min(pw, ph) / 4))
  // Bounding-box dims would be misleading printed over an irregular
  // polygon (e.g. an L-shape), so it's excluded the same way `tree` is.
  const showLabel = !isTree && !isPolygon && !isWall && pw > 30 && ph > 16

  const baseOpacity = element.opacity ?? 0.65

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    // Un muro recto puede tener caja de ancho o alto ~0: no se fuerza a 0,5 m.
    const minSize = isWall || isPath ? 0.01 : 0.5
    const newW = Math.max(minSize, Math.round((element.width * scaleX) * 100) / 100)
    const newH = Math.max(minSize, Math.round((element.height * scaleY) * 100) / 100)
    onTransformEnd(
      Math.round((node.x() / PIXELS_PER_METER) * 10) / 10,
      Math.round((node.y() / PIXELS_PER_METER) * 10) / 10,
      newW, newH,
      Math.round(node.rotation()),
    )
  }, [element.width, element.height, onTransformEnd, isWall, isPath])

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
      onDblClick={interactive && onDblClick ? (e => { e.cancelBubble = true; onDblClick() }) : undefined}
      onDblTap={interactive && onDblClick ? (e => { e.cancelBubble = true; onDblClick() }) : undefined}
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
        ) : isWall ? (
          <WallShape element={element} isSelected={isSelected} decimals={decimals} displayName={displayName} />
        ) : isPolygon ? (
          <Line points={flattenPath(element.points ?? [], element.segments, true).map(v => v * PIXELS_PER_METER)} closed {...shapeStyle} />
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

// Muro / perímetro del local: trazo con el grosor real, y la medida de cada
// tramo junto a él. Sin relleno: lo de adentro se sigue pudiendo tocar.
function WallShape({ element, isSelected, decimals, displayName }: {
  element: LayoutElement
  isSelected: boolean
  decimals: number
  displayName: string
}) {
  const raw = element.points ?? []
  const closed = !!element.closed && raw.length >= 6
  // Con lados curvos se dibuja la polilínea fina; las medidas van en el
  // medio de cada lado (sobre la curva) con su largo real.
  const pts = flattenPath(raw, element.segments, closed).map(v => v * PIXELS_PER_METER)
  const thick = (element.thickness ?? 0.15) * PIXELS_PER_METER
  const labels: { x: number; y: number; rot: number; text: string }[] = []
  for (const side of sideInfo(raw, element.segments, closed)) {
    if (side.length * PIXELS_PER_METER < 20) continue
    let ang = (side.angle * 180) / Math.PI
    if (ang > 90 || ang < -90) ang += 180
    // corrido hacia afuera del trazo, perpendicular al lado
    const nx = -Math.sin(side.angle), ny = Math.cos(side.angle)
    const off = thick / 2 + 7
    labels.push({ x: side.mx * PIXELS_PER_METER + nx * off, y: side.my * PIXELS_PER_METER + ny * off, rot: ang, text: formatMeters(side.length, decimals) })
  }
  return (
    <Group>
      <Line
        points={pts}
        closed={closed}
        stroke={element.color}
        strokeWidth={Math.max(1, thick)}
        lineJoin={element.segments ? 'round' : 'miter'}
        lineCap={element.segments ? 'round' : 'square'}
        fillEnabled={false}
        opacity={element.opacity ?? 1}
        hitStrokeWidth={Math.max(12, thick)}
        shadowEnabled={isSelected}
        shadowColor="#60a5fa"
        shadowBlur={10}
        shadowOpacity={0.9}
      />
      {labels.map((l, i) => (
        <Text
          key={i}
          x={l.x}
          y={l.y}
          text={l.text}
          rotation={l.rot}
          offsetX={l.text.length * 3}
          offsetY={5}
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fill="#cbd5e1"
          listening={false}
        />
      ))}
      {closed && displayName && (
        <Text
          text={displayName}
          width={element.width * PIXELS_PER_METER}
          height={element.height * PIXELS_PER_METER}
          align="center"
          verticalAlign="middle"
          fontSize={12}
          fontFamily="ui-monospace, monospace"
          fill="rgba(226,232,240,0.45)"
          listening={false}
        />
      )}
    </Group>
  )
}
