import { describe, it, expect } from 'vitest'
import { normalizeLayoutMeta } from './layoutMeta'
import { DEFAULT_LAYOUT_META } from '@/types/layout'

describe('normalizeLayoutMeta', () => {
  it('formato viejo: cliente era copia del nombre → PROYECTO = nombre, CLIENTE vacío', () => {
    const { proyecto, cliente, ...rest } = DEFAULT_LAYOUT_META
    void proyecto; void cliente
    const m = normalizeLayoutMeta({ ...rest, cliente: 'Cumple 42 años Javier' }, 'Cumple 42 años Javier')
    expect(m.proyecto).toBe('Cumple 42 años Javier')
    expect(m.cliente).toBe('')
  })

  it('formato viejo vinculado a evento → CLIENTE del evento', () => {
    const m = normalizeLayoutMeta({ cliente: 'Cumple 42 años Javier' }, 'Cumple 42 años Javier', 'Javier')
    expect(m.cliente).toBe('Javier')
  })

  it('formato nuevo: respeta cliente escrito a mano', () => {
    const m = normalizeLayoutMeta({ ...DEFAULT_LAYOUT_META, proyecto: 'Boda', cliente: 'Ana' }, 'Boda')
    expect(m).toMatchObject({ proyecto: 'Boda', cliente: 'Ana' })
  })

  it('el cliente del evento manda sobre el escrito a mano', () => {
    const m = normalizeLayoutMeta({ ...DEFAULT_LAYOUT_META, proyecto: 'Boda', cliente: 'Ana' }, 'Boda', 'Ana Pérez')
    expect(m.cliente).toBe('Ana Pérez')
  })

  it('sin meta usa el nombre del layout', () => {
    expect(normalizeLayoutMeta(null, 'Plano X')).toMatchObject({ proyecto: 'Plano X', cliente: '' })
  })
})
