import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import AssetLibraryPanel from '@/components/panels/AssetLibraryPanel'
import PropertiesPanel from '@/components/panels/PropertiesPanel'
import DrawingToolbar from '@/components/DrawingToolbar'
import FooterLegend from '@/components/FooterLegend'
import RecoveryBanner from '@/components/RecoveryBanner'
import LayoutCanvas, { type LayoutCanvasHandle } from '@/components/canvas/LayoutCanvas'
import { useCanvasState } from '@/hooks/useCanvasState'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useLayoutAutosave } from '@/hooks/useLayoutAutosave'
import { useCustomAssets } from '@/hooks/useCustomAssets'
import { supabase } from '@/lib/supabase'
import { layoutService, type LayoutData } from '@/lib/layoutService'
import { draftService, type LayoutDraft } from '@/lib/draftService'
import type { AssetTemplate, LayoutElement } from '@/types/layout'

const round2 = (n: number) => Math.round(n * 100) / 100

interface Props {
  layoutIdToLoad?: string | null
  eventId?: string | null
  orgId?: string
  onLayoutForked?: (newId: string) => void
}

export default function LayoutEditor({ layoutIdToLoad, eventId, orgId = '', onLayoutForked }: Props) {
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
  // "Guardar como asset": elemento en espera de nombre + nombre tipeado.
  const [assetDraft, setAssetDraft] = useState<LayoutElement | null>(null)
  const [assetName, setAssetName] = useState('')

  const {
    elements, selectedId, selectedIds, selectedElement,
    selectedDrawingId, selectedDrawing,
    viewport, selectElement, toggleSelectElement, selectElements, selectDrawing,
    updateElement, updateElements, updateViewport, addElement, addPolygon,
    deleteElement, deleteElements, duplicateElement, duplicateElements,
    bringToFront, sendToBack, activeTool, setTool, measureMode, setMeasureMode,
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
  const { save, load, layoutId } = persistence

  const { assets: customAssets, createAsset, deleteAsset } = useCustomAssets(userId)

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
      if (data.elements) setElements(data.elements)
      if (data.drawings) setDrawings(data.drawings)
      if (data.viewport) setViewport(data.viewport)
      if (data.meta) {
        setLayoutMeta(data.meta)
        if (data.meta.cliente) setInputName(data.meta.cliente)
      }
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
  // en la URL, sin layoutIdToLoad): hereda el nombre del evento como título
  // inicial en vez de quedarse en "Sin título". Solo aplica a la creación —
  // si se está cargando un layout existente, el nombre guardado (arriba)
  // manda siempre. Sigue editable después, no se bloquea.
  useEffect(() => {
    if (!eventId || layoutIdToLoad) return
    layoutService.getEventName(eventId)
      .then(name => {
        if (!name) return
        setInputName(name)
        updateMeta({ cliente: name })
      })
      .catch(err => console.error('[LayoutEditor] getEventName error:', err))
  }, [eventId, layoutIdToLoad])

  useEffect(() => {
    if (layoutMeta.cliente !== undefined && layoutMeta.cliente !== inputName) {
      setInputName(layoutMeta.cliente)
    }
  }, [layoutMeta.cliente])

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
  // meta.cliente (igual que en handleSave). El viewport va en el payload
  // pero NO en dirtyKey — pan/zoom no debe disparar autosave.
  const snapshotRef = useRef<LayoutData>({ elements, drawings, meta: layoutMeta, viewport })
  snapshotRef.current = {
    elements,
    drawings,
    meta: { ...layoutMeta, cliente: inputName },
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
    enabled: !!layoutId && !!orgId && bootstrapped && saveStatus !== 'saving',
  })

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaveStatus('saving')
    const currentName = inputNameRef.current
    const currentMeta = { ...layoutMetaRef.current, cliente: currentName }
    const payload = {
      elements: elementsRef.current,
      drawings: drawingsRef.current,
      meta: currentMeta,
      viewport: viewportRef.current,
    }
    await save(payload, currentName)
    // El "Guardar" manual es la única vía que pisa la fila real: el draft
    // de autosave ya no aplica.
    if (layoutId) void draftService.clear(layoutId).catch(() => {})
    markDraftSaved(payload)
    setRecovery(null)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, save, layoutId, markDraftSaved])

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
          meta: { ...original.meta, cliente: newName },
          viewport: original.viewport,
        },
        layoutId
      )
      onLayoutForked?.(newId)
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
          meta: { ...layoutMetaRef.current, cliente: newName },
          viewport: viewportRef.current,
        },
        layoutId
      )
      onLayoutForked?.(newId)
    } finally {
      setSavingAsCopy(false)
    }
  }, [userId, layoutId, onLayoutForked])

  // "Guardar como asset" ahora abre un modal para el nombre en vez de
  // usar element.name directo. Un polígono recién dibujado se llama
  // 'Polígono' (literal) — se ofrece vacío para forzar un nombre real.
  const handleRequestSaveAsAsset = useCallback((element: LayoutElement) => {
    setAssetDraft(element)
    setAssetName(element.name === 'Polígono' ? '' : element.name)
  }, [])

  const handleConfirmSaveAsAsset = useCallback(async () => {
    if (!assetDraft) return
    const name = assetName.trim()
    if (!name) return
    const isPolygon = assetDraft.shape === 'polygon'
    await createAsset({
      name,
      category: assetDraft.category,
      default_width: round2(assetDraft.width),
      default_height: round2(assetDraft.height),
      default_color: assetDraft.color,
      shape: assetDraft.shape,
      // Solo los polígonos guardan su geometría; el resto de las formas
      // se reconstruyen de width/height. Redondeado a 2 decimales (1cm).
      points: isPolygon && assetDraft.points ? assetDraft.points.map(round2) : undefined,
    })
    setAssetDraft(null)
    setAssetName('')
  }, [assetDraft, assetName, createAsset])

  const handleRecoverDraft = useCallback(() => {
    if (!recovery) return
    // Una sola entrada de undo: deja volver al contenido recién cargado.
    pushHistory()
    if (recovery.elements) setElements(recovery.elements)
    if (recovery.drawings) setDrawings(recovery.drawings)
    if (recovery.viewport) setViewport(recovery.viewport)
    if (recovery.meta) {
      setLayoutMeta(recovery.meta)
      if (recovery.meta.cliente) setInputName(recovery.meta.cliente)
    }
    setRecovery(null)
  }, [recovery, pushHistory, setElements, setDrawings, setViewport, setLayoutMeta])

  const handleDiscardDraft = useCallback(() => {
    if (layoutId) void draftService.clear(layoutId).catch(() => {})
    setRecovery(null)
  }, [layoutId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
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
      else if (e.key === 'h') setTool('hand')
      else if (e.key === 'l') setTool('line')
      else if (e.key === 'a') setTool('arrow')
      else if (e.key === 't') setTool('text')
      else if (e.key === 'p') setTool('polygon')
      else if (e.key === 'm') setTool('measure')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, duplicateElement, duplicateElements, setTool, undo, redo, handleSave])

  function toggleMobilePanel(panel: 'library' | 'properties') {
    setMobilePanel(prev => (prev === panel ? null : panel))
  }

  function handleAddElement(template: AssetTemplate) {
    addElement(template)
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
        onExport={() => canvasRef.current?.exportPNG()}
        onExportPDF={() => canvasRef.current?.exportPDF()}
        onToggleLibrary={() => toggleMobilePanel('library')}
        onToggleProperties={() => toggleMobilePanel('properties')}
        libraryOpen={mobilePanel === 'library'}
        propertiesOpen={mobilePanel === 'properties'}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex-none h-9 bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-3">
        <input
          value={inputName}
          onChange={e => {
            setInputName(e.target.value)
            updateMeta({ cliente: e.target.value })
          }}
          className="bg-slate-800 text-sm text-slate-100 font-medium outline-none border border-slate-600 focus:border-indigo-500 rounded px-3 py-1 w-64 placeholder:text-slate-500 transition-colors"
          placeholder="Nombre del cliente / evento"
        />
        <div className="flex-1" />
        {saveStatus === 'saving' && <span className="text-[10px] text-indigo-400 animate-pulse">Guardando...</span>}
        {saveStatus === 'saved' && <span className="text-[10px] text-green-500">✓ Guardado</span>}
        {saveStatus === 'idle' && draftStatus === 'pending' && (
          <span className="text-[10px] text-slate-500">Autoguardando…</span>
        )}
        {saveStatus === 'idle' && draftStatus === 'saved' && (
          <span className="text-[10px] text-slate-500">Borrador guardado</span>
        )}
        {saveStatus === 'idle' && draftStatus === 'error' && (
          <span className="text-[10px] text-amber-500">Sin conexión — cambios en memoria</span>
        )}
        <button
          onClick={handleSaveAsCopy}
          disabled={!userId || savingAsCopy}
          title="Crea una copia independiente a partir del estado actual del canvas — el original no se modifica"
          className="h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {savingAsCopy ? 'Guardando copia...' : 'Guardar como copia'}
        </button>
        <button
          onClick={handleDuplicate}
          disabled={!layoutId || duplicating}
          title={layoutId ? 'Duplica el layout (última versión guardada)' : 'Guarda el layout antes de duplicarlo'}
          className="h-7 px-3 rounded text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 transition-colors"
        >
          {duplicating ? 'Duplicando...' : 'Duplicar'}
        </button>
        <button
          onClick={handleSave}
          disabled={!userId || saveStatus === 'saving'}
          className="h-7 px-4 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          Guardar
        </button>
      </div>

      {recovery && (
        <RecoveryBanner
          updatedAt={recovery.updated_at}
          onRecover={handleRecoverDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className={
          mobilePanel === 'library'
            ? 'absolute inset-y-0 left-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none'
            : 'hidden md:flex md:flex-none'
        }>
          <AssetLibraryPanel
            onAddElement={handleAddElement}
            customAssets={customAssets}
            selectedElement={selectedElement}
            onSaveAsAsset={handleRequestSaveAsAsset}
            onDeleteAsset={deleteAsset}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <LayoutCanvas
            ref={canvasRef}
            elements={elements}
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
            onDeleteElement={deleteElement}
            onDeleteElements={deleteElements}
            activeTool={effectiveTool}
            measureMode={measureMode}
            drawings={drawings}
            onAddDrawing={addDrawing}
            layoutMeta={layoutMeta}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={selectDrawing}
            onDeleteDrawing={deleteDrawing}
            onUpdateDrawing={updateDrawing}
            onPushHistory={pushHistory}
          />
        </main>

        <div className={
          mobilePanel === 'properties'
            ? 'absolute inset-y-0 right-0 z-20 shadow-2xl flex flex-none md:static md:shadow-none'
            : 'hidden md:flex md:flex-none'
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
          />
        </div>

        {mobilePanel !== null && (
          <div
            className="absolute inset-0 z-10 md:hidden bg-black/40"
            onClick={() => setMobilePanel(null)}
          />
        )}
      </div>

      <FooterLegend meta={layoutMeta} onUpdate={updateMeta} />

      {assetDraft && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Guardar como asset</h3>
            <p className="text-xs text-slate-400 mb-4">
              Nombre con el que aparecerá en “Mis Assets”.
            </p>
            <input
              autoFocus
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleConfirmSaveAsAsset()
                if (e.key === 'Escape') { setAssetDraft(null); setAssetName('') }
              }}
              placeholder="Ej: Escenario principal"
              className="w-full bg-slate-800 border border-slate-600 focus:border-indigo-500 rounded px-3 py-2 text-sm text-slate-100 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-2 mb-5">
              {round2(assetDraft.width)}m × {round2(assetDraft.height)}m
              {assetDraft.shape === 'polygon' && ' · incluye la forma del polígono'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setAssetDraft(null); setAssetName('') }}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleConfirmSaveAsAsset()}
                disabled={!assetName.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold transition-colors disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}