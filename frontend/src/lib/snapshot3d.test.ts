import { describe, it, expect, beforeEach } from 'vitest'
import { writeSnapshot3D, readSnapshot3D } from './snapshot3d'
import { DEFAULT_LAYOUT_META } from '@/types/layout'

describe('copia del plano para el 3D', () => {
  beforeEach(() => localStorage.clear())
  it('se guarda y se lee', () => {
    expect(writeSnapshot3D('abc', { name: 'Boda', elements: [], drawings: [], meta: DEFAULT_LAYOUT_META })).toBe(true)
    expect(readSnapshot3D('abc')?.name).toBe('Boda')
  })
  it('una copia de hace más de 30 minutos no se usa', () => {
    writeSnapshot3D('abc', { name: 'Boda', elements: [], drawings: [], meta: DEFAULT_LAYOUT_META })
    expect(readSnapshot3D('abc', Date.now() + 31 * 60 * 1000)).toBeNull()
  })
  it('basura en el almacenamiento: nada', () => {
    localStorage.setItem('rn-layout-3d:x', '{roto')
    expect(readSnapshot3D('x')).toBeNull()
  })
})
