import { describe, it, expect } from 'vitest'
import { computeAlignmentGuides } from './geometry'
import { titleBlockColumns } from './titleBlock'
import { DEFAULT_LAYOUT_META, type LayoutElement } from '@/types/layout'

const el = (id: string, x: number, y: number, w: number, h: number): LayoutElement => ({
  id, name: id, category: 'stage', x, y, width: w, height: h, rotation: 0, color: '#000', locked: false, notes: '',
})

describe('computeAlignmentGuides', () => {
  it('marca la guía cuando los centros coinciden (dentro de 8 px de pantalla)', () => {
    // Pieza fija de 10×10 m en (0,0) → centro en x=100 px
    const guides = computeAlignmentGuides([el('a', 0, 0, 10, 10)], 'b', 52, 300, 100, 40, 1)
    expect(guides.xs).toContain(100)
  })
  it('ignora la pieza que se arrastra y lo que está lejos', () => {
    const guides = computeAlignmentGuides([el('a', 0, 0, 10, 10)], 'a', 0, 0, 200, 200, 1)
    expect(guides).toEqual({ xs: [], ys: [] })
  })
})

describe('titleBlockColumns', () => {
  it('10 casillas en el orden del cajetín, con la versión y su nota', () => {
    const cols = titleBlockColumns({ ...DEFAULT_LAYOUT_META, proyecto: 'Boda', cliente: 'Ana', version: 'corte' }, 3)
    expect(cols.flat().map(f => f.label)).toEqual([
      'PROYECTO', 'CLIENTE', 'LUGAR EVENTO', 'FECHA EVENTO', 'PAX / INVITADOS',
      'VERSION DEL PLANO', 'FECHA DEL PLANO', 'CONTACTO', 'TELEFONO', 'CORREO',
    ])
    expect(cols[0][0].value).toBe('Boda')
    expect(cols[2][1].value).toBe('v3 · corte')
  })
})
