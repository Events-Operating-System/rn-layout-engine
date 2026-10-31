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
