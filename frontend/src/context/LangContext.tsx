import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AssetCategory } from '@/types/layout'
import { supabase } from '@/lib/supabase'

export type Lang = 'en' | 'es'

const strings = {
  en: {
    exportPlan: 'Export Plan',
    clearAnnotations: 'Clear annotations',
    toolPointer: 'Selection',
    toolHand: 'Hand (Pan)',
    toolLine: 'Line',
    toolArrow: 'Arrow',
    toolText: 'Text annotation',
    toolPolygon: 'Polygon',
    toolMeasure: 'Measure',
    toolHint: 'Click & drag to draw · Press S to select',
    toolHintPolygon: 'Click to place vertices · click first vertex or double-click to close',
    toolHintMeasureDistance: 'Click two points (elements are ignored) to measure the exact distance',
    toolHintMeasureArea: 'Click a shape to see its area · clicking empty space does nothing',
    measureModeDistance: 'Distance',
    measureModeArea: 'Area',
    libraryTitle: 'Asset Library',
    libraryHint: 'Click to place on canvas',
    propertiesTitle: 'Properties',
    selectHint: 'Select an element or drawing to view and edit its properties.',
    sIdentity: 'Identity',
    sPosition: 'Position (m)',
    sDimensions: 'Dimensions (m)',
    sRotation: 'Rotation',
    sColor: 'Color',
    sOpacity: 'Opacity',
    sNotes: 'Notes',
    sState: 'State',
    sDrawing: 'Drawing',
    sStrokeWidth: 'Stroke Width',
    sFontSize: 'Font Size',
    sOrder: 'Order',
    sFlip: 'Flip',
    sMeasurement: 'Measurement',
    fName: 'Name',
    fCategory: 'Category',
    fX: 'X', fY: 'Y',
    fWidth: 'Width', fHeight: 'Height',
    fDegrees: 'Degrees',
    fLength: 'Length (m)', fAngleDeg: 'Angle (°)',
    fType: 'Type', fText: 'Text', fPx: 'px',
    lockElement: 'Lock element',
    deleteElement: 'Delete Element',
    deleteDrawing: 'Delete Drawing',
    duplicate: 'Duplicate',
    bringToFront: 'Bring to Front',
    sendToBack: 'Send to Back',
    flipHorizontal: 'Flip Horizontal',
    flipVertical: 'Flip Vertical',
    elementsSelected: 'elements selected',
    notesPlaceholder: 'Operational notes...',
    area: 'Area',
    catStage: 'Stage', catStructure: 'Structure', catSeating: 'Seating',
    catBarrier: 'Barrier', catUtility: 'Utility', catCirculation: 'Circulation',
    catPrimitive: 'Shapes',
    hintZoom: 'Scroll → Zoom', hintPan: 'Drag canvas → Pan',
    hintSelect: 'Click element → Select', hintMove: 'Drag element → Move',
    // ── Editor: save bar ──────────────────────────────────────────────────
    layoutNamePlaceholder: 'Client / event name',
    saving: 'Saving…',
    saved: '✓ Saved',
    autosaving: 'Autosaving…',
    draftSaved: 'Draft saved',
    offlineChanges: 'Offline — changes in memory',
    offlineChangesShort: '⚠ unsaved',
    saveBtn: 'Save',
    saveAsCopy: 'Save as copy',
    savingCopy: 'Saving copy…',
    duplicating: 'Duplicating…',
    saveAsCopyTitle: 'Creates an independent copy from the current canvas state — the original is untouched',
    duplicateTitleReady: 'Duplicates the layout (last saved version)',
    duplicateTitleUnsaved: 'Save the layout before duplicating it',
    // ── Editor: "Save as asset" modal ────────────────────────────────────
    saveAsAssetTitle: 'Save as asset',
    saveGroupAsAssetTitle: 'Save group as asset',
    assetNameHint: 'Name it will appear under in “My Assets”.',
    assetNamePlaceholder: 'e.g. Main stage',
    assetDimsPolygonNote: ' · includes the polygon shape',
    assetPiecesUnit: 'pieces',
    cancel: 'Cancel',
    // ── Editor: recovery banner ─────────────────────────────────────────
    recoveryText: 'There are unsaved changes from {when} that were never saved to this layout.',
    recover: 'Recover',
    discard: 'Discard',
    // ── Editor: multi-selection (properties panel) ─────────────────────
    sAsset: 'Asset',
    rotateGroupDeg: 'Rotate group (°)',
    apply: 'Apply',
  },
  es: {
    exportPlan: 'Exportar Plano',
    clearAnnotations: 'Borrar anotaciones',
    toolPointer: 'Selección',
    toolHand: 'Mano (Pan)',
    toolLine: 'Línea',
    toolArrow: 'Flecha',
    toolText: 'Anotación de texto',
    toolPolygon: 'Polígono',
    toolMeasure: 'Medir',
    toolHint: 'Click y arrastrar para dibujar · S para seleccionar',
    toolHintPolygon: 'Click para colocar vértices · click en el primer vértice o doble-click para cerrar',
    toolHintMeasureDistance: 'Click en dos puntos (ignora elementos) para medir la distancia exacta',
    toolHintMeasureArea: 'Click en una figura para ver su área · click en vacío no hace nada',
    measureModeDistance: 'Distancia',
    measureModeArea: 'Área',
    libraryTitle: 'Librería',
    libraryHint: 'Click para colocar en canvas',
    propertiesTitle: 'Propiedades',
    selectHint: 'Selecciona un elemento para ver y editar sus propiedades.',
    sIdentity: 'Identidad',
    sPosition: 'Posición (m)',
    sDimensions: 'Dimensiones (m)',
    sRotation: 'Rotación',
    sColor: 'Color',
    sOpacity: 'Opacidad',
    sNotes: 'Notas',
    sState: 'Estado',
    sDrawing: 'Dibujo',
    sStrokeWidth: 'Grosor del trazo',
    sFontSize: 'Tamaño de Texto',
    sOrder: 'Orden',
    sFlip: 'Voltear',
    sMeasurement: 'Medición',
    fName: 'Nombre',
    fCategory: 'Categoría',
    fX: 'X', fY: 'Y',
    fWidth: 'Ancho', fHeight: 'Alto',
    fDegrees: 'Grados',
    fLength: 'Longitud (m)', fAngleDeg: 'Ángulo (°)',
    fType: 'Tipo', fText: 'Texto', fPx: 'px',
    lockElement: 'Bloquear elemento',
    deleteElement: 'Eliminar Elemento',
    deleteDrawing: 'Eliminar Dibujo',
    duplicate: 'Duplicar',
    bringToFront: 'Traer al Frente',
    sendToBack: 'Enviar al Fondo',
    flipHorizontal: 'Voltear Horizontal',
    flipVertical: 'Voltear Vertical',
    elementsSelected: 'elementos seleccionados',
    notesPlaceholder: 'Notas operacionales...',
    area: 'Área',
    catStage: 'Escenario', catStructure: 'Estructura', catSeating: 'Asientos',
    catBarrier: 'Barrera', catUtility: 'Utilidad', catCirculation: 'Circulación',
    catPrimitive: 'Formas',
    hintZoom: 'Scroll → Zoom', hintPan: 'Arrastrar canvas → Pan',
    hintSelect: 'Click elemento → Seleccionar', hintMove: 'Arrastrar → Mover',
    // ── Editor: barra de guardado ───────────────────────────────────────
    layoutNamePlaceholder: 'Nombre del cliente / evento',
    saving: 'Guardando…',
    saved: '✓ Guardado',
    autosaving: 'Autoguardando…',
    draftSaved: 'Borrador guardado',
    offlineChanges: 'Sin conexión — cambios en memoria',
    offlineChangesShort: '⚠ sin guardar',
    saveBtn: 'Guardar',
    saveAsCopy: 'Guardar como copia',
    savingCopy: 'Guardando copia…',
    duplicating: 'Duplicando…',
    saveAsCopyTitle: 'Crea una copia independiente a partir del estado actual del canvas — el original no se modifica',
    duplicateTitleReady: 'Duplica el layout (última versión guardada)',
    duplicateTitleUnsaved: 'Guarda el layout antes de duplicarlo',
    // ── Editor: modal "Guardar como asset" ──────────────────────────────
    saveAsAssetTitle: 'Guardar como asset',
    saveGroupAsAssetTitle: 'Guardar grupo como asset',
    assetNameHint: 'Nombre con el que aparecerá en “Mis Assets”.',
    assetNamePlaceholder: 'Ej: Escenario principal',
    assetDimsPolygonNote: ' · incluye la forma del polígono',
    assetPiecesUnit: 'piezas',
    cancel: 'Cancelar',
    // ── Editor: banner de recuperación ─────────────────────────────────
    recoveryText: 'Hay cambios sin guardar de {when} que no se llegaron a guardar en este layout.',
    recover: 'Recuperar',
    discard: 'Descartar',
    // ── Editor: multi-selección (panel de propiedades) ─────────────────
    sAsset: 'Asset',
    rotateGroupDeg: 'Rotar grupo (°)',
    apply: 'Aplicar',
  },
} as const

