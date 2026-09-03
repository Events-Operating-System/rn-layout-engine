import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AssetCategory } from '@/types/layout'
import { supabase } from '@/lib/supabase'

export type Lang = 'en' | 'es' | 'pt'

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
    // ── Dashboard ─────────────────────────────────────────────────────
    dashTitle: 'Layouts',
    dashSubtitle: 'My Layouts',
    creatingLayoutForEvent: 'Creating layout for event',
    signOut: 'Sign out',
    layoutsNoneYet: 'No layouts saved yet',
    layoutsCountOne: '{n} layout',
    layoutsCountMany: '{n} layouts',
    layoutsCountFiltered: '{n} of {total}',
    newLayout: 'New layout',
    loadingLayouts: 'Loading layouts…',
    noLayoutsTitle: 'You have no saved layouts yet.',
    createFirstLayout: 'Create your first layout',
    searchLayoutsPlaceholder: 'Search by name',
    searchNoMatch: 'No layout matches “{q}”.',
    clearSearch: 'Clear search',
    duplicateLayoutTitle: 'Duplicate layout',
    deleteLayoutTitle: 'Delete layout',
    deleteLayoutConfirmTitle: 'Delete layout?',
    deleteLayoutConfirmText: 'This will archive the layout. It cannot be undone.',
    deleteBtn: 'Delete',
    // ── Auth / loading / errors ───────────────────────────────────────
    loading: 'Loading…',
    redirecting: 'Redirecting…',
    sessionCheckFailedMsg: "Couldn't verify your session.",
    retry: 'Retry',
    appName: 'EventOS Layout',
    poweredBy: 'Powered by Reality Near',
    loginWithGoogle: 'Continue with Google',
    connecting: 'Connecting…',
    // ── Org status guard ─────────────────────────────────────────────
    verifyingAccess: 'Verifying access…',
    orgStatusError: "Couldn't verify your organization's status.",
    orgPendingTitle: 'Pending approval',
    orgPendingBody: 'Organization {org} is awaiting platform approval.',
    orgRejectedTitle: 'Organization rejected',
    orgRejectedBody: 'Organization {org} was rejected by the platform.',
    orgSuspendedTitle: 'Organization suspended',
    orgSuspendedBody: 'Your organization {org} is suspended. Contact the administrator.',
    // ── Create organization ──────────────────────────────────────────
    createOrgTitle: 'Create your organization',
    createOrgSubtitle: "You don't belong to any organization in EventOS yet.",
    orgNameLabel: "Your organization's name",
    creating: 'Creating…',
    createOrgBtn: 'Create organization',
    orgNameRequired: 'Enter a name for your organization.',
    createOrgFailed: "Couldn't create the organization. Try again.",
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
    // ── Dashboard ─────────────────────────────────────────────────────
    dashTitle: 'Layouts',
    dashSubtitle: 'Mis Layouts',
    creatingLayoutForEvent: 'Creando layout para evento',
    signOut: 'Cerrar sesión',
    layoutsNoneYet: 'Ningún layout guardado aún',
    layoutsCountOne: '{n} layout',
    layoutsCountMany: '{n} layouts',
    layoutsCountFiltered: '{n} de {total}',
    newLayout: 'Nuevo layout',
    loadingLayouts: 'Cargando layouts…',
    noLayoutsTitle: 'Aún no tienes layouts guardados.',
    createFirstLayout: 'Crear tu primer layout',
    searchLayoutsPlaceholder: 'Buscar por nombre',
    searchNoMatch: 'Ningún layout coincide con «{q}».',
    clearSearch: 'Limpiar búsqueda',
    duplicateLayoutTitle: 'Duplicar layout',
    deleteLayoutTitle: 'Eliminar layout',
    deleteLayoutConfirmTitle: '¿Eliminar layout?',
    deleteLayoutConfirmText: 'Esta acción archivará el layout. No se puede deshacer.',
    deleteBtn: 'Eliminar',
    // ── Auth / carga / errores ────────────────────────────────────────
    loading: 'Cargando…',
    redirecting: 'Redirigiendo…',
    sessionCheckFailedMsg: 'No se pudo verificar tu sesión.',
    retry: 'Reintentar',
    appName: 'EventOS Layout',
    poweredBy: 'Con tecnología de Reality Near',
    loginWithGoogle: 'Continuar con Google',
    connecting: 'Conectando…',
    // ── Guard de estado de organización ──────────────────────────────
    verifyingAccess: 'Verificando acceso…',
    orgStatusError: 'No se pudo verificar el estado de tu organización.',
    orgPendingTitle: 'Pendiente de aprobación',
    orgPendingBody: 'La organización {org} está esperando aprobación de la plataforma.',
    orgRejectedTitle: 'Organización rechazada',
    orgRejectedBody: 'La organización {org} fue rechazada por la plataforma.',
    orgSuspendedTitle: 'Organización suspendida',
    orgSuspendedBody: 'Tu organización {org} está suspendida. Contactá al administrador.',
    // ── Crear organización ──────────────────────────────────────────
    createOrgTitle: 'Crear tu organización',
    createOrgSubtitle: 'Todavía no formás parte de ninguna organización en EventOS.',
    orgNameLabel: 'Nombre de tu organización',
    creating: 'Creando…',
    createOrgBtn: 'Crear organización',
    orgNameRequired: 'Ingresá un nombre para tu organización.',
    createOrgFailed: 'No se pudo crear la organización. Intentá de nuevo.',
  },
  pt: {
    exportPlan: 'Exportar Planta',
    clearAnnotations: 'Limpar anotações',
    toolPointer: 'Seleção',
    toolHand: 'Mão (Pan)',
    toolLine: 'Linha',
    toolArrow: 'Seta',
    toolText: 'Anotação de texto',
    toolPolygon: 'Polígono',
    toolMeasure: 'Medir',
    toolHint: 'Clique e arraste para desenhar · S para selecionar',
    toolHintPolygon: 'Clique para posicionar vértices · clique no primeiro vértice ou dê dois cliques para fechar',
    toolHintMeasureDistance: 'Clique em dois pontos (elementos são ignorados) para medir a distância exata',
    toolHintMeasureArea: 'Clique em uma forma para ver sua área · clicar no vazio não faz nada',
    measureModeDistance: 'Distância',
    measureModeArea: 'Área',
    libraryTitle: 'Biblioteca',
    libraryHint: 'Clique para posicionar no canvas',
    propertiesTitle: 'Propriedades',
    selectHint: 'Selecione um elemento para ver e editar suas propriedades.',
    sIdentity: 'Identidade',
    sPosition: 'Posição (m)',
    sDimensions: 'Dimensões (m)',
    sRotation: 'Rotação',
    sColor: 'Cor',
    sOpacity: 'Opacidade',
    sNotes: 'Notas',
    sState: 'Estado',
    sDrawing: 'Desenho',
    sStrokeWidth: 'Espessura do traço',
    sFontSize: 'Tamanho da fonte',
    sOrder: 'Ordem',
    sFlip: 'Espelhar',
    sMeasurement: 'Medição',
    fName: 'Nome',
    fCategory: 'Categoria',
    fX: 'X', fY: 'Y',
    fWidth: 'Largura', fHeight: 'Altura',
    fDegrees: 'Graus',
    fLength: 'Comprimento (m)', fAngleDeg: 'Ângulo (°)',
    fType: 'Tipo', fText: 'Texto', fPx: 'px',
    lockElement: 'Bloquear elemento',
    deleteElement: 'Excluir elemento',
    deleteDrawing: 'Excluir desenho',
    duplicate: 'Duplicar',
    bringToFront: 'Trazer para frente',
    sendToBack: 'Enviar para trás',
    flipHorizontal: 'Espelhar horizontal',
    flipVertical: 'Espelhar vertical',
    elementsSelected: 'elementos selecionados',
    notesPlaceholder: 'Notas operacionais...',
    area: 'Área',
    catStage: 'Palco', catStructure: 'Estrutura', catSeating: 'Assentos',
    catBarrier: 'Barreira', catUtility: 'Utilidades', catCirculation: 'Circulação',
    catPrimitive: 'Formas',
    hintZoom: 'Scroll → Zoom', hintPan: 'Arrastar canvas → Pan',
    hintSelect: 'Clicar elemento → Selecionar', hintMove: 'Arrastar → Mover',
    // ── Editor: barra de salvamento ────────────────────────────────────
    layoutNamePlaceholder: 'Nome do cliente / evento',
    saving: 'Salvando…',
    saved: '✓ Salvo',
    autosaving: 'Salvando automaticamente…',
    draftSaved: 'Rascunho salvo',
    offlineChanges: 'Sem conexão — alterações na memória',
    offlineChangesShort: '⚠ não salvo',
    saveBtn: 'Salvar',
    saveAsCopy: 'Salvar como cópia',
    savingCopy: 'Salvando cópia…',
    duplicating: 'Duplicando…',
    saveAsCopyTitle: 'Cria uma cópia independente a partir do estado atual do canvas — o original não é modificado',
    duplicateTitleReady: 'Duplica o layout (última versão salva)',
    duplicateTitleUnsaved: 'Salve o layout antes de duplicá-lo',
    // ── Editor: modal "Salvar como asset" ─────────────────────────────
    saveAsAssetTitle: 'Salvar como asset',
    saveGroupAsAssetTitle: 'Salvar grupo como asset',
    assetNameHint: 'Nome com o qual aparecerá em “Meus Assets”.',
    assetNamePlaceholder: 'Ex: Palco principal',
    assetDimsPolygonNote: ' · inclui a forma do polígono',
    assetPiecesUnit: 'peças',
    cancel: 'Cancelar',
    // ── Editor: banner de recuperação ────────────────────────────────
    recoveryText: 'Há alterações não salvas de {when} que nunca foram salvas neste layout.',
    recover: 'Recuperar',
    discard: 'Descartar',
    // ── Editor: seleção múltipla (painel de propriedades) ────────────
    sAsset: 'Asset',
    rotateGroupDeg: 'Girar grupo (°)',
    apply: 'Aplicar',
    // ── Dashboard ────────────────────────────────────────────────────
    dashTitle: 'Layouts',
    dashSubtitle: 'Meus Layouts',
    creatingLayoutForEvent: 'Criando layout para o evento',
    signOut: 'Sair',
    layoutsNoneYet: 'Nenhum layout salvo ainda',
    layoutsCountOne: '{n} layout',
    layoutsCountMany: '{n} layouts',
    layoutsCountFiltered: '{n} de {total}',
    newLayout: 'Novo layout',
    loadingLayouts: 'Carregando layouts…',
    noLayoutsTitle: 'Você ainda não tem layouts salvos.',
    createFirstLayout: 'Criar seu primeiro layout',
    searchLayoutsPlaceholder: 'Buscar por nome',
    searchNoMatch: 'Nenhum layout corresponde a “{q}”.',
    clearSearch: 'Limpar busca',
    duplicateLayoutTitle: 'Duplicar layout',
    deleteLayoutTitle: 'Excluir layout',
    deleteLayoutConfirmTitle: 'Excluir layout?',
    deleteLayoutConfirmText: 'Esta ação arquivará o layout. Não pode ser desfeita.',
    deleteBtn: 'Excluir',
    // ── Auth / carregamento / erros ──────────────────────────────────
    loading: 'Carregando…',
    redirecting: 'Redirecionando…',
    sessionCheckFailedMsg: 'Não foi possível verificar sua sessão.',
    retry: 'Tentar de novo',
    appName: 'EventOS Layout',
    poweredBy: 'Desenvolvido pela Reality Near',
    loginWithGoogle: 'Continuar com o Google',
    connecting: 'Conectando…',
    // ── Guard de status da organização ──────────────────────────────
    verifyingAccess: 'Verificando acesso…',
    orgStatusError: 'Não foi possível verificar o status da sua organização.',
    orgPendingTitle: 'Aprovação pendente',
    orgPendingBody: 'A organização {org} está aguardando aprovação da plataforma.',
    orgRejectedTitle: 'Organização rejeitada',
    orgRejectedBody: 'A organização {org} foi rejeitada pela plataforma.',
    orgSuspendedTitle: 'Organização suspensa',
    orgSuspendedBody: 'Sua organização {org} está suspensa. Entre em contato com o administrador.',
    // ── Criar organização ──────────────────────────────────────────
    createOrgTitle: 'Criar sua organização',
    createOrgSubtitle: 'Você ainda não faz parte de nenhuma organização no EventOS.',
    orgNameLabel: 'Nome da sua organização',
    creating: 'Criando…',
    createOrgBtn: 'Criar organização',
    orgNameRequired: 'Informe um nome para sua organização.',
    createOrgFailed: 'Não foi possível criar a organização. Tente de novo.',
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

const ASSET_NAME_PT: Record<string, string> = {
  'Main Stage': 'Palco Principal',
  'Secondary Stage': 'Palco Secundário',
  'Dance Floor': 'Pista de Dança',
  'LED Wall': 'Painel de LED',
  'Screen': 'Tela',
  'DJ Booth PRO': 'Cabine de DJ PRO',
  'DJ Booth': 'Cabine de DJ',
  'Podium': 'Púlpito',
  'Tent 10×10': 'Tenda 10×10',
  'Tent 20×20': 'Tenda 20×20',
  'Tent 20×40': 'Tenda 20×40',
  'Marquee': 'Tenda Marquise',
  'Bar': 'Bar',
  'Buffet': 'Buffet',
  'Lounge': 'Área Lounge',
  'Backstage': 'Backstage',
  'Round Table 8': 'Mesa Redonda 8',
  'Round Table 10': 'Mesa Redonda 10',
  'Head Table': 'Mesa Principal',
  'Rect Table': 'Mesa Retangular',
  'Chair Row Block': 'Bloco de Cadeiras',
  'Bleacher Block': 'Arquibancada',
  'Crowd Barrier': 'Grade de Contenção',
  'Fence': 'Cerca',
  'Fence Panel': 'Painel de Cerca',
  'Kitchen': 'Cozinha',
  'Restrooms': 'Banheiros',
  'Generator': 'Gerador',
  'First Aid': 'Primeiros Socorros',
  'Entrance': 'Entrada',
  'Entrance Gate': 'Portão de Entrada',
  'Exit Gate': 'Portão de Saída',
  'Emergency Exit': 'Saída de Emergência',
  'Rectangle': 'Retângulo',
  'Circle': 'Círculo',
  'Oval': 'Oval',
  'Rounded Box': 'Caixa Arredondada',
  'Tree': 'Árvore',
  'Square': 'Quadrado',
}

export function getAssetName(lang: Lang, name: string): string {
  if (lang === 'es') return ASSET_NAME_ES[name] ?? name
  if (lang === 'pt') return ASSET_NAME_PT[name] ?? name
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

// Acepta 'es' / 'es-PE' / 'en-US' / 'pt-BR' / etc. Cualquier cosa no
// reconocida -> null.
function normalizeLocale(raw: string | null | undefined): Lang | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.startsWith('es')) return 'es'
  if (s.startsWith('en')) return 'en'
  if (s.startsWith('pt')) return 'pt'
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
