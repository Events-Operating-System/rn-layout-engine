'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Shape, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { LayoutElement, CanvasViewport } from '@/types/layout'

export const PIXELS_PER_METER = 20
const GRID_METERS = 120
const GRID_TOTAL_PX = GRID_METERS * PIXELS_PER_METER
const MIN_SCALE = 0.15
const MAX_SCALE = 6

interface LayoutCanvasProps {
  elements: LayoutElement[]
  selectedId: string | null
  viewport: CanvasViewport
  onSelect: (id: string | null) => void
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void
  onUpdateViewport: (updates: Partial<CanvasViewport>) => void
}

export default function LayoutCanvas({
  elements,
  selectedId,
  viewport,
  onSelect,
  onUpdateElement,
  onUpdateViewport,
}: LayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Wire transformer to the selected shape
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return
    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`)
      if (node) {
        transformerRef.current.nodes([node])
        transformerRef.current.getLayer()?.batchDraw()
        return
      }
    }
    transformerRef.current.nodes([])
    transformerRef.current.getLayer()?.batchDraw()
  }, [selectedId, elements])

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const direction = e.evt.deltaY > 0 ? -1 : 1
      const factor = 1.08
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, direction > 0 ? oldScale * factor : oldScale / factor)
      )

      const mouseAt = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      onUpdateViewport({
        scale: newScale,
        x: pointer.x - mouseAt.x * newScale,
        y: pointer.y - mouseAt.y * newScale,
      })
    },
    [onUpdateViewport]
  )

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) onSelect(null)
    },
    [onSelect]
  )

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return
    setCursorPos({
      x: Math.round((pos.x / PIXELS_PER_METER) * 10) / 10,
      y: Math.round((pos.y / PIXELS_PER_METER) * 10) / 10,
    })
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden">
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onDragEnd={e => onUpdateViewport({ x: e.target.x(), y: e.target.y() })}
      >
        {/* Grid */}
        <Layer listening={false}>
          <Shape
            sceneFunc={(ctx) => {
              const nc = (ctx as unknown as { _context: CanvasRenderingContext2D })._context
              nc.save()

              nc.strokeStyle = '#1e293b'
              nc.lineWidth = 0.5
              nc.beginPath()
              for (let i = 0; i <= GRID_METERS; i++) {
                const p = i * PIXELS_PER_METER
                nc.moveTo(p, 0); nc.lineTo(p, GRID_TOTAL_PX)
                nc.moveTo(0, p); nc.lineTo(GRID_TOTAL_PX, p)
              }
              nc.stroke()

              nc.strokeStyle = '#1e3a5f'
              nc.lineWidth = 1
              nc.beginPath()
              for (let i = 0; i <= GRID_METERS; i += 5) {
                const p = i * PIXELS_PER_METER
                nc.moveTo(p, 0); nc.lineTo(p, GRID_TOTAL_PX)
                nc.moveTo(0, p); nc.lineTo(GRID_TOTAL_PX, p)
              }
              nc.stroke()

              // Origin marker
              nc.strokeStyle = '#334155'
              nc.lineWidth = 1
              nc.strokeRect(0, 0, GRID_TOTAL_PX, GRID_TOTAL_PX)

              nc.restore()
            }}
          />
        </Layer>

        {/* Assets */}
        <Layer>
          {elements.map(el => (
            <AssetShape
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              onSelect={() => onSelect(el.id)}
              onDragEnd={(x, y) =>
                onUpdateElement(el.id, {
                  x: Math.round((x / PIXELS_PER_METER) * 10) / 10,
                  y: Math.round((y / PIXELS_PER_METER) * 10) / 10,
                })
              }
              onTransformEnd={(x, y, w, h, rotation) =>
                onUpdateElement(el.id, { x, y, width: w, height: h, rotation })
              }
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            borderStroke="#f8fafc"
            borderStrokeWidth={1}
            anchorStroke="#f8fafc"
            anchorFill="#1e293b"
            anchorSize={8}
            anchorCornerRadius={2}
            boundBoxFunc={(_old, newBox) => newBox}
          />
        </Layer>
      </Stage>

      {/* Cursor coordinates HUD */}
      {cursorPos && (
        <div className="absolute bottom-3 left-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
          {cursorPos.x}m, {cursorPos.y}m
        </div>
      )}

      {/* Zoom level HUD */}
      <div className="absolute top-3 right-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  )
}

// ─── Individual placed asset ──────────────────────────────────────────────────

interface AssetShapeProps {
  element: LayoutElement
  isSelected: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onTransformEnd: (x: number, y: number, w: number, h: number, rotation: number) => void
}

function AssetShape({ element, isSelected, onSelect, onDragEnd, onTransformEnd }: AssetShapeProps) {
  const groupRef = useRef<Konva.Group>(null)

  const px = element.x * PIXELS_PER_METER
  const py = element.y * PIXELS_PER_METER
  const pw = element.width * PIXELS_PER_METER
  const ph = element.height * PIXELS_PER_METER

  const fontSize = Math.min(13, Math.max(8, Math.min(pw, ph) / 4))
  const showLabel = pw > 30 && ph > 16

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
      newW,
      newH,
      Math.round(node.rotation()),
    )
  }, [element.width, element.height, onTransformEnd])

  return (
    <Group
      id={element.id}
      ref={groupRef}
      x={px}
      y={py}
      rotation={element.rotation}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={handleTransformEnd}
    >
      {/* Main body */}
      <Rect
        width={pw}
        height={ph}
        fill={element.color}
        opacity={isSelected ? 0.9 : 0.65}
        stroke={isSelected ? '#f8fafc' : element.color}
        strokeWidth={isSelected ? 1.5 : 0.5}
        cornerRadius={2}
      />

      {/* Name label */}
      {showLabel && (
        <Text
          text={element.name}
          width={pw}
          height={ph * 0.6}
          y={0}
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

      {/* Dimension sub-label */}
      {showLabel && (
        <Text
          text={`${element.width}m × ${element.height}m`}
          width={pw}
          height={ph * 0.4}
          y={ph * 0.6}
          align="center"
          verticalAlign="middle"
          fill="rgba(248,250,252,0.55)"
          fontSize={Math.min(10, fontSize - 1)}
          fontFamily="ui-monospace, monospace"
          listening={false}
        />
      )}
    </Group>
  )
}
