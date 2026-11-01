import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import RecoveryBanner from '@/components/RecoveryBanner'
import VersionHistory from '@/components/VersionHistory'
import VenueBackgroundPanel from '@/components/VenueBackgroundPanel'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { calibrate as calibrateBackground } from '@/lib/venueBackground'
import { formatMeters } from '@/lib/dimension'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useLang, getAssetName } from '@/context/LangContext'
import { useCanvasState } from '@/hooks/useCanvasState'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useLayoutAutosave } from '@/hooks/useLayoutAutosave'
import { useCustomAssets } from '@/hooks/useCustomAssets'
import { supabase } from '@/lib/supabase'
import { layoutService, type LayoutData, type LayoutVersion } from '@/lib/layoutService'
import { draftService, type LayoutDraft } from '@/lib/draftService'
import { normalizeLayoutMeta } from '@/lib/layoutMeta'
import { buildTemplate, type TemplatePayload } from '@/lib/templates'
import { applyLayers, normalizeLayers, countByLayer, layerOf } from '@/lib/layers'
import LayersPanel from '@/components/LayersPanel'
import ExportDialog from '@/components/ExportDialog'
import { writeSnapshot3D } from '@/lib/snapshot3d'
import { useLayoutVocab } from '@/hooks/useLayoutVocab'
import MaterialsPanel from '@/components/materials/MaterialsPanel'
import { furnishingUpdates, type Furnishing } from '@/lib/furnishing'
import type { PaperChoice } from '@/lib/pdfLayout'
import type { CustomAsset } from '@/lib/assetService'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { effectivePax, isPaxAuto } from '@/lib/seating'
import { isPermissionError, NO_LAYOUT_PERMISSIONS, type LayoutPermissions } from '@/lib/layoutPermissions'
import type { AssetTemplate, LayoutElement, GroupChild, DrawingPrimitive, LayerId } from '@/types/layout'

const round2 = (n: number) => Math.round(n * 100) / 100
const NO_DRAWINGS: DrawingPrimitive[] = []

// Combined bounding box of a multi-selection + each element's offset from
// its top-left origin, ready to store as a 'group' custom asset. Same
// plain min/max bbox as addPolygon (rotation is not factored in — a
// rotated piece keeps its rotation but the box uses its unrotated rect).
function buildGroupAsset(els: LayoutElement[]): {
  width: number
  height: number
  children: GroupChild[]
} {
  const minX = Math.min(...els.map(e => e.x))
  const minY = Math.min(...els.map(e => e.y))
  const maxX = Math.max(...els.map(e => e.x + e.width))
  const maxY = Math.max(...els.map(e => e.y + e.height))
  const children: GroupChild[] = els.map(e => ({
    name: e.name,
    category: e.category,
    shape: e.shape,
    dx: round2(e.x - minX),
    dy: round2(e.y - minY),
    width: round2(e.width),
    height: round2(e.height),
    rotation: e.rotation,
    color: e.color,
    opacity: e.opacity,
    flipX: e.flipX,
    flipY: e.flipY,
    notes: e.notes || undefined,
    points: (e.shape === 'polygon' || e.shape === 'wall' || e.shape === 'path') && e.points ? e.points.map(round2) : undefined,
    seats: e.seats || undefined,
    layer: e.layer,
    segments: e.segments,
    closed: e.closed,
    thickness: e.thickness,
  }))
  return { width: round2(maxX - minX), height: round2(maxY - minY), children }
}

type AssetSaveTarget =
  | { kind: 'shape'; element: LayoutElement }
  | { kind: 'group'; count: number; width: number; height: number; children: GroupChild[] }
  | { kind: 'template'; count: number; width: number; height: number; payload: TemplatePayload }

interface Props {
  layoutIdToLoad?: string | null
  eventId?: string | null
  orgId?: string
  onLayoutForked?: (newId: string) => void
  // Facultades de Layout del rol (Administración → Roles y permisos).
  permissions?: LayoutPermissions
}

