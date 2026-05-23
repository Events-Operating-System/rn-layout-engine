import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Text, Group, Shape, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { LayoutElement, CanvasViewport, DrawingPrimitive, DrawingTool, LayoutMeta } from '@/types/layout'
import { FOOTER_HEIGHT_PX } from '@/components/FooterLegend'

export const PIXELS_PER_METER = 20
const GRID_METERS = 120
const GRID_TOTAL_PX = GRID_METERS * PIXELS_PER_METER
const MIN_SCALE = 0.15
const MAX_SCALE = 6
const EXPORT_RATIO = 2

const DRAW_COLOR = '#fbbf24'   // amber-400 — visible on dark canvas
const DRAW_STROKE = 2

// ── Public handle exposed via forwardRef ──────────────────────────────────────

export interface LayoutCanvasHandle {
  exportPNG: () => void
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LayoutCanvasProps {
  elements: LayoutElement[]
  selectedId: string | null
  viewport: CanvasViewport
  onSelect: (id: string | null) => void
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void
  onUpdateViewport: (updates: Partial<CanvasViewport>) => void
  onDeleteElement: (id: string) => void
  activeTool: DrawingTool
  drawings: DrawingPrimitive[]
  onAddDrawing: (primitive: Omit<DrawingPrimitive, 'id'>) => void
  layoutMeta: LayoutMeta
  selectedDrawingId: string | null
  onSelectDrawing: (id: string | null) => void
  onDeleteDrawing: (id: string) => void
  onUpdateDrawing: (id: string, updates: Partial<DrawingPrimitive>) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

const LayoutCanvas = forwardRef<LayoutCanvasHandle, LayoutCanvasProps>(
  function LayoutCanvas(
    {
      elements, selectedId, viewport,
      onSelect, onUpdateElement, onUpdateViewport, onDeleteElement,
      activeTool, drawings, onAddDrawing, layoutMeta,
      selectedDrawingId, onSelectDrawing, onDeleteDrawing,
    }: LayoutCanvasProps,
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<Konva.Stage>(null)
    const transformerRef = useRef<Konva.Transformer>(null)
    // null until ResizeObserver fires — prevents oversized canvas on first render
    // (800×600 at DPR=3 = 33MB which exceeds iOS Safari's ~16MB canvas memory limit)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

    // ── Pan refs ──────────────────────────────────────────────────────────────
    const isPanning = useRef(false)
    const panOrigin = useRef({ clientX: 0, clientY: 0, vpX: 0, vpY: 0 })
    const isDraggingElement = useRef(false)
    const lastTouchDist = useRef<number | null>(null)

    // ── Drawing refs + state ──────────────────────────────────────────────────
    const drawingStartRef = useRef<{ x: number; y: number } | null>(null)
    const drawingToolRef = useRef<'line' | 'arrow'>('line')
    const previewDataRef = useRef<{ tool: string; points: number[] } | null>(null)
    const [previewDrawing, setPreviewDrawing] = useState<{ tool: string; points: number[] } | null>(null)

    // ── Container resize ──────────────────────────────────────────────────────

    useEffect(() => {
      if (!containerRef.current) return
      const obs = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect
        setContainerSize({ width, height })
      })
      obs.observe(containerRef.current)
      return () => obs.disconnect()
    }, [])

    // ── Transformer wiring ────────────────────────────────────────────────────

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

    // ── Keyboard: Delete / Backspace ──────────────────────────────────────────

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (selectedId) {
          onDeleteElement(selectedId)
        } else if (selectedDrawingId) {
          onDeleteDrawing(selectedDrawingId)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedId, selectedDrawingId, onDeleteElement, onDeleteDrawing])

    // ── Global pointer/touch up — commits pan OR drawing ─────────────────────

    useEffect(() => {
      const onUp = () => {
        const stage = stageRef.current
        if (isPanning.current) {
          isPanning.current = false
          if (stage) onUpdateViewport({ x: stage.x(), y: stage.y() })
        }
        if (lastTouchDist.current !== null) {
          lastTouchDist.current = null
          if (stage) onUpdateViewport({ x: stage.x(), y: stage.y(), scale: stage.scaleX() })
        }

        const preview = previewDataRef.current
        if (drawingStartRef.current && preview && preview.points.length >= 4) {
          const [x1, y1, x2, y2] = preview.points
          if (Math.hypot(x2 - x1, y2 - y1) > 5) {
            onAddDrawing({
              tool: preview.tool as 'line' | 'arrow',
              points: preview.points,
              color: DRAW_COLOR,
              strokeWidth: DRAW_STROKE,
            })
          }
        }
        drawingStartRef.current = null
        previewDataRef.current = null
        setPreviewDrawing(null)
      }
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchend', onUp)
      return () => {
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('touchend', onUp)
      }
    }, [onUpdateViewport, onAddDrawing])

