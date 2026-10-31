import { useRef, useCallback, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line, Arrow, Rect, Circle, Ellipse, Text, Group, Shape, Transformer, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import type { LayoutElement, CanvasViewport, DrawingPrimitive, DrawingTool, LayoutMeta, VenueBackground } from '@/types/layout'
import { FOOTER_HEIGHT_PX } from '@/components/FooterLegend'
import { lengthMeters, angleDegrees, applyAngleSnap, pointFromLengthAngle, elementAreaMeters, type Point } from '@/lib/drawingMath'
import jsPDF from 'jspdf'
import { exportFileName, versionLabel } from '@/lib/layoutVersion'
import { useLang, getAssetName } from '@/context/LangContext'
import { fitViewportToContent } from '@/lib/fitViewport'
import { PIXELS_PER_METER, RESIZE_ANCHORS, GRID_TOTAL_PX, MIN_SCALE, MAX_SCALE, CANVAS_CENTER_PX, DRAW_COLOR, DRAW_STROKE } from './constants'
import { dragSet } from '@/lib/grouping'
import { scaleSegments, bulgeFromThreePoints, smoothSegments, normalizePath, flattenPath, type NewPath } from '@/lib/curves'
import { computeAlignmentGuides, findElementId } from './geometry'
import { exportLayoutPng, exportSelectionPng } from './exportLayout'
import { buildLayoutPdf } from './pdfExport'
import { bakeBackground } from './bakeBackground'
import { contentBounds, drawingsInside, type PaperChoice } from '@/lib/pdfLayout'
import GridLines from './GridLines'
import { DrawingShape, DrawingPreview } from './DrawingShape'
import AssetShape from './AssetShape'
import CanvasHud, { type DrawingReadout, type MeasurementResult } from './CanvasHud'

// Herramientas que se dibujan clic a clic (vértices).
const isVertexTool = (t: string) => t === 'polygon' || t === 'wall' || t === 'arc' || t === 'curve'

// Se reexporta para quien ya lo importaba desde acá (PropertiesPanel).
export { PIXELS_PER_METER }

// ── Public handle exposed via forwardRef ──────────────────────────────────────

export interface LayoutCanvasHandle {
  // Sin selección: la vista actual. Con selección: solo esas piezas.
  exportPNG: (opts?: { selectionIds?: Set<string> }) => void
  // Hoja A4/A3 a escala estándar; con selección, solo esas piezas.
  exportPDF: (opts: { paper: PaperChoice; selectionIds?: Set<string> }) => void
  fitToScreen: () => void
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LayoutCanvasProps {
  elements: LayoutElement[]
  selectedId: string | null
  selectedIds: Set<string>
  // Capas bloqueadas (bloque 6): piezas visibles que no se eligen ni mueven.
  inertIds?: Set<string>
  drawingsLocked?: boolean
  viewport: CanvasViewport
  onSelect: (id: string | null) => void
  onToggleSelect: (id: string) => void
  onSelectMultiple: (ids: string[]) => void
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void
  onUpdateElements: (updates: Record<string, Partial<LayoutElement>>) => void
  onUpdateViewport: (updates: Partial<CanvasViewport>) => void
  onDeleteElement: (id: string) => void
  onDeleteElements: (ids: string[]) => void
  activeTool: DrawingTool
  // Measure tool sub-mode — explicit, never inferred. Distancia never
  // hit-tests elements (exact click position always wins); Área only does.
  measureMode: 'distance' | 'area'
  drawings: DrawingPrimitive[]
  onAddDrawing: (primitive: Omit<DrawingPrimitive, 'id'>) => void
  onAddPolygon: (polygon: { x: number; y: number; width: number; height: number; points: number[] }) => void
  // Muro / perímetro del local (bloque 5): mismos puntos que el polígono;
  // closed = se cerró tocando el primer punto.
  onAddWall?: (wall: { x: number; y: number; width: number; height: number; points: number[]; closed: boolean }) => void
  // Arco por 3 puntos o curva libre (bloque 7).
  onAddPath?: (path: NewPath) => void
  // Decimales de las medidas de muros y cotas (ajuste de la org).
  dimensionDecimals?: number
  // Fondo del plano del local: ubicación (meta.background) + la imagen ya bajada.
  background?: VenueBackground
  backgroundImage?: HTMLImageElement | null
  // Sin esto el fondo no se puede mover (solo lectura o bloqueado).
  onUpdateBackground?: (updates: Partial<VenueBackground>) => void
  // Calibrar escala: distancia marcada sobre el fondo (m) y el primer punto (m).
  onCalibrate?: (measuredM: number, anchor: { x: number; y: number }) => void
  layoutMeta: LayoutMeta
  // layouts.version_number — va en el nombre del archivo y en el cajetín.
  versionNumber: number
  selectedDrawingId: string | null
  onSelectDrawing: (id: string | null) => void
  onDeleteDrawing: (id: string) => void
  onUpdateDrawing: (id: string, updates: Partial<DrawingPrimitive>) => void
  onPushHistory: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

const LayoutCanvas = forwardRef<LayoutCanvasHandle, LayoutCanvasProps>(
  function LayoutCanvas(
    {
      elements, selectedId, selectedIds, viewport, inertIds, drawingsLocked,
      onSelect, onToggleSelect, onSelectMultiple, onUpdateElement, onUpdateElements, onUpdateViewport,
      onDeleteElement, onDeleteElements,
      activeTool, measureMode, drawings, onAddDrawing, onAddPolygon, layoutMeta, versionNumber,
      onAddWall, onAddPath, dimensionDecimals = 2, background, backgroundImage, onUpdateBackground, onCalibrate,
      selectedDrawingId, onSelectDrawing, onDeleteDrawing, onUpdateDrawing,
      onPushHistory,
    }: LayoutCanvasProps,
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<Konva.Stage>(null)
    // Nombres de las piezas del catálogo en el idioma del usuario (se
    // traducen al mostrarlas; lo guardado no cambia). Los nombres propios
    // (assets de la org, renombrados) se muestran tal cual.
    const { lang, t } = useLang()
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

    // Group-drag (multi-select move): world-px starting position of every
    // selected element, captured on drag start, keyed by id — non-null only
    // while dragging a node that's part of a >1-element selection.
    const groupDragOrigin = useRef<Map<string, { x: number; y: number }> | null>(null)

    // ── Marquee-select refs + state (Selection mode only) ────────────────────
    const marqueeOrigin = useRef<{ x: number; y: number } | null>(null)
    const marqueeMoved = useRef(false)
    const marqueeRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

    // A real drag (pan or marquee) just completed — the browser still fires a
    // native `click` right after `mouseup` on the same target, which would
    // otherwise hit handleStageClick and immediately deselect what the drag
    // just selected (or drop the selection after a pan). Consumed once.
    const suppressNextClick = useRef(false)

    // ── Drawing refs + state ──────────────────────────────────────────────────
    const drawingStartRef = useRef<{ x: number; y: number } | null>(null)
    const drawingToolRef = useRef<'line' | 'arrow' | 'dimension'>('line')
    const previewDataRef = useRef<{ tool: string; points: number[] } | null>(null)
    const [previewDrawing, setPreviewDrawing] = useState<{ tool: string; points: number[] } | null>(null)
    // Live length/angle readout shown next to the cursor while dragging a
    // line/arrow — screenX/Y are container-relative for the DOM tooltip.
    const [drawingReadout, setDrawingReadout] = useState<DrawingReadout | null>(null)
    const [alignGuides, setAlignGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] })

    // ── Polygon tool refs + state ─────────────────────────────────────────────
    // Committed vertices (world-px) for the polygon currently being drawn —
    // ref is the source of truth read inside event handlers, state drives
    // the live preview render.
    const polygonPointsRef = useRef<Point[]>([])
    const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
    const [polygonPreviewEnd, setPolygonPreviewEnd] = useState<Point | null>(null)
    // Manual double-click-to-close detection (time + world-px distance from
    // the previous polygon click) — deliberately NOT Konva's native
    // onDblClick/`_dblclick` synthesis, which fires based on "same target
    // node" rather than actual cursor distance: clicking twice in quick
    // succession anywhere on the same large background shape (e.g. an
    // existing asset the polygon is being drawn over) was being
    // misdetected as a double-click and silently discarding the
    // in-progress polygon after almost every other vertex.
    const lastPolygonClickRef = useRef<{ x: number; y: number; time: number } | null>(null)

    // ── Measurement tool refs + state (ephemeral — never touches elements/
    // drawings, so it never persists) ─────────────────────────────────────────
    const measureStartRef = useRef<Point | null>(null)
    const [measurePreviewEnd, setMeasurePreviewEnd] = useState<Point | null>(null)
    const [measurement, setMeasurement] = useState<MeasurementResult | null>(null)

    // Switching tools discards any in-progress polygon and any ephemeral
    // measurement result — neither should survive past the tool that made
    // it. Switching the Measure sub-mode (Distancia ↔ Área) must clear the
    // same ephemeral state — a half-placed distance point or a stale area
    // readout shouldn't survive a mode change.
    useEffect(() => {
      polygonPointsRef.current = []
      setPolygonPoints([])
      setPolygonPreviewEnd(null)
      lastPolygonClickRef.current = null
      measureStartRef.current = null
      setMeasurePreviewEnd(null)
      setMeasurement(null)
      setDrawingReadout(null)
    }, [activeTool, measureMode])

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
      const tr = transformerRef.current
      const stage = stageRef.current
      if (!tr || !stage) return

      // Exactly one element selected: full Transformer (resize + rotate).
      if (selectedId) {
        const node = stage.findOne(`#${selectedId}`)
        if (node) {
          tr.resizeEnabled(true)
          tr.rotateEnabled(true)
          tr.enabledAnchors(RESIZE_ANCHORS)
          tr.nodes([node])
          tr.getLayer()?.batchDraw()
          return
        }
      }

      // Multi-selection: rotate-only Transformer on every non-locked node
      // (same exclusion as rotateElements / the group-drag). Resize is
      // disabled and enabledAnchors is emptied so scaleX/scaleY stay at 1
      // — the interactive rotate handle only ever writes x/y/rotation,
      // never touches the polygon points-rescale path. The numeric "Rotar
      // grupo (°)" input stays as a parallel path.
      if (selectedIds.size > 1) {
        const nodes = [...selectedIds]
          .filter(id => !elements.find(el => el.id === id)?.locked)
          .map(id => stage.findOne(`#${id}`))
          .filter((n): n is Konva.Node => !!n)
        if (nodes.length > 1) {
          tr.resizeEnabled(false)
          tr.rotateEnabled(true)
          tr.enabledAnchors([])
          tr.nodes(nodes)
          tr.getLayer()?.batchDraw()
          return
        }
      }

      tr.nodes([])
      tr.getLayer()?.batchDraw()
    }, [selectedId, selectedIds, elements])

    // Commit a group rotation done with the multi-node Transformer. Konva
    // has already orbited every node around the common pivot and set its
    // final x/y/rotation, with scaleX/scaleY back at ~1 (resize disabled),
    // so this just reads them and commits all in ONE history entry — same
    // shape as the group-drag's onDragEnd. Fires once on the Transformer
    // itself; the per-AssetShape onTransformEnd is skipped while >1 node is
    // attached (see below).
    //
    // KNOWN DIVERGENCE (accepted, do not try to reconcile): Konva pivots
    // around the centre of the selection's *rotation-aware* bounding box,
    // whereas the numeric "Rotar grupo (°)" input
    // (useCanvasState.rotateElements) uses the plain min/max(x,y,w,h)
    // centre. Identical when no selected element is already rotated; a
    // small offset otherwise.
    const handleGroupTransformEnd = useCallback(() => {
      const tr = transformerRef.current
      if (!tr) return
      const nodes = tr.nodes()
      if (nodes.length < 2) return
      onPushHistory()
      const updates: Record<string, Partial<LayoutElement>> = {}
      for (const node of nodes) {
        node.scaleX(1)
        node.scaleY(1)
        updates[node.id()] = {
          x: Math.round((node.x() / PIXELS_PER_METER) * 10) / 10,
          y: Math.round((node.y() / PIXELS_PER_METER) * 10) / 10,
          rotation: Math.round((((node.rotation() % 360) + 360) % 360)),
        }
      }
      onUpdateElements(updates)
    }, [onPushHistory, onUpdateElements])

    // ── Keyboard: Delete / Backspace ──────────────────────────────────────────

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (selectedIds.size > 1) {
          onDeleteElements([...selectedIds])
        } else if (selectedId) {
          onDeleteElement(selectedId)
        } else if (selectedDrawingId) {
          onDeleteDrawing(selectedDrawingId)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedId, selectedIds, selectedDrawingId, onDeleteElement, onDeleteElements, onDeleteDrawing])

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
              tool: preview.tool as 'line' | 'arrow' | 'dimension',
              points: preview.points,
              color: DRAW_COLOR,
              strokeWidth: DRAW_STROKE,
            })
          }
        }
        drawingStartRef.current = null
        previewDataRef.current = null
        setPreviewDrawing(null)
        setDrawingReadout(null)

        // Marquee-select completion (Selection mode only)
        if (marqueeOrigin.current !== null) {
          if (marqueeMoved.current) {
            const rect = marqueeRectRef.current
            if (rect) {
              const rLeft = rect.x, rRight = rect.x + rect.width
              const rTop = rect.y, rBottom = rect.y + rect.height
              const hitIds = elements
                .filter(el => !inertIds?.has(el.id))
                .filter(el => {
                  const elL = el.x * PIXELS_PER_METER
                  const elT = el.y * PIXELS_PER_METER
                  const elR = elL + el.width * PIXELS_PER_METER
                  const elB = elT + el.height * PIXELS_PER_METER
                  return elL < rRight && elR > rLeft && elT < rBottom && elB > rTop
                })
                .map(el => el.id)
              onSelectMultiple(hitIds)
            }
            suppressNextClick.current = true
          }
          marqueeOrigin.current = null
          marqueeMoved.current = false
          marqueeRectRef.current = null
          setMarqueeRect(null)
        }
      }
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchend', onUp)
      return () => {
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('touchend', onUp)
      }
    }, [onUpdateViewport, onAddDrawing, elements, onSelectMultiple, inertIds])

    // ── Export PNG ────────────────────────────────────────────────────────────

    const exportPNG = useCallback((opts?: { selectionIds?: Set<string> }) => {
      const ids = opts?.selectionIds
      if (!ids?.size) {
        exportLayoutPng(stageRef.current, containerSize, layoutMeta, versionNumber)
        return
      }
      const stage = stageRef.current
      const sel = elements.filter(e => ids.has(e.id))
      const b = contentBounds(sel, [])
      if (!stage || !b) return
      // Solo lo elegido (y los dibujos que caen enteros dentro): se oculta
      // lo demás un instante, se captura esa zona y se vuelve a mostrar.
      const keep = new Set(drawingsInside(drawings, b).map(d => d.id))
      const hidden: Konva.Node[] = []
      const hide = (sel: string) => { const n = stage.findOne(sel); if (n && n.visible()) { n.visible(false); hidden.push(n) } }
      for (const e of elements) if (!ids.has(e.id)) hide(`#${e.id}`)
      for (const d of drawings) if (!keep.has(d.id)) hide(`#drw-${d.id}`)
      const pad = 1 // m
      const sc = stage.scaleX()
      const region = {
        x: (b.minX - pad) * PIXELS_PER_METER * sc + stage.x(),
        y: (b.minY - pad) * PIXELS_PER_METER * sc + stage.y(),
        width: (b.maxX - b.minX + pad * 2) * PIXELS_PER_METER * sc,
        height: (b.maxY - b.minY + pad * 2) * PIXELS_PER_METER * sc,
      }
      try {
        exportSelectionPng(stage, region, layoutMeta, versionNumber)
      } finally {
        for (const n of hidden) n.visible(true)
        stage.batchDraw()
      }
    }, [containerSize, layoutMeta, versionNumber, elements, drawings])

    const exportPDF = useCallback((opts: { paper: PaperChoice; selectionIds?: Set<string> }) => {
      const ids = opts.selectionIds?.size ? opts.selectionIds : null
      const els = ids ? elements.filter(e => ids.has(e.id)) : elements
      const b = contentBounds(els, [])
      const drw = ids ? (b ? drawingsInside(drawings, b) : []) : drawings
      const hasBg = !!background && !!backgroundImage
      // Todo el plano: entra el fondo entero. Selección: el fondo recortado
      // a la zona de lo elegido.
      const extraBounds = !ids && hasBg ? { minX: background!.x, minY: background!.y, maxX: background!.x + background!.width, maxY: background!.y + background!.height } : undefined
      const region = ids ? contentBounds(els, drw) : null
      const r = buildLayoutPdf({
        elements: els, drawings: drw, meta: layoutMeta, versionNumber, lang,
        decimals: dimensionDecimals, paper: opts.paper, extraBounds, selectionOnly: !!ids,
        bakeBackground: hasBg ? (mmPerM => bakeBackground(background!, backgroundImage!, region, mmPerM)) : undefined,
      })
      if (!r) return
      r.doc.save(exportFileName(layoutMeta.proyecto, versionNumber, 'pdf'))
    }, [elements, drawings, layoutMeta, versionNumber, lang, dimensionDecimals, background, backgroundImage])

    // ── Ajustar a pantalla ────────────────────────────────────────────────────

    const fitToScreen = useCallback(() => {
      if (!containerSize) return
      const boxes = background ? [...elements, { x: background.x, y: background.y, width: background.width, height: background.height }] : elements
      const next = fitViewportToContent(boxes, drawings, containerSize, PIXELS_PER_METER, MIN_SCALE, MAX_SCALE)
      if (next) onUpdateViewport(next)
    }, [containerSize, elements, drawings, background, onUpdateViewport])

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        if (e.shiftKey && (e.code === 'Digit1' || e.key === '!')) { e.preventDefault(); fitToScreen() }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [fitToScreen])

    useImperativeHandle(ref, () => ({ exportPNG, exportPDF, fitToScreen }), [exportPNG, exportPDF, fitToScreen])

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

    // ── Polygon tool: finalize (close) the shape being drawn ─────────────────
    // Converts the committed world-px vertices into the LayoutElement.points
    // convention (meters, relative to the bounding box's top-left corner —
    // see types/layout.ts) and hands off to useCanvasState.addPolygon. Fewer
    // than 3 vertices means there's nothing to close — just discard.

    const finalizePolygon = useCallback((pts: Point[], closed = true) => {
      const isWall = activeTool === 'wall'
      const toM = (p: Point) => [p.x / PIXELS_PER_METER, p.y / PIXELS_PER_METER]
      if (activeTool === 'arc') {
        // inicio, fin y punto por donde pasa
        if (pts.length === 3) {
          const [a, b, m] = pts
          const bulge = bulgeFromThreePoints(a, b, m)
          if (Math.hypot(b.x - a.x, b.y - a.y) > 4) {
            onAddPath?.({ kind: 'arc', closed: false, ...normalizePath([...toM(a), ...toM(b)], [{ kind: 'arc', bulge }], false) })
          }
        }
      } else if (activeTool === 'curve') {
        const isClosed = closed && pts.length >= 3
        if (pts.length >= 2) {
          const abs = pts.flatMap(toM)
          onAddPath?.({ kind: 'curve', closed: isClosed, ...normalizePath(abs, smoothSegments(abs, isClosed), isClosed) })
        }
      } else if (pts.length >= (isWall ? 2 : 3)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of pts) {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
        }
        const relPointsMeters: number[] = []
        for (const p of pts) {
          relPointsMeters.push((p.x - minX) / PIXELS_PER_METER, (p.y - minY) / PIXELS_PER_METER)
        }
        const shape = {
          x: minX / PIXELS_PER_METER,
          y: minY / PIXELS_PER_METER,
          width: (maxX - minX) / PIXELS_PER_METER,
          height: (maxY - minY) / PIXELS_PER_METER,
          points: relPointsMeters,
        }
        if (isWall) onAddWall?.({ ...shape, width: Math.max(shape.width, 0.01), height: Math.max(shape.height, 0.01), closed: closed && pts.length >= 3 })
        else onAddPolygon(shape)
      }
      polygonPointsRef.current = []
      setPolygonPoints([])
      setPolygonPreviewEnd(null)
      setDrawingReadout(null)
      lastPolygonClickRef.current = null
    }, [onAddPolygon, onAddWall, onAddPath, activeTool])

    // ── Mouse down — pan OR drawing start ────────────────────────────────────

    const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      if (isVertexTool(activeTool)) {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        const pts = polygonPointsRef.current
        const now = Date.now()
        const prevClick = lastPolygonClickRef.current

        // Manual double-click-to-close: a second mousedown within 400ms and
        // 6px of the previous one, anywhere along the polygon (not just on
        // the first vertex) — see lastPolygonClickRef's comment for why
        // this can't be Konva's native onDblClick.
        if (
          pts.length >= 2 &&
          prevClick && now - prevClick.time < 400 &&
          Math.hypot(pos.x - prevClick.x, pos.y - prevClick.y) < 6
        ) {
          // El primer clic del doble clic ya puso un vértice acá: es el
          // último punto y se conserva. Solo se descarta si quedó repetido
          // encima del anterior (doble clic sobre el último vértice ya puesto).
          // Doble clic: polígono cerrado; muro y curva abiertos. (El arco
          // termina solo con su tercer clic.)
          if (activeTool !== 'arc') {
            const n = pts.length
            const dup = n >= 2 && Math.hypot(pts[n - 1].x - pts[n - 2].x, pts[n - 1].y - pts[n - 2].y) < 6 / viewport.scale
            finalizePolygon(dup ? pts.slice(0, -1) : pts, activeTool === 'polygon')
            return
          }
        }
        lastPolygonClickRef.current = { x: pos.x, y: pos.y, time: now }

        if (pts.length === 0) {
          polygonPointsRef.current = [pos]
          setPolygonPoints([pos])
          return
        }
        // Arco: el tercer clic es el punto por donde pasa (sin snap de ángulo).
        if (activeTool === 'arc' && pts.length === 2) {
          finalizePolygon([...pts, pos], false)
          return
        }
        const first = pts[0]
        const closeThresholdPx = 10 / viewport.scale
        if (activeTool !== 'arc' && pts.length >= 3 && Math.hypot(pos.x - first.x, pos.y - first.y) <= closeThresholdPx) {
          finalizePolygon(pts, true)
          return
        }
        const last = pts[pts.length - 1]
        const rawAngle = angleDegrees(last.x, last.y, pos.x, pos.y)
        const snappedAngle = applyAngleSnap(rawAngle, e.evt.shiftKey)
        const lengthM = lengthMeters(last.x, last.y, pos.x, pos.y, PIXELS_PER_METER)
        const newPoint = pointFromLengthAngle(last, lengthM, snappedAngle, PIXELS_PER_METER)
        const newPts = [...pts, newPoint]
        polygonPointsRef.current = newPts
        setPolygonPoints(newPts)
        return
      }

      // Calibrar el fondo: dos clics sobre una medida conocida del plano.
      if (activeTool === 'calibrate') {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        if (measureStartRef.current === null) {
          measureStartRef.current = pos
          return
        }
        const origin = measureStartRef.current
        const lengthM = lengthMeters(origin.x, origin.y, pos.x, pos.y, PIXELS_PER_METER)
        measureStartRef.current = null
        setMeasurePreviewEnd(null)
        setDrawingReadout(null)
        if (lengthM > 0) onCalibrate?.(lengthM, { x: origin.x / PIXELS_PER_METER, y: origin.y / PIXELS_PER_METER })
        return
      }

      if (activeTool === 'measure') {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        const box = containerRef.current?.getBoundingClientRect()
        const screenX = box ? e.evt.clientX - box.left : 0
        const screenY = box ? e.evt.clientY - box.top : 0

        if (measureMode === 'area') {
          // Área only ever reacts to hitting an element — clicking empty
          // space (or anything without an element id, e.g. a drawing) does
          // nothing, per spec: there's no area to measure there.
          if (e.target !== e.target.getStage()) {
            const elId = findElementId(e.target)
            const el = elId ? elements.find(x => x.id === elId) : null
            if (el) {
              setMeasurement({ type: 'area', areaM2: elementAreaMeters(el), elementName: getAssetName(lang, el.name), screenX, screenY })
            }
          }
          return
        }

        // Distancia — elements never capture the click; `pos` is the exact
        // pointer position regardless of what (if anything) is underneath,
        // so measuring between two points that fall on/inside elements
        // (e.g. a pool edge and a tree) works the same as on empty canvas.
        if (measureStartRef.current === null) {
          measureStartRef.current = pos
          setMeasurement(null)
          return
        }

        const origin = measureStartRef.current
        const lengthM = lengthMeters(origin.x, origin.y, pos.x, pos.y, PIXELS_PER_METER)
        const angleDeg = angleDegrees(origin.x, origin.y, pos.x, pos.y)
        setMeasurement({ type: 'distance', lengthM, angleDeg, screenX, screenY })
        measureStartRef.current = null
        setMeasurePreviewEnd(null)
        setDrawingReadout(null)
        return
      }

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

      if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'dimension') {
        const pos = stage.getRelativePointerPosition()
        if (!pos) return
        drawingStartRef.current = { x: pos.x, y: pos.y }
        drawingToolRef.current = activeTool
        return
      }

      if (activeTool === 'hand') {
        // Hand mode: pan from anywhere — empty canvas or on top of an
        // element. Elements are non-interactive in this mode (see
        // elementInteractive below), so nothing else can claim the drag.
        isPanning.current = true
        panOrigin.current = {
          clientX: e.evt.clientX,
          clientY: e.evt.clientY,
          vpX: stage.x(),
          vpY: stage.y(),
        }
        return
      }

      // Selection mode: click on an element is handled by the element's own
      // handlers (select / shift-toggle / drag). A click-drag starting on
      // empty canvas begins a marquee-select instead of panning.
      if (e.target !== e.target.getStage()) return
      if (isDraggingElement.current) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return
      marqueeOrigin.current = pos
      marqueeMoved.current = false
    }, [activeTool, measureMode, onAddDrawing, viewport.scale, finalizePolygon, elements, onCalibrate])

    // ── Mouse move ────────────────────────────────────────────────────────────

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      if (isVertexTool(activeTool) && polygonPointsRef.current.length > 0) {
        const pos = stage.getRelativePointerPosition()
        if (pos) {
          const pts = polygonPointsRef.current
          const last = pts[pts.length - 1]
          const rawAngle = angleDegrees(last.x, last.y, pos.x, pos.y)
          const snappedAngle = applyAngleSnap(rawAngle, e.evt.shiftKey)
          const lengthM = lengthMeters(last.x, last.y, pos.x, pos.y, PIXELS_PER_METER)
          const endPoint = pointFromLengthAngle(last, lengthM, snappedAngle, PIXELS_PER_METER)
          setPolygonPreviewEnd(endPoint)

          const box = containerRef.current?.getBoundingClientRect()
          setDrawingReadout({
            screenX: box ? e.evt.clientX - box.left : 0,
            screenY: box ? e.evt.clientY - box.top : 0,
            lengthM,
            angleDeg: snappedAngle,
            snapped: snappedAngle !== rawAngle,
          })
        }
        return
      }

      if ((activeTool === 'measure' || activeTool === 'calibrate') && measureStartRef.current !== null) {
        const pos = stage.getRelativePointerPosition()
        if (pos) {
          const origin = measureStartRef.current
          const lengthM = lengthMeters(origin.x, origin.y, pos.x, pos.y, PIXELS_PER_METER)
          const angleDeg = angleDegrees(origin.x, origin.y, pos.x, pos.y)
          setMeasurePreviewEnd(pos)

          const box = containerRef.current?.getBoundingClientRect()
          setDrawingReadout({
            screenX: box ? e.evt.clientX - box.left : 0,
            screenY: box ? e.evt.clientY - box.top : 0,
            lengthM,
            angleDeg,
            snapped: false,
          })
        }
        return
      }

      if (drawingStartRef.current !== null) {
        const pos = stage.getRelativePointerPosition()
        if (pos) {
          const origin = drawingStartRef.current
          const rawAngle = angleDegrees(origin.x, origin.y, pos.x, pos.y)
          const snappedAngle = applyAngleSnap(rawAngle, e.evt.shiftKey)
          const lengthM = lengthMeters(origin.x, origin.y, pos.x, pos.y, PIXELS_PER_METER)
          const endPoint = pointFromLengthAngle(origin, lengthM, snappedAngle, PIXELS_PER_METER)

          const newPreview = {
            tool: drawingToolRef.current,
            points: [origin.x, origin.y, endPoint.x, endPoint.y],
          }
          previewDataRef.current = newPreview
          setPreviewDrawing(newPreview)

          const box = containerRef.current?.getBoundingClientRect()
          setDrawingReadout({
            screenX: box ? e.evt.clientX - box.left : 0,
            screenY: box ? e.evt.clientY - box.top : 0,
            lengthM,
            angleDeg: snappedAngle,
            snapped: snappedAngle !== rawAngle,
          })
        }
        return
      }

      if (isPanning.current) {
        stage.x(panOrigin.current.vpX + (e.evt.clientX - panOrigin.current.clientX))
        stage.y(panOrigin.current.vpY + (e.evt.clientY - panOrigin.current.clientY))
        stage.batchDraw()
        return
      }

      if (marqueeOrigin.current !== null) {
        const pos = stage.getRelativePointerPosition()
        if (pos) {
          const origin = marqueeOrigin.current
          if (!marqueeMoved.current && Math.hypot(pos.x - origin.x, pos.y - origin.y) > 4) {
            marqueeMoved.current = true
          }
          if (marqueeMoved.current) {
            const rect = {
              x: Math.min(origin.x, pos.x),
              y: Math.min(origin.y, pos.y),
              width: Math.abs(pos.x - origin.x),
              height: Math.abs(pos.y - origin.y),
            }
            marqueeRectRef.current = rect
            setMarqueeRect(rect)
          }
        }
        return
      }

      const pos = stage.getRelativePointerPosition()
      if (pos) {
        setCursorPos({
          x: Math.round((pos.x / PIXELS_PER_METER) * 10) / 10,
          y: Math.round((pos.y / PIXELS_PER_METER) * 10) / 10,
        })
      }
    }, [activeTool])

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
        // The browser fires a native click right after mouseup on the same
        // target even when that mouseup ended a real drag (marquee-select) —
        // don't let it immediately undo what the drag just selected.
        if (suppressNextClick.current) {
          suppressNextClick.current = false
          return
        }
        // Hand mode never selects/deselects — only Selection mode does.
        if (activeTool !== 'pointer') return
        if (e.target === e.target.getStage()) {
          onSelect(null)
          onSelectDrawing(null)
        }
      },
      [activeTool, onSelect, onSelectDrawing],
    )

    const cursor = activeTool === 'hand' ? 'grab' : activeTool !== 'pointer' ? 'crosshair' : 'default'
    // Vista previa de arco y curva: la curva que quedaría con el cursor.
    const curvePreview = useMemo(() => {
      if (activeTool !== 'arc' && activeTool !== 'curve') return null
      const pts = polygonPreviewEnd ? [...polygonPoints, polygonPreviewEnd] : polygonPoints
      if (activeTool === 'arc') {
        if (pts.length < 3) return null
        const [a, b, m] = pts
        return flattenPath([a.x, a.y, b.x, b.y], [{ kind: 'arc', bulge: bulgeFromThreePoints(a, b, m) }], false)
      }
      if (pts.length < 3) return null
      const flat = pts.flatMap(p => [p.x, p.y])
      return flattenPath(flat, smoothSegments(flat, false), false)
    }, [activeTool, polygonPoints, polygonPreviewEnd])

    const elementInteractive = activeTool === 'pointer'
    const drawingsInteractive = activeTool === 'pointer' && !drawingsLocked

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
            {/* Plano del local de fondo: debajo de todo. Solo se arrastra en
                modo Selección, desbloqueado y con permiso de editar. */}
            {background && backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                x={background.x * PIXELS_PER_METER}
                y={background.y * PIXELS_PER_METER}
                width={background.width * PIXELS_PER_METER}
                height={background.height * PIXELS_PER_METER}
                opacity={background.opacity}
                listening={!!onUpdateBackground && !background.locked && activeTool === 'pointer'}
                draggable={!!onUpdateBackground && !background.locked && activeTool === 'pointer'}
                onDragEnd={e => {
                  onUpdateBackground?.({
                    x: Math.round((e.target.x() / PIXELS_PER_METER) * 100) / 100,
                    y: Math.round((e.target.y() / PIXELS_PER_METER) * 100) / 100,
                  })
                }}
              />
            )}
            {elements.map(el => (
              <AssetShape
                key={el.id}
                element={el}
                displayName={getAssetName(lang, el.name)}
                decimals={dimensionDecimals}
                isSelected={selectedIds.has(el.id)}
                interactive={elementInteractive && !inertIds?.has(el.id)}
                onSelect={(shiftKey) => (shiftKey ? onToggleSelect(el.id) : onSelect(el.id))}
                onDragStart={() => {
                  isDraggingElement.current = true
                  // Lo que se mueve junto: la selección (si la pieza está en
                  // una selección múltiple) y, para cada pieza que no sea
                  // silla, su conjunto entero (mesa con sus sillas). Una
                  // silla arrastrada sola se mueve sola. Lo bloqueado queda.
                  const ids = dragSet(el.id, selectedIds, elements).filter(id => !inertIds?.has(id))
                  if (ids.length > 1) {
                    const origin = new Map<string, { x: number; y: number }>()
                    for (const id of ids) {
                      const other = elements.find(e => e.id === id)
                      if (other) origin.set(id, { x: other.x * PIXELS_PER_METER, y: other.y * PIXELS_PER_METER })
                    }
                    groupDragOrigin.current = origin
                  } else {
                    groupDragOrigin.current = null
                  }
                }}
                onDragMove={(gx, gy) => {
                  const origin = groupDragOrigin.current
                  if (origin && origin.has(el.id)) {
                    const start = origin.get(el.id)!
                    const dx = gx - start.x
                    const dy = gy - start.y
                    const stage = stageRef.current
                    if (stage) {
                      for (const [id, startPos] of origin) {
                        if (id === el.id) continue
                        const node = stage.findOne(`#${id}`)
                        node?.position({ x: startPos.x + dx, y: startPos.y + dy })
                      }
                      stage.batchDraw()
                    }
                  }
                  setAlignGuides(computeAlignmentGuides(
                    elements, el.id, gx, gy,
                    el.width * PIXELS_PER_METER, el.height * PIXELS_PER_METER,
                    viewport.scale,
                  ))
                }}
                onDragEnd={(x, y) => {
                  isDraggingElement.current = false
                  setAlignGuides({ xs: [], ys: [] })
                  const origin = groupDragOrigin.current
                  if (origin && origin.has(el.id)) {
                    const start = origin.get(el.id)!
                    const dx = x - start.x
                    const dy = y - start.y
                    onPushHistory()
                    const updates: Record<string, Partial<LayoutElement>> = {}
                    // El desplazamiento va redondeado a 10 cm y se suma a la
                    // posición exacta de cada pieza: así las sillas no se
                    // corren respecto de su mesa al redondear.
                    const mdx = Math.round((dx / PIXELS_PER_METER) * 10) / 10
                    const mdy = Math.round((dy / PIXELS_PER_METER) * 10) / 10
                    for (const id of origin.keys()) {
                      const cur = elements.find(e => e.id === id)
                      if (!cur) continue
                      updates[id] = {
                        x: Math.round((cur.x + mdx) * 1000) / 1000,
                        y: Math.round((cur.y + mdy) * 1000) / 1000,
                      }
                    }
                    onUpdateElements(updates)
                    groupDragOrigin.current = null
                    return
                  }
                  onPushHistory()
                  onUpdateElement(el.id, {
                    x: Math.round((x / PIXELS_PER_METER) * 10) / 10,
                    y: Math.round((y / PIXELS_PER_METER) * 10) / 10,
                  })
                }}
                onTransformEnd={(x, y, w, h, rotation) => {
                  // Group rotate (>1 node on the Transformer) is committed
                  // once by handleGroupTransformEnd — skip the per-element
                  // path so it doesn't fire N times with N history entries.
                  if ((transformerRef.current?.nodes().length ?? 0) > 1) return
                  onPushHistory()
                  const updates: Partial<LayoutElement> = { x, y, width: w, height: h, rotation }
                  // Polygon vertices are stored as raw meter offsets (not
                  // normalized to width/height), so a resize has to rescale
                  // them explicitly or the shape would snap back to its
                  // original size once the Transformer's scale resets to 1.
                  if ((el.shape === 'polygon' || el.shape === 'wall' || el.shape === 'path') && el.points && el.points.length >= 4) {
                    const scaleX = el.width !== 0 ? w / el.width : 1
                    const scaleY = el.height !== 0 ? h / el.height : 1
                    updates.points = el.points.map((v, i) => (i % 2 === 0 ? v * scaleX : v * scaleY))
                    // Manijas de las curvas libres también; los arcos siguen siendo arcos.
                    if (el.segments) updates.segments = scaleSegments(el.segments, scaleX, scaleY)
                  }
                  onUpdateElement(el.id, updates)
                }}
              />
            ))}

            {drawings.map(drw => (
              <Group key={drw.id} id={`drw-${drw.id}`}>
              <DrawingShape
                drawing={drw}
                decimals={dimensionDecimals}
                isSelected={drw.id === selectedDrawingId}
                interactive={drawingsInteractive}
                onSelect={() => onSelectDrawing(drw.id)}
                onMoveDrawing={(newPoints) => onUpdateDrawing(drw.id, { points: newPoints })}
                onPushHistory={onPushHistory}
              />
              </Group>
            ))}

            {previewDrawing && (
              <DrawingPreview tool={previewDrawing.tool} points={previewDrawing.points} />
            )}

            {marqueeRect && (
              <Rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.width}
                height={marqueeRect.height}
                fill="rgba(99,102,241,0.15)"
                stroke="#6366f1"
                strokeWidth={1 / viewport.scale}
                listening={false}
              />
            )}

            {/* Polygon tool — committed vertices so far + dashed live
                segment to the (snapped) cursor position; first vertex is
                highlighted larger to signal "click here to close" */}
            {polygonPoints.length > 0 && (
              <>
                <Line
                  points={curvePreview ?? polygonPoints.flatMap(p => [p.x, p.y])}
                  stroke={DRAW_COLOR}
                  strokeWidth={DRAW_STROKE}
                  lineJoin="round"
                  listening={false}
                />
                {polygonPreviewEnd && !curvePreview && (
                  <Line
                    points={[
                      polygonPoints[polygonPoints.length - 1].x,
                      polygonPoints[polygonPoints.length - 1].y,
                      polygonPreviewEnd.x,
                      polygonPreviewEnd.y,
                    ]}
                    stroke={DRAW_COLOR}
                    strokeWidth={DRAW_STROKE}
                    dash={[6, 4]}
                    opacity={0.7}
                    listening={false}
                  />
                )}
                {polygonPoints.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={(i === 0 ? 5 : 3) / viewport.scale}
                    fill={i === 0 ? '#22d3ee' : DRAW_COLOR}
                    listening={false}
                  />
                ))}
              </>
            )}

            {/* Measurement tool — dashed line between the two clicked
                points while waiting for the second click */}
            {(activeTool === 'measure' || activeTool === 'calibrate') && measureStartRef.current && measurePreviewEnd && (
              <Line
                points={[
                  measureStartRef.current.x, measureStartRef.current.y,
                  measurePreviewEnd.x, measurePreviewEnd.y,
                ]}
                stroke="#22d3ee"
                strokeWidth={1.5}
                dash={[6, 4]}
                listening={false}
              />
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
              onTransformEnd={handleGroupTransformEnd}
            />
          </Layer>
        </Stage>
        )}

        <CanvasHud
          cursorPos={cursorPos}
          scale={viewport.scale}
          fitLabel={t.fitToScreen}
          onFitToScreen={fitToScreen}
          drawingReadout={drawingReadout}
          measurement={measurement}
        />
      </div>
    )
  }
)

export default LayoutCanvas