export default function LayoutEditor({ layoutIdToLoad, eventId, orgId = '', onLayoutForked, permissions = NO_LAYOUT_PERMISSIONS }: Props) {
  const { t, lang } = useLang()
  const canvasRef = useRef<LayoutCanvasHandle>(null)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [duplicating, setDuplicating] = useState(false)
  const [savingAsCopy, setSavingAsCopy] = useState(false)
  const [inputName, setInputName] = useState('Sin título')
  // Autosave: false hasta que el layout terminó de cargar (o hasta que
  // sabemos que es uno nuevo). Evita que aplicar el contenido recién
  // cargado dispare un draft.
  const [bootstrapped, setBootstrapped] = useState(false)
  const [recovery, setRecovery] = useState<LayoutDraft | null>(null)
  // "Guardar como asset": objetivo (una forma o un grupo) en espera de
  // nombre + nombre tipeado en el modal.
  const [assetTarget, setAssetTarget] = useState<AssetSaveTarget | null>(null)
  const [assetName, setAssetName] = useState('')
  const [assetError, setAssetError] = useState<string | null>(null)
  // "Compartir con la org" al guardar (solo con la facultad Compartir).
  const [assetShare, setAssetShare] = useState(false)
  // Aviso corto de la biblioteca (plantilla usada, plano vacío…).
  const [templateMsg, setTemplateMsg] = useState<string | null>(null)
  const [layersOpen, setLayersOpen] = useState(false)
  // Diálogo de exportar (bloque 8).
  const [exportOpen, setExportOpen] = useState<'pdf' | 'png' | null>(null)
  // Lista de materiales.
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  // La base rechazó una operación por permisos → aviso "No tienes permiso".
  const [permissionDenied, setPermissionDenied] = useState(false)
  // Cliente del evento vinculado (eventos.events.client_name). Si hay, la
  // casilla CLIENTE lo muestra y no se edita a mano.
  const [eventClient, setEventClient] = useState<string | null>(null)
  const eventClientRef = useRef<string | null>(null)
  eventClientRef.current = eventClient

  const {
    elements, selectedId, selectedIds, selectedElement,
    selectedDrawingId, selectedDrawing,
    viewport, selectElement, toggleSelectElement, selectElements, selectDrawing,
    updateElement, updateElements, updateViewport, addElement, addGroup, addPolygon, addWall, addPath,
    deleteElement, deleteElements, duplicateElement, duplicateElements,
    bringToFront, sendToBack, rotateElements, alignElements, distributeElements, repeatInGrid,
    ungroupElements, groupTablesWithChairs, addTemplate,
    activeTool, setTool, measureMode, setMeasureMode,
    drawings, addDrawing, deleteDrawing, updateDrawing,
    clearDrawings, layoutMeta, updateMeta,
    pushHistory, undo, redo, canUndo, canRedo,
    setElements, setDrawings, setViewport, setLayoutMeta,
  } = useCanvasState()

  // Holding Space temporarily switches to Hand mode without touching the
  // persisted activeTool — releasing it reverts automatically (Figma pattern).
  const [spaceHeld, setSpaceHeld] = useState(false)
  const effectiveTool = spaceHeld ? 'hand' : activeTool

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const persistence = useLayoutPersistence(userId, eventId)
  const { save, load, layoutId, versionNumber, setVersionNumber } = persistence

  // Guardar un plano existente pide "editar"; el primer Guardar de uno nuevo
  // pide "crear". Sin eso, el editor queda en solo lectura (se puede mirar,
  // medir y exportar). La base igual rechaza cualquier escritura sin permiso.
  // Mientras se cargan las facultades no se pasa a solo lectura (evita el
  // parpadeo); Guardar igual queda oculto hasta saberlas.
  const canSave = layoutId ? permissions.canEdit : permissions.canCreate
  const readOnly = !permissions.loading && !canSave
  useEffect(() => {
    if (readOnly) setTool('hand')
  }, [readOnly, setTool])

  const { assets: customAssets, createAsset, deleteAsset, setShared } = useCustomAssets(userId, orgId)
  // Medidas de mesas/sillas y separación entre mesas de la org.
  const layoutSettings = useLayoutSettings(orgId)
  // Sugerencias de la org para tipos de silla, telas y nombres de color.
  const { vocab } = useLayoutVocab(orgId)
  // Capas (bloque 6): lo oculto no se dibuja ni se exporta; lo bloqueado no
  // se elige ni se mueve. El PAX cuenta todo igual.
  const layerState = useMemo(() => normalizeLayers(layoutMeta.layers), [layoutMeta.layers])
  const layerView = useMemo(() => applyLayers(elements, layerState), [elements, layerState])
  const layerCounts = useMemo(() => countByLayer(elements, drawings.length), [elements, drawings.length])
  useEffect(() => {
    if (!templateMsg) return
    const id = setTimeout(() => setTemplateMsg(null), 4000)
    return () => clearTimeout(id)
  }, [templateMsg])

  const setLayers = useCallback((next: typeof layerState) => {
    // Lo que queda oculto o bloqueado deja de estar seleccionado.
    selectElement(null)
    selectDrawing(null)
    updateMeta({ layers: next })
  }, [selectElement, selectDrawing, updateMeta])

  // Cambiar de capa: la selección y el conjunto entero de cada pieza. Una
  // entrada de deshacer.
  const setLayerFor = useCallback((ids: string[], layer: LayerId) => {
    const groups = new Set(elements.filter(e => ids.includes(e.id) && e.groupId).map(e => e.groupId))
    const target = elements.filter(e => ids.includes(e.id) || (e.groupId && groups.has(e.groupId)))
    if (!target.length) return
    pushHistory()
    updateElements(Object.fromEntries(target.map(e => [e.id, { layer }])))
    // Si la capa está oculta o bloqueada, la pieza deja de estar elegida.
    if (layerState.hidden.includes(layer) || layerState.locked.includes(layer)) selectElement(null)
  }, [elements, pushHistory, updateElements, layerState, selectElement])
  // Mantel y sillas de un conjunto o selección: una entrada de deshacer.
  const handleFurnish = useCallback((ids: string[], f: Furnishing) => {
    const u = furnishingUpdates(ids, elements, f)
    if (!Object.keys(u).length) return
    pushHistory()
    updateElements(u)
  }, [elements, pushHistory, updateElements])
  const selectionLayer = useMemo(() => {
    const ls = new Set(elements.filter(e => selectedIds.has(e.id)).map(layerOf))
    return ls.size === 1 ? [...ls][0] : null
  }, [elements, selectedIds])

  // Piezas de los conjuntos tocados por la selección (para "Desagrupar").
  const { groupedCount, groupsCount } = useMemo(() => {
    const groups = new Set(elements.filter(e => selectedIds.has(e.id) && e.groupId).map(e => e.groupId))
    return {
      groupedCount: groups.size ? elements.filter(e => e.groupId && groups.has(e.groupId)).length : 0,
      groupsCount: groups.size,
    }
  }, [elements, selectedIds])
  // PAX automático: la casilla muestra los asientos dibujados (o lo escrito
  // a mano). Va igual en pantalla, PNG y PDF.
  const displayMeta = useMemo(
    () => ({ ...layoutMeta, pax: effectivePax(layoutMeta, elements) }),
    [layoutMeta, elements],
  )
  const paxAuto = isPaxAuto(layoutMeta)
  // Plano del local de fondo (bloque 5).
  const backgroundImage = useBackgroundImage(layoutMeta.background?.path)
  const [venueOpen, setVenueOpen] = useState(false)
  const [calibration, setCalibration] = useState<{ measuredM: number; anchor: { x: number; y: number } } | null>(null)
  const [calibrationReal, setCalibrationReal] = useState('')
  // El clic en el canvas que abre el diálogo de calibrar se queda con el foco;
  // se le pasa al campo un instante después, ya con el diálogo en pantalla.
  const calibrationInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!calibration) return
    const timer = window.setTimeout(() => calibrationInputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [calibration])

  useEffect(() => {
    if (!layoutIdToLoad) {
      // Layout nuevo: no hay nada que restaurar. El autosave igual queda
      // inactivo hasta el primer "Guardar" manual (no hay fila layouts a
      // la que asociar el draft — gap conocido).
      setBootstrapped(true)
      return
    }
    if (!userId) return
    setBootstrapped(false)
    setRecovery(null)
    load(layoutIdToLoad).then(async data => {
      // El cliente del evento se resuelve ANTES de aplicar el contenido: así
      // entra en la misma carga y no dispara un autoguardado al abrir.
      const linkedEventId = data.eventId ?? eventId ?? null
      let client: string | null = null
      if (linkedEventId) {
        try {
          client = (await layoutService.getEventInfo(linkedEventId)).clientName
        } catch (err) {
          console.error('[LayoutEditor] getEventInfo error:', err)
        }
      }
      setEventClient(client)
      if (data.elements) setElements(data.elements)
      if (data.drawings) setDrawings(data.drawings)
      if (data.viewport) setViewport(data.viewport)
      const meta = normalizeLayoutMeta(data.meta, data.name, client)
      setLayoutMeta(meta)
      setInputName(meta.proyecto || 'Sin título')
      // Recuperación: ¿hay un draft de autosave más nuevo que la fila real?
      try {
        const draft = await draftService.get(layoutIdToLoad)
        if (draft) {
          const rowTs = data.updatedAt ? new Date(data.updatedAt).getTime() : 0
          const draftTs = new Date(draft.updated_at).getTime()
          const sameContent =
            JSON.stringify(draft.elements ?? []) === JSON.stringify(data.elements ?? []) &&
            JSON.stringify(draft.drawings ?? []) === JSON.stringify(data.drawings ?? [])
          if (draftTs > rowTs && !sameContent) {
            setRecovery(draft)
          } else {
            // Draft más viejo que el último guardado, o idéntico a él:
            // ruido, se limpia en silencio.
            void draftService.clear(layoutIdToLoad).catch(() => {})
          }
        }
      } catch {
        /* la recuperación es best-effort — nunca bloquea abrir el layout */
      }
      setBootstrapped(true)
    })
  }, [layoutIdToLoad, userId])

  // Layout nuevo creado desde la ficha de un evento en Eventos (?event_id=
  // en la URL, sin layoutIdToLoad): hereda el nombre del evento como
  // PROYECTO inicial (sigue editable) y el cliente del evento como CLIENTE.
  // Si se está cargando un layout existente, manda lo guardado (arriba).
  useEffect(() => {
    if (!eventId || layoutIdToLoad) return
    layoutService.getEventInfo(eventId)
      .then(({ name, clientName }) => {
        setEventClient(clientName)
        if (name) setInputName(name)
        updateMeta({ ...(name ? { proyecto: name } : {}), cliente: clientName ?? '' })
      })
      .catch(err => console.error('[LayoutEditor] getEventInfo error:', err))
  }, [eventId, layoutIdToLoad])

  useEffect(() => {
    if (layoutMeta.proyecto !== undefined && layoutMeta.proyecto !== inputName) {
      setInputName(layoutMeta.proyecto)
    }
  }, [layoutMeta.proyecto])

  const elementsRef = useRef(elements)
  const drawingsRef = useRef(drawings)
  const viewportRef = useRef(viewport)
  const layoutMetaRef = useRef(layoutMeta)
  const inputNameRef = useRef(inputName)

  elementsRef.current = elements
  drawingsRef.current = drawings
  viewportRef.current = viewport
  layoutMetaRef.current = layoutMeta
  inputNameRef.current = inputName

  // Snapshot siempre-actual para el autosave. El nombre vive en
  // meta.proyecto (igual que en handleSave). El viewport va en el payload
  // pero NO en dirtyKey — pan/zoom no debe disparar autosave.
  const snapshotRef = useRef<LayoutData>({ elements, drawings, meta: layoutMeta, viewport })
  snapshotRef.current = {
    elements,
    drawings,
    meta: { ...layoutMeta, proyecto: inputName },
    viewport,
  }

  const dirtyKey = useMemo(
    () => ({ elements, drawings, meta: layoutMeta, name: inputName }),
    [elements, drawings, layoutMeta, inputName],
  )

  const { draftStatus, markSaved: markDraftSaved } = useLayoutAutosave({
    layoutId,
    orgId,
    snapshotRef,
    dirtyKey,
    enabled: !!layoutId && !!orgId && bootstrapped && saveStatus !== 'saving' && permissions.canEdit,
  })

  const handleSave = useCallback(async () => {
    if (!userId || !canSave) return
    setSaveStatus('saving')
    const currentName = inputNameRef.current
    const currentMeta = { ...layoutMetaRef.current, proyecto: currentName }
    const payload = {
      elements: elementsRef.current,
      drawings: drawingsRef.current,
      meta: currentMeta,
      viewport: viewportRef.current,
    }
    try {
      await save(payload, currentName)
    } catch (err) {
      setSaveStatus('idle')
      if (isPermissionError(err)) { setPermissionDenied(true); return }
      throw err
    }
    // El "Guardar" manual es la única vía que pisa la fila real: el draft
    // de autosave ya no aplica.
    if (layoutId) void draftService.clear(layoutId).catch(() => {})
    markDraftSaved(payload)
    setRecovery(null)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, canSave, save, layoutId, markDraftSaved])

  // "Duplicar" — forks the layout's last SAVED content (re-reads from DB,
  // ignores any unsaved edits currently on the canvas). Original untouched.
  const handleDuplicate = useCallback(async () => {
    if (!layoutId) return
    setDuplicating(true)
    try {
      const original = await layoutService.getForDuplicate(layoutId)
      const newName = `${original.name} (copia)`
      const newId = await layoutService.duplicate(
        original.org_id,
        newName,
        {
          elements: original.elements,
          drawings: original.drawings,
          meta: { ...normalizeLayoutMeta(original.meta, original.name, eventClientRef.current), proyecto: newName },
          viewport: original.viewport,
        },
        layoutId
      )
      onLayoutForked?.(newId)
    } catch (err) {
      if (isPermissionError(err)) setPermissionDenied(true)
      else throw err
    } finally {
      setDuplicating(false)
    }
  }, [layoutId, onLayoutForked])

  // "Guardar como copia" — forks the CURRENT canvas state (including
  // unsaved changes), as a new independent row. Original untouched.
  const handleSaveAsCopy = useCallback(async () => {
    if (!userId) return
    setSavingAsCopy(true)
    try {
      const currentName = inputNameRef.current
      const newName = `${currentName} (copia)`
      const newId = await layoutService.duplicate(
        userId,
        newName,
        {
          elements: elementsRef.current,
          drawings: drawingsRef.current,
          meta: { ...layoutMetaRef.current, proyecto: newName },
          viewport: viewportRef.current,
        },
        layoutId
      )
      onLayoutForked?.(newId)
    } catch (err) {
      if (isPermissionError(err)) setPermissionDenied(true)
      else throw err
    } finally {
      setSavingAsCopy(false)
    }
  }, [userId, layoutId, onLayoutForked])

  // "Guardar como asset" abre un modal para el nombre en vez de usar
  // element.name directo. Un polígono recién dibujado se llama 'Polígono'
  // (literal) — se ofrece vacío para forzar un nombre real.
  const handleRequestSaveAsAsset = useCallback((element: LayoutElement) => {
    // Lados curvos, muros y curvas se guardan como conjunto de una pieza:
    // así no se pierden segments, closed ni thickness.
    if (element.segments || element.shape === 'wall' || element.shape === 'path') {
      const { width, height, children } = buildGroupAsset([element])
      setAssetTarget({ kind: 'group', count: 1, width, height, children })
      setAssetName(getAssetName(lang, element.name))
      return
    }
    setAssetTarget({ kind: 'shape', element })
    setAssetName(element.name === 'Polígono' ? '' : element.name)
  }, [lang])

  // Guardar la selección múltiple como un asset compuesto ('group').
  const handleRequestSaveGroupAsAsset = useCallback(() => {
    const sel = elements.filter(e => selectedIds.has(e.id))
    if (sel.length < 2) return
    const { width, height, children } = buildGroupAsset(sel)
    setAssetTarget({ kind: 'group', count: sel.length, width, height, children })
    setAssetName('')
  }, [elements, selectedIds])

  // Guardar el plano entero como plantilla de la org.
  const handleRequestSaveTemplate = useCallback(() => {
    if (!elements.length && !drawings.length) { setTemplateMsg(t.libTemplateEmptyPlan); return }
    const { payload, width, height } = buildTemplate(elements, drawings, layoutMeta.background, layoutMeta.layers)
    setAssetTarget({ kind: 'template', count: elements.length + drawings.length, width, height, payload })
    setAssetName(inputName)
    setAssetShare(permissions.canShare)
  }, [elements, drawings, layoutMeta.background, layoutMeta.layers, inputName, permissions.canShare, t])

  // Usar una plantilla: suma sus piezas al plano (se deshace con Cmd+Z) y,
  // si el plano no tiene plano del local, toma el de la plantilla.
  const handleUseTemplate = useCallback((asset: CustomAsset) => {
    const n = addTemplate(asset.payload)
    if (!n) { setTemplateMsg(t.libTemplateBroken); return }
    if (asset.payload?.background && !layoutMeta.background) updateMeta({ background: asset.payload.background })
    setTemplateMsg(t.libTemplateUsed.replace('{name}', asset.name))
    requestAnimationFrame(() => requestAnimationFrame(() => canvasRef.current?.fitToScreen()))
  }, [addTemplate, layoutMeta.background, updateMeta, t])

  const closeAssetModal = useCallback(() => {
    setAssetTarget(null)
    setAssetName('')
    setAssetError(null)
    setAssetShare(false)
  }, [])

  const handleConfirmSaveAsAsset = useCallback(async () => {
    if (!assetTarget) return
    const name = assetName.trim()
    if (!name) return
    setAssetError(null)
    const shared = permissions.canShare && assetShare
    try {
    if (assetTarget.kind === 'template') {
      await createAsset({
        name,
        category: 'template',
        kind: 'template',
        default_width: assetTarget.width,
        default_height: assetTarget.height,
        payload: assetTarget.payload,
        shared,
      })
    } else if (assetTarget.kind === 'shape') {
      const el = assetTarget.element
      await createAsset({
        name,
        category: el.category,
        kind: 'shape',
        default_width: round2(el.width),
        default_height: round2(el.height),
        default_color: el.color,
        shape: el.shape,
        // Solo los polígonos guardan su geometría; el resto de las formas
        // se reconstruyen de width/height. Redondeado a 2 decimales (1cm).
        points: el.shape === 'polygon' && el.points ? el.points.map(round2) : undefined,
        shared,
      })
    } else {
      await createAsset({
        name,
        category: 'group',
        kind: 'group',
        default_width: assetTarget.width,
        default_height: assetTarget.height,
        children: assetTarget.children,
        shared,
      })
    }
    } catch (err) {
      setAssetError(isPermissionError(err) ? t.noPermission : t.libSaveError)
      return
    }
    closeAssetModal()
  }, [assetTarget, assetName, assetShare, permissions.canShare, createAsset, closeAssetModal, t])

  const handleRecoverDraft = useCallback(() => {
    if (!recovery) return
    // Una sola entrada de undo: deja volver al contenido recién cargado.
    pushHistory()
    if (recovery.elements) setElements(recovery.elements)
    if (recovery.drawings) setDrawings(recovery.drawings)
    if (recovery.viewport) setViewport(recovery.viewport)
    if (recovery.meta) {
      const meta = normalizeLayoutMeta(recovery.meta, inputNameRef.current, eventClientRef.current)
      setLayoutMeta(meta)
      setInputName(meta.proyecto)
    }
    setRecovery(null)
  }, [recovery, pushHistory, setElements, setDrawings, setViewport, setLayoutMeta])

  // Exportar sin selección ni recuadros de edición (Transformer, sombra de
  // seleccionado): se limpia la selección, se espera a que el canvas se
  // redibuje y después se devuelve tal cual estaba.
  const exportClean = useCallback((kind: 'png' | 'pdf', opts?: { paper: PaperChoice; selectionOnly: boolean }) => {
    const prevIds = [...selectedIds]
    const prevDrawing = selectedDrawingId
    // Solo piezas visibles (las capas ocultas no se exportan).
    const visible = new Set(layerView.elements.map(e => e.id))
    const selectionIds = opts?.selectionOnly ? new Set(prevIds.filter(id => visible.has(id))) : undefined
    selectElement(null)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (kind === 'png') canvasRef.current?.exportPNG({ selectionIds })
      else canvasRef.current?.exportPDF({ paper: opts?.paper ?? layoutSettings.pdfPaper, selectionIds })
      if (prevDrawing) selectDrawing(prevDrawing)
      else if (prevIds.length) selectElements(prevIds)
    }))
  }, [selectedIds, selectedDrawingId, selectElement, selectDrawing, selectElements, layerView.elements, layoutSettings.pdfPaper])

  // "Ver en 3D" (bloque 9): otra pestaña con su propia ruta, para que el 3D
  // no toque el editor. Se le deja una copia del plano tal como se ve (con
  // lo no guardado y las capas).
  const handleOpen3d = useCallback(() => {
    const id = layoutId ?? 'nuevo'
    const ok = writeSnapshot3D(id, { name: inputName, elements, drawings, meta: layoutMeta })
    if (!ok && !layoutId) return
    window.open(`/3d/${encodeURIComponent(id)}`, '_blank', 'noopener')
  }, [layoutId, inputName, elements, drawings, layoutMeta])

  const openVersions = useCallback(() => {
    // Sin selección en el editor mientras el panel/visor está abierto: así
    // Supr/Backspace no borra nada del plano de fondo.
    selectElement(null)
    selectDrawing(null)
    setVersionsOpen(true)
  }, [selectElement, selectDrawing])

  // Restaurar: la base ya creó la versión nueva con el contenido de la
  // vieja; el canvas pasa a mostrarla y queda "guardado" (sin draft).
  const handleVersionRestored = useCallback((newVersion: number, content: LayoutVersion) => {
    pushHistory()
    setElements(content.elements ?? [])
    setDrawings(content.drawings ?? [])
    if (content.viewport) setViewport(content.viewport)
    const meta = normalizeLayoutMeta(content.meta, content.name, eventClientRef.current)
    setLayoutMeta(meta)
    setInputName(meta.proyecto)
    setVersionNumber(newVersion)
    if (layoutId) void draftService.clear(layoutId).catch(() => {})
    markDraftSaved({ elements: content.elements ?? [], drawings: content.drawings ?? [], meta, viewport: content.viewport })
    setRecovery(null)
  }, [pushHistory, setElements, setDrawings, setViewport, setLayoutMeta, setVersionNumber, layoutId, markDraftSaved])

  const handleDiscardDraft = useCallback(() => {
    if (layoutId) void draftService.clear(layoutId).catch(() => {})
    setRecovery(null)
  }, [layoutId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Con un panel o un diálogo abierto, las teclas son para ese diálogo.
      if (versionsOpen || calibration || exportOpen || materialsOpen) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      // Solo lectura: nada que cambie el plano (mano y medir sí).
      if (readOnly) {
        if (e.ctrlKey || e.metaKey) return
        if (e.key === 'h') setTool('hand')
        else if (e.key === 'm') setTool('measure')
        return
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); redo(); return }
        if (e.key === 'z') { e.preventDefault(); undo(); return }
        if (e.key === 'y') { e.preventDefault(); redo(); return }
        if (e.key === 'd') {
          e.preventDefault()
          if (selectedIds.size > 1) duplicateElements([...selectedIds])
          else if (selectedId) duplicateElement(selectedId)
          return
        }
        if (e.key === 's') { e.preventDefault(); handleSave(); return }
        return
      }
      if (e.key === 's') setTool('pointer')
      else if (e.key === 'w') setTool('wall')
      else if (e.key === 'c') setTool('dimension')
      else if (e.key === 'h') setTool('hand')
      else if (e.key === 'l') setTool('line')
      else if (e.key === 'a') setTool('arrow')
      else if (e.key === 't') setTool('text')
      else if (e.key === 'p') setTool('polygon')
      else if (e.key === 'r') setTool('arc')
      else if (e.key === 'b') setTool('curve')
      else if (e.key === 'm') setTool('measure')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, duplicateElement, duplicateElements, setTool, undo, redo, handleSave, versionsOpen, readOnly, calibration, exportOpen, materialsOpen])

  function toggleMobilePanel(panel: 'library' | 'properties') {
    setMobilePanel(prev => (prev === panel ? null : panel))
  }

  function handleAddElement(template: AssetTemplate) {
    addElement(template)
    setMobilePanel(null)
  }

  function handleAddGroup(children: GroupChild[]) {
    addGroup(children)
    setMobilePanel(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DrawingToolbar
        activeTool={activeTool}
        effectiveTool={effectiveTool}
        onSetTool={setTool}
        measureMode={measureMode}
        onSetMeasureMode={setMeasureMode}
        onClearDrawings={clearDrawings}
        onExport={() => (selectedIds.size ? setExportOpen('png') : exportClean('png'))}
        onExportPDF={() => setExportOpen('pdf')}
        onToggleLibrary={() => toggleMobilePanel('library')}
        onToggleProperties={() => toggleMobilePanel('properties')}
        libraryOpen={mobilePanel === 'library'}
        propertiesOpen={mobilePanel === 'properties'}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        readOnly={readOnly}
      />

      <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        <input
          value={inputName}
          readOnly={readOnly}
          onChange={e => {
            setInputName(e.target.value)
            updateMeta({ proyecto: e.target.value })
          }}
          className="bg-slate-800 text-sm text-slate-100 font-medium outline-none border border-slate-600 focus:border-indigo-500 rounded px-3 py-1 flex-1 min-w-0 sm:flex-none sm:w-64 placeholder:text-slate-500 transition-colors"
          placeholder={t.layoutNamePlaceholder}
        />
        <div className="hidden sm:block flex-1" />
        {saveStatus === 'saving' && <span className="flex-none text-[10px] text-indigo-400 animate-pulse whitespace-nowrap">{t.saving}</span>}
        {saveStatus === 'saved' && <span className="flex-none text-[10px] text-green-500 whitespace-nowrap">{t.saved}</span>}
        {saveStatus === 'idle' && draftStatus === 'pending' && (
          <span className="flex-none text-[10px] text-slate-500 whitespace-nowrap">{t.autosaving}</span>
        )}
        {saveStatus === 'idle' && draftStatus === 'saved' && (
          <span className="flex-none text-[10px] text-slate-500 whitespace-nowrap">{t.draftSaved}</span>
        )}
        {saveStatus === 'idle' && draftStatus === 'error' && (
          <>
            <span className="flex-none text-[10px] text-amber-500 whitespace-nowrap hidden sm:inline">{t.offlineChanges}</span>
            <span className="flex-none text-[10px] text-amber-500 whitespace-nowrap sm:hidden" title={t.offlineChanges}>{t.offlineChangesShort}</span>
          </>
        )}
        {/* Acciones secundarias — ocultas < sm para que "Guardar" nunca
            quede fuera de pantalla en móvil. Duplicar sigue disponible
            desde las tarjetas del dashboard. */}
        <button
          onClick={() => { selectElement(null); setMaterialsOpen(true) }}
          title={t.matButtonHint}
          className="flex-none h-7 px-2 sm:px-3 rounded text-xs font-semibold border transition-colors whitespace-nowrap text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          📋<span className="hidden md:inline"> {t.matButton}</span>
        </button>
        <button
          onClick={handleOpen3d}
          title={t.view3dOpenHint}
          className="flex-none h-7 px-2 sm:px-3 rounded text-xs font-semibold border transition-colors whitespace-nowrap text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          🧊<span className="hidden md:inline"> {t.view3dOpen}</span>
        </button>
        <div className="relative flex-none">
          <button
            onClick={() => { setLayersOpen(o => !o); setVenueOpen(false) }}
            className={`h-7 px-2 sm:px-3 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${layersOpen ? 'text-white bg-indigo-600 border-indigo-500' : (layerState.hidden.length || layerState.locked.length) ? 'text-amber-300 bg-slate-800 hover:bg-slate-700 border-amber-700/60' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600'}`}
            title={t.layersTitle}
          >
            ▤<span className="hidden md:inline"> {t.layersTitle}</span>
          </button>
          {layersOpen && (
            <LayersPanel
              state={layerState}
              counts={layerCounts}
              canLock={!readOnly}
              clientViewHidden={layoutSettings.clientViewHidden}
              onChange={setLayers}
              onClose={() => setLayersOpen(false)}
            />
          )}
        </div>
        {!readOnly && (
          <div className="relative flex-none">
            <button
              onClick={() => { setVenueOpen(o => !o); setLayersOpen(false) }}
              className={`h-7 px-2 sm:px-3 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${venueOpen ? 'text-white bg-indigo-600 border-indigo-500' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600'}`}
              title={t.venueTitle}
            >
              🗺<span className="hidden md:inline"> {t.venueTitle}</span>
            </button>
            {venueOpen && (
              <VenueBackgroundPanel
                orgId={orgId}
                background={layoutMeta.background}
                allowImage={layoutSettings.backgroundImage}
                allowPdf={layoutSettings.backgroundPdf}
                onChange={bg => updateMeta({ background: bg })}
                onStartCalibrate={() => { setVenueOpen(false); setTool('calibrate') }}
                imageUrl={backgroundImage?.src}
                onClose={() => setVenueOpen(false)}
              />
            )}
          </div>
        )}
        <button
          onClick={openVersions}
          title={t.versionsHint}
          className="flex-none h-7 px-2 sm:px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors whitespace-nowrap"
        >
          <span className="font-mono text-slate-100">v{versionNumber}</span>
          <span className="hidden sm:inline"> · {t.versionsBtn}</span>
        </button>
        {permissions.canCreate && <button
          onClick={handleSaveAsCopy}
          disabled={!userId || savingAsCopy}
          title={t.saveAsCopyTitle}
          className="hidden sm:block flex-none h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {savingAsCopy ? t.savingCopy : t.saveAsCopy}
        </button>}
        {permissions.canCreate && <button
          onClick={handleDuplicate}
          disabled={!layoutId || duplicating}
          title={layoutId ? t.duplicateTitleReady : t.duplicateTitleUnsaved}
          className="hidden sm:block flex-none h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {duplicating ? t.duplicating : t.duplicate}
        </button>}
        {canSave && <button
          onClick={handleSave}
          disabled={!userId || saveStatus === 'saving'}
          className="flex-none h-7 px-4 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {t.saveBtn}
        </button>}
      </div>

      {readOnly && (
        <div className="flex-none bg-slate-800/80 border-b border-slate-700 px-4 py-1.5 text-[11px] text-slate-300">
          {t.readOnlyBanner}
        </div>
      )}

      {permissionDenied && (
        <div className="flex-none bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex items-center gap-3 text-xs text-amber-100">
          <span className="flex-1">{t.noPermission}</span>
          <button onClick={() => setPermissionDenied(false)} className="flex-none text-amber-300 hover:text-amber-100">✕</button>
        </div>
      )}

      {/* Recuperar un borrador es una edición: solo para quien puede editar. */}
      {recovery && permissions.canEdit && (
        <RecoveryBanner
          updatedAt={recovery.updated_at}
          onRecover={handleRecoverDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!readOnly && <div className={
          mobilePanel === 'library'
            ? 'absolute inset-y-0 left-0 z-20 shadow-2xl flex flex-none lg:static lg:shadow-none'
            : 'hidden lg:flex lg:flex-none'
        }>
          <AssetLibraryPanel
            onAddElement={handleAddElement}
            onAddGroup={handleAddGroup}
            customAssets={customAssets}
            selectedElement={selectedElement}
            onSaveAsAsset={handleRequestSaveAsAsset}
            onDeleteAsset={deleteAsset}
            settings={layoutSettings}
            userId={userId}
            canShare={permissions.canShare}
            onSetShared={setShared}
            onSaveTemplate={handleRequestSaveTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </div>}

        <main className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          {templateMsg && (
            <div role="status" className="absolute left-1/2 -translate-x-1/2 top-3 z-30 max-w-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200 shadow-xl">
              {templateMsg}
            </div>
          )}
          <LayoutCanvas
            ref={canvasRef}
            elements={layerView.elements}
            inertIds={layerView.inertIds}
            drawingsLocked={layerView.drawingsLocked}
            selectedId={selectedId}
            selectedIds={selectedIds}
            viewport={viewport}
            onSelect={selectElement}
            onToggleSelect={toggleSelectElement}
            onSelectMultiple={selectElements}
            onUpdateElement={updateElement}
            onUpdateElements={updateElements}
            onUpdateViewport={updateViewport}
            onAddPolygon={addPolygon}
            onAddWall={w => addWall(w, layoutSettings.wallThickness)}
            onAddPath={addPath}
            dimensionDecimals={layoutSettings.dimensionDecimals}
            background={layoutMeta.background}
            backgroundImage={backgroundImage}
            onUpdateBackground={readOnly || !layoutMeta.background ? undefined : u => updateMeta({ background: { ...layoutMeta.background!, ...u } })}
            onCalibrate={(measuredM, anchor) => { setCalibration({ measuredM, anchor }); setCalibrationReal('') }}
            onDeleteElement={deleteElement}
            onDeleteElements={deleteElements}
            activeTool={effectiveTool}
            measureMode={measureMode}
            drawings={layerView.showDrawings ? drawings : NO_DRAWINGS}
            onAddDrawing={addDrawing}
            layoutMeta={displayMeta}
            versionNumber={versionNumber}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={selectDrawing}
            onDeleteDrawing={deleteDrawing}
            onUpdateDrawing={updateDrawing}
            onPushHistory={pushHistory}
          />
        </main>

        {!readOnly && <div className={
          mobilePanel === 'properties'
            ? 'absolute inset-y-0 right-0 z-20 shadow-2xl flex flex-none lg:static lg:shadow-none'
            : 'hidden lg:flex lg:flex-none'
        }>
          <PropertiesPanel
            element={selectedElement}
            onUpdate={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            selectedDrawing={selectedDrawing}
            onUpdateDrawing={updateDrawing}
            onDeleteDrawing={deleteDrawing}
            selectedIds={selectedIds}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onSaveGroupAsAsset={handleRequestSaveGroupAsAsset}
            onRotateGroup={rotateElements}
            onAlign={alignElements}
            onDistribute={distributeElements}
            onRepeatGrid={repeatInGrid}
            defaultSpacing={layoutSettings.tableSpacing}
            groupedCount={groupedCount}
            groupsCount={groupsCount}
            onUngroup={ungroupElements}
            onGroupTablesWithChairs={() => groupTablesWithChairs(layoutSettings)}
            onSetLayer={setLayerFor}
            selectionLayer={selectionLayer}
            allElements={elements}
            onFurnish={handleFurnish}
            heights3d={layoutSettings.heights3d}
            vocab={vocab}
          />
        </div>}

        {mobilePanel !== null && (
          <div
            className="absolute inset-0 z-10 lg:hidden bg-black/40"
            onClick={() => setMobilePanel(null)}
          />
        )}
      </div>

      <FooterLegend meta={displayMeta} versionNumber={versionNumber} onUpdate={updateMeta} clienteFromEvent={!!eventClient} readOnly={readOnly} paxAuto={paxAuto} />

      {materialsOpen && (
        <MaterialsPanel
          elements={elements}
          meta={displayMeta}
          versionNumber={versionNumber}
          layoutId={layoutId}
          vocab={vocab}
          readOnly={readOnly}
          onSetLine={(key, value) => {
            const next = { ...(layoutMeta.materials ?? {}) }
            if (value) next[key] = value; else delete next[key]
            updateMeta({ materials: next })
          }}
          onClose={() => setMaterialsOpen(false)}
        />
      )}

      {exportOpen && (
        <ExportDialog
          kind={exportOpen}
          selectionCount={layerView.elements.filter(e => selectedIds.has(e.id)).length}
          defaultPaper={layoutSettings.pdfPaper}
          onClose={() => setExportOpen(null)}
          onExport={opts => { setExportOpen(null); exportClean(exportOpen, opts) }}
        />
      )}

      {versionsOpen && (
        <VersionHistory
          pdfPaper={layoutSettings.pdfPaper}
          layoutId={layoutId}
          currentVersion={versionNumber}
          canRestore={permissions.canEdit}
          onClose={() => setVersionsOpen(false)}
          onRestored={handleVersionRestored}
        />
      )}

      {calibration && layoutMeta.background && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">{t.calibrateTitle}</h3>
            <p className="text-xs text-slate-400 mb-4">
              {t.calibrateMeasured.replace('{m}', formatMeters(calibration.measuredM, layoutSettings.dimensionDecimals))}
            </p>
            <label className="block text-[11px] text-slate-400 mb-4">
              {t.calibrateReal}
              <input
                ref={calibrationInputRef}
                type="number" min={0} step={0.01}
                onKeyDown={e => { if (e.key === 'Escape') { setCalibration(null); setTool('pointer') } }}
                value={calibrationReal}
                onChange={e => setCalibrationReal(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 focus:border-indigo-500 rounded px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => { setCalibration(null); setTool('pointer') }}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                disabled={!(Number(calibrationReal) > 0)}
                onClick={() => {
                  const bg = layoutMeta.background!
                  updateMeta({ background: { ...bg, ...calibrateBackground(bg, calibration.anchor, calibration.measuredM, Number(calibrationReal)) } })
                  setCalibration(null)
                  setTool('pointer')
                }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold disabled:opacity-40"
              >
                {t.calibrateApply}
              </button>
            </div>
          </div>
        </div>
      )}

      {assetTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              {assetTarget.kind === 'template' ? t.libSaveTemplate : assetTarget.kind === 'group' ? t.saveGroupAsAssetTitle : t.saveAsAssetTitle}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {t.assetNameHint}
            </p>
            <input
              autoFocus
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleConfirmSaveAsAsset()
                if (e.key === 'Escape') closeAssetModal()
              }}
              placeholder={t.assetNamePlaceholder}
              className="w-full bg-slate-800 border border-slate-600 focus:border-indigo-500 rounded px-3 py-2 text-sm text-slate-100 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-2 mb-3">
              {assetTarget.kind !== 'shape'
                ? `${assetTarget.count} ${t.assetPiecesUnit} · ${assetTarget.width}m × ${assetTarget.height}m`
                : `${round2(assetTarget.element.width)}m × ${round2(assetTarget.element.height)}m${
                    assetTarget.element.shape === 'polygon' ? t.assetDimsPolygonNote : ''
                  }`}
            </p>
            {permissions.canShare ? (
              <label className="flex items-start gap-2 text-[11px] text-slate-300 mb-4">
                <input type="checkbox" className="mt-0.5" checked={assetShare} onChange={e => setAssetShare(e.target.checked)} />
                <span>{t.libShareOnSave}</span>
              </label>
            ) : (
              <p className="text-[10px] text-slate-500 mb-4">{t.libPersonalNote}</p>
            )}
            {assetError && <p className="text-[11px] text-amber-400 mb-3">{assetError}</p>}
            <div className="flex gap-3">
              <button
                onClick={closeAssetModal}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => void handleConfirmSaveAsAsset()}
                disabled={!assetName.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold transition-colors disabled:opacity-40"
              >
                {t.saveBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}