    // ── Export PNG ────────────────────────────────────────────────────────────

    const exportPNG = useCallback(() => {
      const stage = stageRef.current
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
        renderFooterToCanvas(ctx, containerSize.width, containerSize.height, FOOTER_HEIGHT_PX, layoutMeta)
        ctx.restore()

        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `rn-layout-${new Date().toISOString().slice(0, 10)}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      img.src = stageDataURL
    }, [containerSize, layoutMeta])

    useImperativeHandle(ref, () => ({ exportPNG }), [exportPNG])

    // ── Zoom (wheel) ──────────────────────────────────────────────────────────

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
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
          direction > 0 ? oldScale * factor : oldScale / factor,
        ))
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
      [onUpdateViewport],
    )

    // ── Mouse down — pan OR drawing start ────────────────────────────────────

    const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      if (activeTool === 'text') {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        // eslint-disable-next-line no-alert
        const text = window.prompt('Anotación de texto:', '')
        if (text === null) return
        onAddDrawing({
          tool: 'text',
          points: [pos.x, pos.y],
          text: text || 'Texto',
          color: DRAW_COLOR,
          strokeWidth: 0,
        })
        return
      }

      if (activeTool === 'line' || activeTool === 'arrow') {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        drawingStartRef.current = { x: pos.x, y: pos.y }
        drawingToolRef.current = activeTool
        return
      }

      // Pointer mode: pan only on stage background
      if (e.target !== e.target.getStage()) return
      if (isDraggingElement.current) return
      isPanning.current = true
      panOrigin.current = {
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
        vpX: stage.x(),
        vpY: stage.y(),
      }
    }, [activeTool, onAddDrawing])

    // ── Mouse move ────────────────────────────────────────────────────────────

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      if (drawingStartRef.current !== null) {
        const pos = stage.getRelativePointerPosition()
        if (pos) {
          const newPreview = {
            tool: drawingToolRef.current,
            points: [drawingStartRef.current.x, drawingStartRef.current.y, pos.x, pos.y],
          }
          previewDataRef.current = newPreview
          setPreviewDrawing(newPreview)
        }
        return
      }

      if (isPanning.current) {
        stage.x(panOrigin.current.vpX + (e.evt.clientX - panOrigin.current.clientX))
        stage.y(panOrigin.current.vpY + (e.evt.clientY - panOrigin.current.clientY))
        stage.batchDraw()
        return
      }

      const pos = stage.getRelativePointerPosition()
      if (pos) {
        setCursorPos({
          x: Math.round((pos.x / PIXELS_PER_METER) * 10) / 10,
          y: Math.round((pos.y / PIXELS_PER_METER) * 10) / 10,
        })
      }
    }, [])

    // ── Touch start — single-finger pan or two-finger pinch ──────────────────

    const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
      const stage = stageRef.current
      if (!stage) return
      e.evt.preventDefault()

      if (e.evt.touches.length === 1) {
        if (e.target !== e.target.getStage()) return
        isPanning.current = true
        panOrigin.current = {
          clientX: e.evt.touches[0].clientX,
          clientY: e.evt.touches[0].clientY,
          vpX: stage.x(),
          vpY: stage.y(),
        }
      } else if (e.evt.touches.length === 2) {
        isPanning.current = false
        const dx = e.evt.touches[0].clientX - e.evt.touches[1].clientX
        const dy = e.evt.touches[0].clientY - e.evt.touches[1].clientY
        lastTouchDist.current = Math.hypot(dx, dy)
      }
    }, [])

    // ── Touch move — pan or pinch-zoom ────────────────────────────────────────

    const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
      const stage = stageRef.current
      if (!stage) return
      e.evt.preventDefault()

      if (e.evt.touches.length === 1 && isPanning.current) {
        stage.x(panOrigin.current.vpX + (e.evt.touches[0].clientX - panOrigin.current.clientX))
        stage.y(panOrigin.current.vpY + (e.evt.touches[0].clientY - panOrigin.current.clientY))
        stage.batchDraw()
      } else if (e.evt.touches.length === 2 && lastTouchDist.current !== null) {
        const dx = e.evt.touches[0].clientX - e.evt.touches[1].clientX
        const dy = e.evt.touches[0].clientY - e.evt.touches[1].clientY
        const newDist = Math.hypot(dx, dy)
        const oldScale = stage.scaleX()
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (newDist / lastTouchDist.current)))

        const centerX = (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2
        const centerY = (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2
        const box = stage.container().getBoundingClientRect()
        const pointer = { x: centerX - box.left, y: centerY - box.top }
        const mouseAt = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        }

        stage.scaleX(newScale)
        stage.scaleY(newScale)
        stage.x(pointer.x - mouseAt.x * newScale)
        stage.y(pointer.y - mouseAt.y * newScale)
        stage.batchDraw()
        lastTouchDist.current = newDist
      }
    }, [])

    // ── Stage click — deselect on background ──────────────────────────────────

    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
          onSelect(null)
          onSelectDrawing(null)
        }
      },
      [onSelect, onSelectDrawing],
    )

    const cursor = activeTool !== 'pointer' ? 'crosshair' : 'default'
    const elementInteractive = activeTool === 'pointer'
    const drawingsInteractive = activeTool === 'pointer'

    // Cap pixelRatio at 2 — prevents canvas memory exhaustion on iPhone (DPR=3)
    // At DPR=3 two Konva layers = ~33MB which exceeds iOS Safari's canvas budget
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-slate-950 overflow-hidden"
        style={{ cursor }}
      >
        {/* Stage is not created until ResizeObserver fires with real dimensions */}
        {containerSize !== null && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          pixelRatio={pixelRatio}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleMouseMove}
          onClick={handleStageClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Grid — very subtle, non-interactive */}
          <Layer listening={false}>
            <Rect
              x={0} y={0}
              width={GRID_TOTAL_PX} height={GRID_TOTAL_PX}
              fill="#020617"
            />
            <GridLines />
          </Layer>

          {/* Assets + drawings + Transformer */}
          <Layer>
            {elements.map(el => (
              <AssetShape
                key={el.id}
                element={el}
                isSelected={el.id === selectedId}
                interactive={elementInteractive}
                onSelect={() => onSelect(el.id)}
                onDragStart={() => { isDraggingElement.current = true }}
                onDragEnd={(x, y) => {
                  isDraggingElement.current = false
                  onUpdateElement(el.id, {
                    x: Math.round((x / PIXELS_PER_METER) * 10) / 10,
                    y: Math.round((y / PIXELS_PER_METER) * 10) / 10,
                  })
                }}
                onTransformEnd={(x, y, w, h, rotation) =>
                  onUpdateElement(el.id, { x, y, width: w, height: h, rotation })
                }
              />
            ))}

            {drawings.map(drw => (
              <DrawingShape
                key={drw.id}
                drawing={drw}
                isSelected={drw.id === selectedDrawingId}
                interactive={drawingsInteractive}
                onSelect={() => onSelectDrawing(drw.id)}
              />
            ))}

            {previewDrawing && (
              <DrawingPreview tool={previewDrawing.tool} points={previewDrawing.points} />
            )}

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
        )}

        {/* Cursor HUD */}
        {cursorPos && (
          <div className="absolute bottom-3 left-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
            {cursorPos.x}m, {cursorPos.y}m
          </div>
        )}

        {/* Zoom HUD */}
        <div className="absolute top-3 right-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
          {Math.round(viewport.scale * 100)}%
        </div>
      </div>
    )
  }
)

export default LayoutCanvas

// ── Grid lines ────────────────────────────────────────────────────────────────

function GridLines() {
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

// ── Drawing primitive renderer ────────────────────────────────────────────────

interface DrawingShapeProps {
  drawing: DrawingPrimitive
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
}

function DrawingShape({ drawing, isSelected, interactive, onSelect }: DrawingShapeProps) {
  const opacity = drawing.opacity ?? 1
  const clickProps = {
    listening: interactive,
    onClick: interactive ? onSelect : undefined,
    onTap: interactive ? onSelect : undefined,
    hitStrokeWidth: 12,
    shadowEnabled: isSelected,
    shadowColor: '#60a5fa',
    shadowBlur: 10,
    shadowOpacity: 0.85,
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
        fontSize={14}
        fontFamily="ui-monospace, monospace"
        opacity={opacity}
        {...clickProps}
      />
    )
  }
  return null
}

// ── In-progress drawing preview ───────────────────────────────────────────────

function DrawingPreview({ tool, points }: { tool: string; points: number[] }) {
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

// ── Individual placed asset ───────────────────────────────────────────────────

interface AssetShapeProps {
  element: LayoutElement
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragEnd: (x: number, y: number) => void
  onTransformEnd: (x: number, y: number, w: number, h: number, rotation: number) => void
}

function AssetShape({
  element, isSelected, interactive,
  onSelect, onDragStart, onDragEnd, onTransformEnd,
}: AssetShapeProps) {
  const groupRef = useRef<Konva.Group>(null)

  const px = element.x * PIXELS_PER_METER
  const py = element.y * PIXELS_PER_METER
  const pw = element.width * PIXELS_PER_METER
  const ph = element.height * PIXELS_PER_METER

  const isCircle = element.shape === 'circle'
  const radius = Math.min(pw, ph) / 2
  const fontSize = Math.min(13, Math.max(8, Math.min(pw, ph) / 4))
  const showLabel = pw > 30 && ph > 16

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
      onClick={interactive ? onSelect : undefined}
      onTap={interactive ? onSelect : undefined}
      onDragStart={interactive ? onDragStart : undefined}
      onDragEnd={interactive ? (e => onDragEnd(e.target.x(), e.target.y())) : undefined}
      onTransformEnd={handleTransformEnd}
    >
      {isCircle ? (
        <Circle x={pw / 2} y={ph / 2} radius={radius} {...shapeStyle} />
      ) : (
        <Rect width={pw} height={ph} cornerRadius={2} {...shapeStyle} />
      )}

      {showLabel && (
        <Text
          text={element.name}
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
  )
}

// ── Footer renderer (PNG export only) ────────────────────────────────────────

function renderFooterToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  yOffset: number,
  footerHeight: number,
  meta: LayoutMeta,
) {
  const leftW = 176

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, yOffset, width, footerHeight)

  // Top border
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, yOffset)
  ctx.lineTo(width, yOffset)
  ctx.stroke()

  // Company name
  ctx.fillStyle = '#f1f5f9'
  ctx.font = 'bold 13px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(meta.company || 'Reality Near', leftW / 2, yOffset + footerHeight * 0.38)

  ctx.fillStyle = '#475569'
  ctx.font = '7px ui-monospace, monospace'
  ctx.letterSpacing = '0.1em'
  ctx.fillText('LAYOUT ENGINE', leftW / 2, yOffset + footerHeight * 0.65)
  ctx.letterSpacing = '0'

  // Left block divider
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftW, yOffset)
  ctx.lineTo(leftW, yOffset + footerHeight)
  ctx.stroke()

  // Right 5-column metadata grid
  const rightW = width - leftW
  const colW = rightW / 5
  const rowH = footerHeight / 2

  const cols = [
    [{ label: 'CLIENTE', value: meta.cliente }, { label: 'LUGAR EVENTO', value: meta.lugarEvento }],
    [{ label: 'FECHA EVENTO', value: meta.fechaEvento }, { label: 'PAX / INVITADOS', value: meta.pax }],
    [{ label: 'VERSION DEL PLANO', value: meta.version }, { label: 'FECHA DEL PLANO', value: meta.fechaPlano }],
    [{ label: 'CONTACTO', value: meta.contacto }, { label: 'TELEFONO', value: meta.telefono }],
    [{ label: 'CORREO', value: meta.correo }, { label: '', value: '' }],
  ]

  ctx.textAlign = 'left'

  cols.forEach((col, ci) => {
    const cx = leftW + ci * colW

    if (ci > 0) {
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, yOffset)
      ctx.lineTo(cx, yOffset + footerHeight)
      ctx.stroke()
    }

    col.forEach((field, ri) => {
      const ry = yOffset + ri * rowH

      if (ri > 0) {
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, ry)
        ctx.lineTo(cx + colW, ry)
        ctx.stroke()
      }

      if (!field.label) return

      ctx.fillStyle = '#475569'
      ctx.font = '7px ui-monospace, monospace'
      ctx.textBaseline = 'top'
      ctx.fillText(field.label, cx + 6, ry + 5)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '10px ui-monospace, monospace'
      ctx.textBaseline = 'bottom'
      ctx.fillText(field.value || '—', cx + 6, ry + rowH - 5)
    })
  })
}
