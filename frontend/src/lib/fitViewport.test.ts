import { describe, it, expect } from 'vitest'
import { fitViewportToContent } from './fitViewport'

const PPM = 20

describe('fitViewportToContent', () => {
  it('plano vacío: no cambia nada', () => {
    expect(fitViewportToContent([], [], { width: 800, height: 600 }, PPM, 0.15, 6)).toBeNull()
  })

  it('encuadra y centra el plano en el área visible', () => {
    // Una pieza de 20×10 m en (10,10): caja 200..600 × 200..400 px
    const v = fitViewportToContent([{ x: 10, y: 10, width: 20, height: 10 }], [], { width: 800, height: 600 }, PPM, 0.15, 6)!
    // ancho disponible 704 / 400 = 1.76; alto 504 / 200 = 2.52 → manda el ancho
    expect(v.scale).toBeCloseTo(1.76, 2)
    // el centro del contenido (400, 300) cae en el centro de la vista
    expect(400 * v.scale + v.x).toBeCloseTo(400, 5)
    expect(300 * v.scale + v.y).toBeCloseTo(300, 5)
  })

  it('respeta el zoom mínimo en locales enormes', () => {
    const v = fitViewportToContent([{ x: 0, y: 0, width: 2000, height: 2000 }], [], { width: 800, height: 600 }, PPM, 0.15, 6)!
    expect(v.scale).toBe(0.15)
  })

  it('incluye los dibujos', () => {
    const v = fitViewportToContent([], [{ points: [0, 0, 1000, 0] }], { width: 800, height: 600 }, PPM, 0.15, 6)!
    expect(500 * v.scale + v.x).toBeCloseTo(400, 5)
  })
})
