import { describe, it, expect } from 'vitest'
import { isPermissionError, parseLayoutPermissions } from './layoutPermissions'

describe('parseLayoutPermissions', () => {
  it('owner con el módulo: todo', () => {
    expect(parseLayoutPermissions({ modules: ['layout'], can: { layout: { crear: true, editar: true, borrar: true, compartir: true } } }))
      .toEqual({ canCreate: true, canEdit: true, canDelete: true, canShare: true })
  })
  it('rol sin borrar', () => {
    expect(parseLayoutPermissions({ modules: ['layout'], can: { layout: { crear: true, editar: true, borrar: false } } }))
      .toEqual({ canCreate: true, canEdit: true, canDelete: false, canShare: false })
  })
  it('sin el módulo: nada, aunque las acciones digan true', () => {
    expect(parseLayoutPermissions({ modules: ['eventos'], can: { layout: { crear: true, editar: true, borrar: true } } }))
      .toEqual({ canCreate: false, canEdit: false, canDelete: false, canShare: false })
  })
  it('respuesta rara: falla cerrado', () => {
    expect(parseLayoutPermissions(null)).toEqual({ canCreate: false, canEdit: false, canDelete: false, canShare: false })
  })
})

describe('isPermissionError', () => {
  it('reconoce los rechazos de la base', () => {
    expect(isPermissionError({ code: '42501', message: 'new row violates row-level security policy' })).toBe(true)
    expect(isPermissionError({ code: 'P0001', message: 'LAYOUT_PERM: no tienes permiso para borrar planos' })).toBe(true)
    expect(isPermissionError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })).toBe(true)
    expect(isPermissionError({ code: 'P0001', message: 'No tienes permiso para editar este layout' })).toBe(true)
  })
  it('no confunde otros errores', () => {
    expect(isPermissionError({ code: '08006', message: 'connection failure' })).toBe(false)
    expect(isPermissionError(null)).toBe(false)
  })
})