export type Strings = { [K in keyof (typeof strings)['en']]: string }

const CAT_LABEL_KEYS: Record<AssetCategory, keyof Strings> = {
  stage: 'catStage',
  structure: 'catStructure',
  seating: 'catSeating',
  barrier: 'catBarrier',
  utility: 'catUtility',
  circulation: 'catCirculation',
  primitive: 'catPrimitive',
}

export function getCategoryLabel(t: Strings, category: AssetCategory): string {
  return t[CAT_LABEL_KEYS[category]] as string
}

const ASSET_NAME_ES: Record<string, string> = {
  'Main Stage': 'Escenario Principal',
  'Secondary Stage': 'Escenario Secundario',
  'Dance Floor': 'Pista de Baile',
  'LED Wall': 'Pantalla LED',
  'Screen': 'Pantalla',
  'DJ Booth PRO': 'Cabina DJ PRO',
  'DJ Booth': 'Cabina DJ',
  'Podium': 'Podio',
  'Tent 10×10': 'Carpa 10×10',
  'Tent 20×20': 'Carpa 20×20',
  'Tent 20×40': 'Carpa 20×40',
  'Marquee': 'Carpa Marquesina',
  'Bar': 'Bar',
  'Buffet': 'Buffet',
  'Lounge': 'Zona Lounge',
  'Backstage': 'Backstage',
  'Round Table 8': 'Mesa Redonda 8',
  'Round Table 10': 'Mesa Redonda 10',
  'Head Table': 'Mesa Principal',
  'Rect Table': 'Mesa Rectangular',
  'Chair Row Block': 'Bloque de Sillas',
  'Bleacher Block': 'Gradería',
  'Crowd Barrier': 'Barrera',
  'Fence': 'Valla',
  'Fence Panel': 'Panel Valla',
  'Kitchen': 'Cocina',
  'Restrooms': 'Baños',
  'Generator': 'Generador',
  'First Aid': 'Primeros Auxilios',
  'Entrance': 'Entrada',
  'Entrance Gate': 'Puerta de Entrada',
  'Exit Gate': 'Puerta de Salida',
  'Emergency Exit': 'Salida de Emergencia',
  'Rectangle': 'Rectángulo',
  'Circle': 'Círculo',
  'Oval': 'Óvalo',
  'Rounded Box': 'Caja Redondeada',
  'Tree': 'Árbol',
  'Square': 'Cuadrado',
}

