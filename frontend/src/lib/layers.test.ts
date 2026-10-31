import { describe, it, expect } from 'vitest'
import { layerOf, applyLayers, toggleLayer, normalizeLayers, countByLayer, EMPTY_LAYERS } from './layers'
import { buildTemplate, instantiateTemplate } from './templates'
import type { LayoutElement } from '@/types/layout'

const el = (id: string, over: Partial<LayoutElement>): LayoutElement => ({
  id, name: 'X', category: 'primitive', x: 0, y: 0, width: 1, height: 1, rotation: 0, color: '', locked: false, notes: '', ...over,
})

describe('layerOf', () => {
  it('capa por categoría y a mano', () => {
    expect(layerOf(el('a', { shape: 'wall', category: 'structure' }))).toBe('structure')
    expect(layerOf(el('a', { category: 'seating' }))).toBe('furniture')
    expect(layerOf(el('a', { category: 'stage', name: 'LED Wall' }))).toBe('technical')
    expect(layerOf(el('a', { category: 'stage', name: 'Main Stage' }))).toBe('structure')
    expect(layerOf(el('a', { category: 'utility' }))).toBe('technical')
    expect(layerOf(el('a', { category: 'primitive' }))).toBe('decor')
    expect(layerOf(el('a', { category: 'seating', layer: 'decor' }))).toBe('decor')
  })
})

describe('applyLayers', () => {
  const all = [el('t', { category: 'seating' }), el('w', { shape: 'wall', category: 'structure' }), el('g', { category: 'utility', name: 'Generator' })]
  it('sin capas tocadas devuelve todo igual', () => {
    const v = applyLayers(all, EMPTY_LAYERS)
    expect(v.elements).toBe(all)
    expect(v.showDrawings).toBe(true)
  })
  it('oculta técnica y notas (vista cliente) y bloquea estructura', () => {
    const v = applyLayers(all, { hidden: ['technical', 'notes'], locked: ['structure'] })
    expect(v.elements.map(e => e.id)).toEqual(['t', 'w'])
    expect([...v.inertIds]).toEqual(['w'])
    expect(v.showDrawings).toBe(false)
  })
  it('notas bloqueadas: dibujos visibles pero quietos', () => {
    const v = applyLayers(all, { hidden: [], locked: ['notes'] })
    expect(v.showDrawings).toBe(true)
    expect(v.drawingsLocked).toBe(true)
  })
  it('toggle y normalizar descartan basura', () => {
    expect(toggleLayer(EMPTY_LAYERS, 'hidden', 'decor').hidden).toEqual(['decor'])
    expect(toggleLayer({ hidden: ['decor'], locked: [] }, 'hidden', 'decor').hidden).toEqual([])
    expect(normalizeLayers({ hidden: ['x' as never, 'notes'], locked: undefined as never })).toEqual({ hidden: ['notes'], locked: [] })
  })
  it('cuenta piezas por capa', () => {
    expect(countByLayer(all, 3)).toEqual({ structure: 1, furniture: 1, decor: 0, technical: 1, notes: 3 })
  })
})

describe('plantillas', () => {
  it('se colocan con ids y grupos nuevos, en el mismo lugar', () => {
    const els = [el('a', { groupId: 'g1', x: 2 }), el('b', { groupId: 'g1', x: 4 }), el('c', {})]
    const { payload, width } = buildTemplate(els, [{ id: 'd', tool: 'text', points: [0, 0], color: '', strokeWidth: 1, text: 'hola' }])
    expect(width).toBe(5)
    const out = instantiateTemplate(payload, i => `n${i}`, i => `G${i}`)
    expect(out.elements.map(e => e.id)).toEqual(['n0', 'n1', 'n2'])
    expect(out.elements[0].groupId).toBe('G0')
    expect(out.elements[1].groupId).toBe('G0')
    expect(out.elements[2].groupId).toBeUndefined()
    expect(out.elements[1].x).toBe(4)
    expect(out.drawings[0].id).toBe('n3')
  })
  it('plantilla vacía o rota no agrega nada', () => {
    expect(instantiateTemplate(null, i => `${i}`, i => `${i}`)).toEqual({ elements: [], drawings: [] })
  })
})

describe('ajustes de capas', () => {
  it('Cocina y Baños nuevos van a perímetro/estructura; lo viejo no cambia', async () => {
    const { layerForNewPiece } = await import('./layers')
    expect(layerForNewPiece('Kitchen')).toBe('structure')
    expect(layerForNewPiece('Restrooms')).toBe('structure')
    expect(layerForNewPiece('Generator')).toBeUndefined()
    // Una cocina guardada antes (sin capa) sigue en técnica.
    expect(layerOf(el('k', { name: 'Kitchen', category: 'utility' }))).toBe('technical')
    expect(layerOf(el('k', { name: 'Kitchen', category: 'utility', layer: 'structure' }))).toBe('structure')
  })
  it('Vista cliente sale de los ajustes de la org', async () => {
    const { parseLayoutSettings } = await import('./layoutSettings')
    expect(parseLayoutSettings({}).clientViewHidden).toEqual(['technical', 'notes'])
    expect(parseLayoutSettings({ layout: { client_hide_decor: true, client_hide_notes: false } }).clientViewHidden).toEqual(['decor', 'technical'])
    expect(parseLayoutSettings({ layout: { client_hide_technical: 'si' } }).clientViewHidden).toEqual(['technical', 'notes'])
  })
})
