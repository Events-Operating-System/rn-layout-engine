import type { VenueBackground } from '@/types/layout'
import { describe, it, expect } from 'vitest'
import { calibrate, kindOf } from './venueBackground'
import { polylineLengthMeters, elementAreaMeters } from './drawingMath'
import { formatMeters } from './dimension'
import { parseLayoutSettings } from './layoutSettings'

describe('calibrar el fondo', () => {
  it('escala para que la medida sea la real y deja fijo el primer punto', () => {
    // medí 5 m en el fondo pero en realidad son 10 m → todo ×2 desde (2,2)
    const bg = calibrate({ x: 0, y: 0, width: 30, height: 20 }, { x: 2, y: 2 }, 5, 10)
    expect(bg).toEqual({ x: -2, y: -2, width: 60, height: 40 })
  })
  it('medidas inválidas no cambian nada', () => {
    const b = { x: 1, y: 1, width: 3, height: 3 }
    expect(calibrate(b, { x: 0, y: 0 }, 0, 10)).toBe(b)
  })
})

describe('formato de archivo del fondo', () => {
  it('acepta imágenes y PDF', () => {
    expect(kindOf(new File([''], 'plano.pdf', { type: 'application/pdf' }))).toBe('pdf')
    expect(kindOf(new File([''], 'plano.jpg', { type: 'image/jpeg' }))).toBe('image')
    expect(kindOf(new File([''], 'plano.dwg', { type: 'application/acad' }))).toBeNull()
  })
})

describe('muros', () => {
  it('largo abierto y cerrado', () => {
    const pts = [0, 0, 10, 0, 10, 5]
    expect(polylineLengthMeters(pts, false)).toBe(15)
    expect(polylineLengthMeters(pts, true)).toBeCloseTo(15 + Math.hypot(10, 5))
  })
  it('área solo si el perímetro está cerrado', () => {
    const pts = [0, 0, 10, 0, 10, 5, 0, 5]
    expect(elementAreaMeters({ shape: 'wall', width: 10, height: 5, points: pts, closed: true })).toBe(50)
    expect(elementAreaMeters({ shape: 'wall', width: 10, height: 5, points: pts, closed: false })).toBe(0)
  })
})

describe('cotas y ajustes', () => {
  it('decimales de la org', () => {
    expect(formatMeters(3.14159, 2)).toBe('3.14 m')
    expect(formatMeters(3.14159, 0)).toBe('3 m')
  })
  it('ajustes del bloque 5 con valores por defecto', () => {
    const s = parseLayoutSettings({ layout: { wall_thickness: 0.2, background_pdf: false } })
    expect(s).toMatchObject({ wallThickness: 0.2, dimensionDecimals: 2, backgroundImage: true, backgroundPdf: false })
  })
})

describe('recortar el fondo', () => {
  it('la parte recortada queda en el mismo lugar del plano; quitar el recorte vuelve atrás', async () => {
    const { applyCrop, fullPlacement, cropPixels } = await import('./venueBackground')
    const bg: VenueBackground = { path: 'p', x: 10, y: 20, width: 50, height: 40, opacity: 0.5, locked: false }
    const c = applyCrop(bg, { x: 0.1, y: 0.2, w: 0.6, h: 0.5 })
    expect(c).toMatchObject({ x: 15, y: 28, width: 30, height: 20, crop: { x: 0.1, y: 0.2, w: 0.6, h: 0.5 } })
    expect(fullPlacement(c)).toEqual({ x: 10, y: 20, width: 50, height: 40 })
    // recortar de nuevo parte siempre de la imagen entera
    const c2 = applyCrop(c, { x: 0, y: 0, w: 0.5, h: 0.5 })
    expect(c2).toMatchObject({ x: 10, y: 20, width: 25, height: 20 })
    const back = applyCrop(c2, null)
    expect(back).toEqual({ path: 'p', x: 10, y: 20, width: 50, height: 40, opacity: 0.5, locked: false })
    expect(cropPixels(c.crop, 1000, 800)).toEqual({ x: 100, y: 160, width: 600, height: 400 })
  })
  it('un recorte que es la imagen entera equivale a sin recorte; nada se sale de la imagen', async () => {
    const { applyCrop } = await import('./venueBackground')
    const bg: VenueBackground = { path: 'p', x: 0, y: 0, width: 10, height: 10, opacity: 1, locked: false }
    expect(applyCrop(bg, { x: 0, y: 0, w: 1, h: 1 }).crop).toBeUndefined()
    expect(applyCrop(bg, { x: 0.8, y: 0.9, w: 0.5, h: 0.5 }).crop).toEqual({ x: 0.8, y: 0.9, w: 0.2, h: 0.1 })
  })
  it('calibrar un fondo recortado conserva el recorte', async () => {
    const { applyCrop, calibrate } = await import('./venueBackground')
    const c = applyCrop<VenueBackground>({ path: 'p', x: 0, y: 0, width: 50, height: 40, opacity: 1, locked: false }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 })
    const cal = { ...c, ...calibrate(c, { x: c.x, y: c.y }, 10, 20) }
    expect(cal.crop).toEqual(c.crop)
    expect(cal.width).toBe(50)
  })
})
