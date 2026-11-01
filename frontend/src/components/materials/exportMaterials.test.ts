import { describe, it, expect } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { buildMaterialsXlsx, buildMaterialsPdf, type MaterialsDoc } from './exportMaterials'
import { DEFAULT_LAYOUT_META } from '@/types/layout'
import { materialsFileName } from '@/lib/layoutVersion'

const doc = (n: number, change = false): MaterialsDoc => ({
  title: 'Lista de materiales',
  headers: { type: 'Tipo', detail: 'Detalle', qty: 'Cant.', unit: 'Unidad', origin: 'Origen', note: 'Nota', ...(change ? { change: 'Cambio vs v2' } : {}) },
  rows: Array.from({ length: n }, (_, i) => ({ type: 'Silla', detail: `Tiffany · Morado ${i}`, qty: String(10 + i), unit: 'u', origin: i % 2 ? 'Tercero' : 'Propio', note: i % 2 ? 'Alquileres & Cía <SAC>' : '', change: change ? '+10' : undefined })),
  meta: { ...DEFAULT_LAYOUT_META, proyecto: 'Boda Pérez', cliente: 'Familia Pérez' },
  versionNumber: 4,
})

describe('exportar la lista de materiales', () => {
  it('Excel: un .xlsx válido con el cajetín y las líneas (texto escapado, cantidades como número)', () => {
    const files = unzipSync(buildMaterialsXlsx(doc(3, true)))
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'])
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
    expect(sheet).toContain('Boda Pérez')
    expect(sheet).toContain('Alquileres &amp; Cía &lt;SAC&gt;')
    expect(sheet).toContain('<v>10</v>')
    expect(sheet).toContain('Cambio vs v2')
  })
  it('PDF: varias páginas cuando hay muchas líneas, cada una con su cajetín', () => {
    const one = buildMaterialsPdf(doc(5))
    expect(one.getNumberOfPages()).toBe(1)
    const many = buildMaterialsPdf(doc(80))
    expect(many.getNumberOfPages()).toBeGreaterThan(1)
  })
  it('nombre del archivo', () => {
    expect(materialsFileName('Boda / Pérez', 4, 'xlsx')).toBe('Boda Pérez - v4 - materiales.xlsx')
  })
})
