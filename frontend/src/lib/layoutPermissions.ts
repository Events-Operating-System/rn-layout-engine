// Facultades de Layout del usuario en la org (Administración → Roles y
// permisos). La base es el candado real (RLS + trigger, migración
// 20261031200000_layout_role_permissions); esto solo decide qué botones se
// muestran.

export interface LayoutPermissions {
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  // Publicar en la biblioteca de la org o sacar de ella (bloque 6).
  canShare: boolean
}

export const NO_LAYOUT_PERMISSIONS: LayoutPermissions = {
  loading: false, canCreate: false, canEdit: false, canDelete: false, canShare: false,
}

// get_my_permissions → { role, modules, can: { layout: { crear, editar, borrar, compartir } } }
// Sin el módulo 'layout' no hay ninguna facultad. Ante cualquier forma
// inesperada, falla cerrado.
export function parseLayoutPermissions(data: unknown): Omit<LayoutPermissions, 'loading'> {
  const d = data as { modules?: unknown; can?: { layout?: Record<string, unknown> } } | null
  const modules = Array.isArray(d?.modules) ? (d?.modules as unknown[]) : []
  if (!modules.includes('layout')) return { canCreate: false, canEdit: false, canDelete: false, canShare: false }
  const can = d?.can?.layout ?? {}
  return {
    canCreate: can.crear === true,
    canEdit: can.editar === true,
    canDelete: can.borrar === true,
    canShare: can.compartir === true,
  }
}

// ¿La base rechazó la operación por permisos?
//  - 42501: RLS (insert) o el trigger layouts_check_action (LAYOUT_PERM)
//  - PGRST116: un update con .single() que la RLS dejó en 0 filas
//  - restore_layout_version: 'No tienes permiso…'
export function isPermissionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  if (!e) return false
  if (e.code === '42501' || e.code === 'PGRST116') return true
  const msg = e.message ?? ''
  return /LAYOUT_PERM|row-level security|No tienes permiso/i.test(msg)
}
