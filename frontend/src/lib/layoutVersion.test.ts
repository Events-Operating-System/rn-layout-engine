import { describe, it, expect } from 'vitest'
import { exportFileName, sanitizeFileName, versionLabel, versionNote } from './layoutVersion'

describe('exportFileName', () => {
  it('usa nombre y versión', () => {
    expect(exportFileName('Matri Vane & Sandro', 3, 'pdf')).toBe('Matri Vane & Sandro - v3.pdf')
    expect(exportFileName('Matri Vane & Sandro', 3, 'png')).toBe('Matri Vane & Sandro - v3.png')
  })

  it('quita caracteres inválidos y conserva tildes y ñ', () => {
    expect(exportFileName('Boda Peña/Núñez: "salón" <A>|B*?\\', 2, 'pdf')).toBe('Boda PeñaNúñez salón AB - v2.pdf')
  })

  it('usa "Layout" si el nombre queda vacío', () => {
    expect(exportFileName('  /:*  ', 1, 'png')).toBe('Layout - v1.png')
  })
})

describe('sanitizeFileName', () => {
  it('colapsa espacios y quita puntos de los extremos', () => {
    expect(sanitizeFileName('  ..Plano   final..  ')).toBe('Plano final')
  })
})

describe('versionLabel / versionNote', () => {
  it('sin nota', () => {
    expect(versionLabel(4, '')).toBe('v4')
    expect(versionLabel(4, undefined)).toBe('v4')
  })

  it('con nota escrita a mano', () => {
    expect(versionLabel(2, 'v1.3 corte ')).toBe('v2 · v1.3 corte')
  })

  it('ignora el valor por defecto antiguo v1.0', () => {
    expect(versionNote('v1.0')).toBe('')
    expect(versionLabel(1, 'v1.0')).toBe('v1')
  })
})