export function getAssetName(lang: Lang, name: string): string {
  if (lang === 'es') return ASSET_NAME_ES[name] ?? name
  return name
}

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: Strings
}

const LangContext = createContext<LangContextValue>({
  lang: 'es',
  setLang: () => {},
  t: strings.es,
})

// Acepta 'es' / 'es-PE' / 'en-US' / etc. Cualquier cosa no reconocida -> null.
function normalizeLocale(raw: string | null | undefined): Lang | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.startsWith('es')) return 'es'
  if (s.startsWith('en')) return 'en'
  return null
}

function readBootstrap(): Lang {
  let ls: string | null = null
  try { ls = localStorage.getItem('rn-lang') } catch { /* private mode */ }
  return (
    normalizeLocale(ls) ??
    normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : null) ??
    'es'
  )
}

interface LangProviderProps {
  children: ReactNode
  // Cascada de idioma, misma que el resto de los módulos:
  //   organization_members.locale  ->  organizations.locale
  //   ->  navigator.language  ->  'es'
  // localStorage['rn-lang'] es solo un bootstrap para el primer paint
  // (login / loading), antes de que la org resuelva — no un override
  // permanente. El toggle del usuario escribe a organization_members.locale
  // para que el idioma viaje entre dispositivos.
  userId?: string | null
  orgId?: string | null
  memberLocale?: string | null
  orgLocale?: string | null
}

export function LangProvider({ children, userId, orgId, memberLocale, orgLocale }: LangProviderProps) {
  // Valor transitorio hasta que la cascada (DB) esté disponible.
  const [bootstrap] = useState<Lang>(readBootstrap)
  // Toggle hecho en esta sesión — gana mientras se persiste a la DB y hasta
  // el próximo cold load (donde ya vendrá reflejado en memberLocale).
  const [sessionChoice, setSessionChoice] = useState<Lang | null>(null)

  const cascadeLocale = normalizeLocale(memberLocale) ?? normalizeLocale(orgLocale)
  const lang: Lang = sessionChoice ?? cascadeLocale ?? bootstrap

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setSessionChoice(l)
    try { localStorage.setItem('rn-lang', l) } catch { /* private mode */ }
    if (userId && orgId) {
      void supabase
        .from('organization_members')
        .update({ locale: l })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .then(({ error }) => {
          if (error) console.error('[LangProvider] no se pudo guardar el idioma:', error)
        })
    }
  }, [userId, orgId])

  return (
    <LangContext.Provider value={{ lang, setLang, t: strings[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
