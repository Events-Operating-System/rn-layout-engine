import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Ellipse, Text, Group, Shape, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { LayoutElement, CanvasViewport, DrawingPrimitive, DrawingTool, LayoutMeta } from '@/types/layout'
import { FOOTER_HEIGHT_PX } from '@/components/FooterLegend'
import jsPDF from 'jspdf'

export const PIXELS_PER_METER = 20
const GRID_METERS = 120
const GRID_TOTAL_PX = GRID_METERS * PIXELS_PER_METER
const MIN_SCALE = 0.15
const MAX_SCALE = 6
const EXPORT_RATIO = 2
const CANVAS_CENTER_PX = 60 * PIXELS_PER_METER

const DRAW_COLOR = '#fbbf24'   // amber-400 — visible on dark canvas
const DRAW_STROKE = 2

// ── Public handle exposed via forwardRef ──────────────────────────────────────

export interface LayoutCanvasHandle {
  exportPNG: () => void
  exportPDF: () => void
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
  onPushHistory: () => void
}

// ── Alignment guide computation ───────────────────────────────────────────────

function computeAlignmentGuides(
  elements: LayoutElement[],
  draggedId: string,
  gx: number,
  gy: number,
  pw: number,
  ph: number,
  scale: number,
): { xs: number[]; ys: number[] } {
  const THRESHOLD = 8 / scale
  const xSet = new Set<number>()
  const ySet = new Set<number>()

  const dLeft = gx, dRight = gx + pw, dCx = gx + pw / 2
  const dTop = gy, dBottom = gy + ph, dCy = gy + ph / 2

  for (const el of elements) {
    if (el.id === draggedId) continue
    const epx = el.x * PIXELS_PER_METER
    const epy = el.y * PIXELS_PER_METER
    const epw = el.width * PIXELS_PER_METER
    const eph = el.height * PIXELS_PER_METER
    const elL = epx, elR = epx + epw, elCx = epx + epw / 2
    const elT = epy, elB = epy + eph, elCy = epy + eph / 2

    if (Math.abs(dCx - elCx) < THRESHOLD) xSet.add(elCx)
    if (Math.abs(dLeft - elL) < THRESHOLD) xSet.add(elL)
    if (Math.abs(dRight - elR) < THRESHOLD) xSet.add(elR)
    if (Math.abs(dLeft - elR) < THRESHOLD) xSet.add(elR)
    if (Math.abs(dRight - elL) < THRESHOLD) xSet.add(elL)

    if (Math.abs(dCy - elCy) < THRESHOLD) ySet.add(elCy)
    if (Math.abs(dTop - elT) < THRESHOLD) ySet.add(elT)
    if (Math.abs(dBottom - elB) < THRESHOLD) ySet.add(elB)
    if (Math.abs(dTop - elB) < THRESHOLD) ySet.add(elB)
    if (Math.abs(dBottom - elT) < THRESHOLD) ySet.add(elT)
  }

  return { xs: Array.from(xSet), ys: Array.from(ySet) }
}

// ── Component ─────────────────────────────────────────────────────────────────

