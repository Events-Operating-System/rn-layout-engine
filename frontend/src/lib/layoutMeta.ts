import { DEFAULT_LAYOUT_META, type LayoutMeta } from '@/types/layout'

// Cajetín: PROYECTO = nombre del layout (igual a la barra de arriba);
// CLIENTE = dato aparte (del evento vinculado o escrito a mano).
//
// Antes de existir meta.proyecto, meta.cliente guardaba una copia del
// nombre del layout (en los 50 layouts de producción eran iguales). Un meta
// sin `proyecto` es de ese formato viejo: su "cliente" no es un cliente, así
// que se descarta. Se resuelve al abrir, sin migrar la base, para no subir
// la versión de todos los layouts de golpe.
export function normalizeLayoutMeta(
  meta: Partial<LayoutMeta> | null | undefined,
  layoutName: string,
  eventClient?: string | null,
): LayoutMeta {
  const legacy = !meta || meta.proyecto === undefined
  const proyecto = (legacy ? '' : meta?.proyecto ?? '') || layoutName || meta?.cliente || ''
  const cliente = eventClient || (legacy ? '' : meta?.cliente ?? '')
  return { ...DEFAULT_LAYOUT_META, ...meta, proyecto, cliente }
}
