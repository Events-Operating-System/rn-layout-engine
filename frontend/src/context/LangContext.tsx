import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AssetCategory } from '@/types/layout'

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
    toolHintMeasure: 'Click two points for distance · click a shape for its area',
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
    headerSub: 'Playground',
    hintZoom: 'Scroll → Zoom', hintPan: 'Drag canvas → Pan',
    hintSelect: 'Click element → Select', hintMove: 'Drag element → Move',
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
    toolHintMeasure: 'Click en dos puntos para medir distancia · click en una figura para medir su área',
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
    headerSub: 'Canvas',
    hintZoom: 'Scroll → Zoom', hintPan: 'Arrastrar canvas → Pan',
    hintSelect: 'Click elemento → Seleccionar', hintMove: 'Arrastrar → Mover',
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
  lang: 'en',
  setLang: () => {},
  t: strings.en,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const stored = (() => {
    try { return localStorage.getItem('rn-lang') as Lang | null } catch { return null }
  })()
  const [lang, setLangState] = useState<Lang>(stored === 'es' ? 'es' : 'en')

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('rn-lang', l) } catch {}
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: strings[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
