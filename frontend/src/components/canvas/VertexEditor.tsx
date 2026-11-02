// Editar con el mouse una curva, polígono o muro ya dibujado (pedido de
// Javier 2026-11-01): arrastrar vértices (cuadrados), las manijas de las
// curvas libres (círculos) y el punto medio de los arcos (rombo). Cada
// arrastre es una sola entrada de deshacer. Al soltar, la caja de la pieza se
// recalcula sin mover en el plano lo que no se tocó (lib/curves.withGeometry).
// Doble clic sobre un lado agrega un vértice; Suprimir quita el elegido
// (los maneja LayoutCanvas).
import { Group, Rect, Circle, Line, RegularPolygon } from 'react-konva'
import type Konva from 'konva'
import type { LayoutElement, Segment } from '@/types/layout'
import { moveVertex, moveHandle, moveArcApex, withGeometry, sagittaFromBulge } from '@/lib/curves'
import { PIXELS_PER_METER } from './constants'

interface Props {
  element: LayoutElement
  scale: number
  onPushHistory: () => void
  onUpdate: (updates: Partial<LayoutElement>) => void
  // Vértice elegido (Suprimir lo quita) — lo guarda el canvas.
  selectedVertex: number | null
  onSelectVertex: (i: number | null) => void
}

const ACCENT = '#38bdf8'

export default function VertexEditor({ element: el, scale, onPushHistory, onUpdate, selectedVertex, onSelectVertex }: Props) {
  const PPM = PIXELS_PER_METER
  const pts = el.points ?? []
  const n = pts.length / 2
  const closed = el.shape === 'polygon' ? true : !!el.closed
  const segs = el.segments
  const sides = closed ? n : n - 1
  // Clave que cambia al recalcular la geometría (al soltar, agregar o quitar
  // un vértice): react-konva no vuelve a ubicar un nodo que se arrastró si
  // sus props no cambian, así que los controles se vuelven a montar.
  const gen = `${n}:${el.x}:${el.y}:${el.width}:${el.height}`
  const size = 9 / scale
  const stop = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) => { e.cancelBubble = true }
  const local = (e: Konva.KonvaEventObject<DragEvent>) => ({ x: e.target.x() / PPM, y: e.target.y() / PPM })
  // Al soltar: caja nueva sin mover lo demás.
  const commit = (points: number[], segments: Segment[] | undefined) => onUpdate(withGeometry(el, points, segments))

  const common = {
    draggable: true,
    onMouseDown: stop,
    onTouchStart: stop,
    onClick: stop,
    onTap: stop,
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'move' },
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = '' },
  }

  return (
    <Group x={el.x * PPM} y={el.y * PPM} rotation={el.rotation}>
      {/* Guías de las manijas */}
      {segs?.map((s, i) => {
        if (s.kind !== 'bezier' || i >= sides) return null
        const j = (i + 1) % n
        return (
          <Group key={`g${i}`} listening={false}>
            <Line points={[pts[i * 2] * PPM, pts[i * 2 + 1] * PPM, s.c1[0] * PPM, s.c1[1] * PPM]} stroke={ACCENT} strokeWidth={1 / scale} dash={[4 / scale, 3 / scale]} />
            <Line points={[pts[j * 2] * PPM, pts[j * 2 + 1] * PPM, s.c2[0] * PPM, s.c2[1] * PPM]} stroke={ACCENT} strokeWidth={1 / scale} dash={[4 / scale, 3 / scale]} />
          </Group>
        )
      })}

      {/* Manijas de curvas libres */}
      {segs?.flatMap((s, i) => {
        if (s.kind !== 'bezier' || i >= sides) return []
        return (['c1', 'c2'] as const).map(which => (
          <Circle
            key={`h${i}${which}-${gen}`}
            {...common}
            x={s[which][0] * PPM}
            y={s[which][1] * PPM}
            radius={size / 2}
            fill="#0f172a"
            stroke={ACCENT}
            strokeWidth={1.5 / scale}
            onDragStart={e => { stop(e); onPushHistory() }}
            onDragMove={e => { const p = local(e); onUpdate({ segments: moveHandle(segs, i, which, p.x, p.y) }) }}
            onDragEnd={e => { stop(e); const p = local(e); commit(pts, moveHandle(segs, i, which, p.x, p.y)) }}
          />
        ))
      })}

      {/* Punto medio de los arcos */}
      {segs?.map((s, i) => {
        if (s.kind !== 'arc' || i >= sides) return null
        const j = (i + 1) % n
        const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[j * 2], by = pts[j * 2 + 1]
        const c = Math.hypot(bx - ax, by - ay) || 1
        const sg = sagittaFromBulge(s.bulge, c)
        const mx = (ax + bx) / 2 + (-(by - ay) / c) * sg
        const my = (ay + by) / 2 + ((bx - ax) / c) * sg
        return (
          <RegularPolygon
            key={`a${i}-${gen}`}
            {...common}
            sides={4}
            x={mx * PPM}
            y={my * PPM}
            radius={size * 0.65}
            fill="#0f172a"
            stroke="#f59e0b"
            strokeWidth={1.5 / scale}
            onDragStart={e => { stop(e); onPushHistory() }}
            onDragMove={e => { const p = local(e); onUpdate({ segments: moveArcApex(pts, segs, closed, i, p.x, p.y) }) }}
            onDragEnd={e => { stop(e); const p = local(e); commit(pts, moveArcApex(pts, segs, closed, i, p.x, p.y)) }}
          />
        )
      })}

      {/* Vértices */}
      {Array.from({ length: n }, (_, i) => (
        <Rect
          key={`v${i}-${gen}`}
          {...common}
          x={pts[i * 2] * PPM}
          y={pts[i * 2 + 1] * PPM}
          offsetX={size / 2}
          offsetY={size / 2}
          width={size}
          height={size}
          fill={selectedVertex === i ? ACCENT : '#f8fafc'}
          stroke={selectedVertex === i ? '#f8fafc' : ACCENT}
          strokeWidth={1.5 / scale}
          onMouseDown={e => { stop(e); onSelectVertex(i) }}
          onTouchStart={e => { stop(e); onSelectVertex(i) }}
          onDragStart={e => { stop(e); onSelectVertex(i); onPushHistory() }}
          onDragMove={e => { const p = local(e); onUpdate(moveVertex(pts, segs, closed, i, p.x, p.y)) }}
          onDragEnd={e => { stop(e); const p = local(e); const m = moveVertex(pts, segs, closed, i, p.x, p.y); commit(m.points, m.segments) }}
        />
      ))}
    </Group>
  )
}