const LayoutCanvas = forwardRef<LayoutCanvasHandle, LayoutCanvasProps>(
  function LayoutCanvas(
    {
      elements, selectedId, viewport,
      onSelect, onUpdateElement, onUpdateViewport, onDeleteElement,
      activeTool, drawings, onAddDrawing, layoutMeta,
      selectedDrawingId, onSelectDrawing, onDeleteDrawing, onUpdateDrawing,
      onPushHistory,
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
    const [alignGuides, setAlignGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] })

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

    const exportPDF = useCallback(() => {
      if (!containerSize || !elements.length) return
    
      const PADDING = 40
      const PPM = PIXELS_PER_METER
    
      // Calcular bounding box de todos los elementos + drawings (líneas/flechas/texto)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of elements) {
        minX = Math.min(minX, el.x * PPM)
        minY = Math.min(minY, el.y * PPM)
        maxX = Math.max(maxX, (el.x + el.width) * PPM)
        maxY = Math.max(maxY, (el.y + el.height) * PPM)
      }
      // drawing.points ya están en world-pixel coords (mismo espacio que el.x * PPM)
      for (const drw of drawings) {
        for (let i = 0; i < drw.points.length; i += 2) {
          minX = Math.min(minX, drw.points[i])
          minY = Math.min(minY, drw.points[i + 1])
          maxX = Math.max(maxX, drw.points[i])
          maxY = Math.max(maxY, drw.points[i + 1])
        }
      }

      const contentW = maxX - minX + PADDING * 2
      const contentH = maxY - minY + PADDING * 2
      const FOOTER_H = FOOTER_HEIGHT_PX
      const SCALE = 2
    
      const canvasW = contentW * SCALE
      const canvasH = (contentH + FOOTER_H) * SCALE
    
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      if (!ctx) return
    
      // Fondo blanco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasW, canvasH)
    
      ctx.save()
      ctx.scale(SCALE, SCALE)
    
      // Borde exterior del plano
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1.5
      ctx.strokeRect(8, 8, contentW - 16, contentH - 16)
    
      // Dibujar elementos
      const offsetX = -minX + PADDING
      const offsetY = -minY + PADDING
    
      for (const el of elements) {
        const x = el.x * PPM + offsetX
        const y = el.y * PPM + offsetY
        const w = el.width * PPM
        const h = el.height * PPM
    
        const isTree = el.shape === 'tree'
        const isCircle = el.shape === 'circle'
        const isOval = el.shape === 'oval'
    
        // Color: árbol=verde, color custom respetado, resto blanco
        const DEFAULT_COLORS = ['#6366f1','#0891b2','#f59e0b','#ef4444','#22c55e','#a855f7','#16a34a']
        const hasCustomColor = !DEFAULT_COLORS.includes(el.color)
        const fillColor = isTree ? '#16a34a' : hasCustomColor ? el.color : '#ffffff'
        const strokeColor = '#1a1a1a'
    
        // Pivote de rotación en (x, y) — esquina superior-izquierda —
        // igual que el Group de Konva en pantalla (sin offsetX/offsetY),
        // para que la orientación coincida exactamente con el canvas.
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((el.rotation * Math.PI) / 180)

        ctx.fillStyle = fillColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1.5

        if (isCircle || isTree) {
          const r = Math.min(w, h) / 2
          ctx.beginPath()
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        } else if (isOval) {
          ctx.beginPath()
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.rect(0, 0, w, h)
          ctx.fill()
          ctx.stroke()
        }

        // Label
        if (w > 20 && h > 12) {
          ctx.fillStyle = isTree ? '#ffffff' : '#1a1a1a'
          const fontSize = Math.min(11, Math.max(7, Math.min(w, h) / 4))
          ctx.font = `600 ${fontSize}px ui-monospace, monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(el.name, w / 2, h > 20 ? h / 2 - h / 6 : h / 2)

          if (h > 24) {
            ctx.font = `${fontSize - 1}px ui-monospace, monospace`
            ctx.fillStyle = isTree ? 'rgba(255,255,255,0.8)' : '#555'
            ctx.fillText(`${el.width}m × ${el.height}m`, w / 2, h / 2 + h / 6)
          }
        }

        ctx.restore()
      }

      // Dibujar drawings (líneas, flechas, anotaciones de texto) — mismo
      // color/grosor/opacidad que en pantalla (ver DrawingShape), trasladados
      // con el mismo offsetX/offsetY que los elementos.
      for (const drw of drawings) {
        ctx.save()
        ctx.globalAlpha = drw.opacity ?? 1
        ctx.strokeStyle = drw.color
        ctx.fillStyle = drw.color
        ctx.lineWidth = drw.strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (drw.tool === 'line') {
          ctx.beginPath()
          ctx.moveTo(drw.points[0] + offsetX, drw.points[1] + offsetY)
          for (let i = 2; i < drw.points.length; i += 2) {
            ctx.lineTo(drw.points[i] + offsetX, drw.points[i + 1] + offsetY)
          }
          ctx.stroke()
        } else if (drw.tool === 'arrow') {
          const x1 = drw.points[0] + offsetX
          const y1 = drw.points[1] + offsetY
          const x2 = drw.points[drw.points.length - 2] + offsetX
          const y2 = drw.points[drw.points.length - 1] + offsetY

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          // Cabeza de flecha (pointerLength=10, pointerWidth=8 — igual que <Arrow> en pantalla)
          const POINTER_LENGTH = 10
          const POINTER_WIDTH = 8
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const baseX = x2 - POINTER_LENGTH * Math.cos(angle)
          const baseY = y2 - POINTER_LENGTH * Math.sin(angle)
          const leftX = baseX + (POINTER_WIDTH / 2) * Math.cos(angle + Math.PI / 2)
          const leftY = baseY + (POINTER_WIDTH / 2) * Math.sin(angle + Math.PI / 2)
          const rightX = baseX + (POINTER_WIDTH / 2) * Math.cos(angle - Math.PI / 2)
          const rightY = baseY + (POINTER_WIDTH / 2) * Math.sin(angle - Math.PI / 2)

          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(leftX, leftY)
          ctx.lineTo(rightX, rightY)
          ctx.closePath()
          ctx.fill()
        } else if (drw.tool === 'text' && drw.text) {
          ctx.font = '14px ui-monospace, monospace'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(drw.text, drw.points[0] + offsetX, drw.points[1] + offsetY)
        }

        ctx.restore()
      }

      // Footer
      renderFooterPDF(ctx, contentW, contentH, FOOTER_H, layoutMeta)
    
      ctx.restore()
    
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: contentW > contentH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvasW, canvasH],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvasW, canvasH)
      pdf.save(`rn-layout-${new Date().toISOString().slice(0, 10)}.pdf`)
    }, [containerSize, elements, drawings, layoutMeta])

    useImperativeHandle(ref, () => ({ exportPNG, exportPDF }), [exportPNG, exportPDF])

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

          {/* Alignment guides — canvas center cross + smart drag guides */}
          <Layer listening={false}>
            <Line
              points={[CANVAS_CENTER_PX, 0, CANVAS_CENTER_PX, GRID_TOTAL_PX]}
              stroke="rgba(148,163,184,0.10)"
              strokeWidth={0.7}
              dash={[12, 8]}
            />
            <Line
              points={[0, CANVAS_CENTER_PX, GRID_TOTAL_PX, CANVAS_CENTER_PX]}
              stroke="rgba(148,163,184,0.10)"
              strokeWidth={0.7}
              dash={[12, 8]}
            />
            {alignGuides.xs.map((x, i) => (
              <Line
                key={`gx-${i}`}
                points={[x, 0, x, GRID_TOTAL_PX]}
                stroke="#22d3ee"
                strokeWidth={0.6}
                dash={[8, 6]}
                opacity={0.65}
              />
            ))}
            {alignGuides.ys.map((y, i) => (
              <Line
                key={`gy-${i}`}
                points={[0, y, GRID_TOTAL_PX, y]}
                stroke="#22d3ee"
                strokeWidth={0.6}
                dash={[8, 6]}
                opacity={0.65}
              />
            ))}
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
                onDragMove={(gx, gy) => {
                  setAlignGuides(computeAlignmentGuides(
                    elements, el.id, gx, gy,
                    el.width * PIXELS_PER_METER, el.height * PIXELS_PER_METER,
                    viewport.scale,
                  ))
                }}
                onDragEnd={(x, y) => {
                  isDraggingElement.current = false
                  setAlignGuides({ xs: [], ys: [] })
                  onPushHistory()
                  onUpdateElement(el.id, {
                    x: Math.round((x / PIXELS_PER_METER) * 10) / 10,
                    y: Math.round((y / PIXELS_PER_METER) * 10) / 10,
                  })
                }}
                onTransformEnd={(x, y, w, h, rotation) => {
                  onPushHistory()
                  onUpdateElement(el.id, { x, y, width: w, height: h, rotation })
                }}
              />
            ))}

            {drawings.map(drw => (
              <DrawingShape
                key={drw.id}
                drawing={drw}
                isSelected={drw.id === selectedDrawingId}
                interactive={drawingsInteractive}
                onSelect={() => onSelectDrawing(drw.id)}
                onMoveDrawing={(newPoints) => onUpdateDrawing(drw.id, { points: newPoints })}
                onPushHistory={onPushHistory}
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
  onMoveDrawing?: (newPoints: number[]) => void
  onPushHistory?: () => void
}

function DrawingShape({ drawing, isSelected, interactive, onSelect, onMoveDrawing, onPushHistory }: DrawingShapeProps) {
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
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  onTransformEnd: (x: number, y: number, w: number, h: number, rotation: number) => void
}

function AssetShape({
  element, isSelected, interactive,
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
  const radius = Math.min(pw, ph) / 2
  const fontSize = Math.min(13, Math.max(8, Math.min(pw, ph) / 4))
  const showLabel = !isTree && pw > 30 && ph > 16

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
      onDragMove={interactive ? (e => onDragMove(e.target.x(), e.target.y())) : undefined}
      onDragEnd={interactive ? (e => onDragEnd(e.target.x(), e.target.y())) : undefined}
      onTransformEnd={handleTransformEnd}
    >
      {isCircle ? (
        <Circle x={pw / 2} y={ph / 2} radius={radius} {...shapeStyle} />
      ) : isOval ? (
        <Ellipse x={pw / 2} y={ph / 2} radiusX={pw / 2} radiusY={ph / 2} {...shapeStyle} />
      ) : isRoundedRect ? (
        <Rect width={pw} height={ph} cornerRadius={Math.min(pw, ph) * 0.25} {...shapeStyle} />
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

function fillTextTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  if (!text || ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1)
  }
  ctx.fillText(s + '…', x, y)
}

// Shrinks font size until text fits rather than truncating
function fillTextAdaptive(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minSizePx = 7,
) {
  if (!text) { ctx.fillText(text, x, y); return }
  const sizeMatch = ctx.font.match(/(\d+(?:\.\d+)?)px/)
  const baseFont = ctx.font
  let size = sizeMatch ? parseFloat(sizeMatch[1]) : 10
  while (size > minSizePx && ctx.measureText(text).width > maxWidth) {
    size--
    ctx.font = baseFont.replace(/\d+(?:\.\d+)?px/, `${size}px`)
  }
  ctx.fillText(text, x, y)
  ctx.font = baseFont
}

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

  // Product name "EventOS Layout"
  ctx.fillStyle = '#f1f5f9'
  ctx.font = 'bold 12px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('EventOS Layout', 6, yOffset + footerHeight * 0.25)

  // "powered by" label
  ctx.fillStyle = '#475569'
  ctx.font = '7px ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText('powered by', 6, yOffset + footerHeight * 0.52)

  // Company name
  ctx.fillStyle = '#94a3b8'
  ctx.font = '9px ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  fillTextTruncated(ctx, meta.company || 'Reality Near', 6, yOffset + footerHeight * 0.78, leftW - 12)

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
      fillTextAdaptive(ctx, field.value || '—', cx + 6, ry + rowH - 5, colW - 14)
    })
  })
}

function renderFooterPDF(
  ctx: CanvasRenderingContext2D,
  width: number,
  yOffset: number,
  footerHeight: number,
  meta: LayoutMeta,
) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, yOffset, width, footerHeight)

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5
  ctx.strokeRect(0, yOffset, width, footerHeight)

  const leftW = 120
  const rightW = width - leftW
  const colCount = 5
  const colW = rightW / colCount
  const rowH = footerHeight / 2

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftW, yOffset)
  ctx.lineTo(leftW, yOffset + footerHeight)
  ctx.stroke()

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 14px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('EventOS', leftW / 2, yOffset + footerHeight * 0.28)
  ctx.font = 'bold 11px ui-monospace, monospace'
  ctx.fillText('Layout', leftW / 2, yOffset + footerHeight * 0.52)
  ctx.fillStyle = '#666666'
  ctx.font = '7px ui-monospace, monospace'
  ctx.fillText('by Reality Near', leftW / 2, yOffset + footerHeight * 0.76)

  const cols = [
    [
      { label: 'CLIENTE', value: meta.cliente },
      { label: 'LUGAR EVENTO', value: meta.lugarEvento },
    ],
    [
      { label: 'FECHA EVENTO', value: meta.fechaEvento },
      { label: 'FECHA DEL PLANO', value: meta.fechaPlano },
    ],
    [
      { label: 'PAX / INVITADOS', value: meta.pax },
      { label: 'VERSION DEL PLANO', value: meta.version },
    ],
    [
      { label: 'CONTACTO', value: meta.contacto },
      { label: 'TELEFONO', value: meta.telefono },
    ],
    [
      { label: 'CORREO', value: meta.correo },
      { label: '', value: '' },
    ],
  ]

  cols.forEach((col, ci) => {
    const cx = leftW + ci * colW

    if (ci > 0) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 0.75
      ctx.beginPath()
      ctx.moveTo(cx, yOffset)
      ctx.lineTo(cx, yOffset + footerHeight)
      ctx.stroke()
    }

    col.forEach((field, ri) => {
      const ry = yOffset + ri * rowH

      if (ri > 0) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 0.75
        ctx.beginPath()
        ctx.moveTo(cx, ry)
        ctx.lineTo(cx + colW, ry)
        ctx.stroke()
      }

      if (!field.label) return

      ctx.fillStyle = '#666666'
      ctx.font = '7px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(field.label, cx + 6, ry + 5)

      ctx.fillStyle = '#000000'
      ctx.font = 'bold 11px ui-monospace, monospace'
      ctx.textBaseline = 'bottom'
      fillTextAdaptive(ctx, field.value || '—', cx + 6, ry + rowH - 5, colW - 12, 5)
    })
  })
}