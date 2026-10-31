// Fondo del plano del local (bloque 5): sube una imagen (o un PDF convertido
// a imagen en el navegador) al bucket privado layout-backgrounds y la baja
// como blob (mismo origen: el canvas puede exportarla sin quedar "sucio").

import { supabase } from './supabase'
import type { BackgroundCrop } from '@/types/layout'

export const BACKGROUND_BUCKET = 'layout-backgrounds'
const MAX_BYTES = 15 * 1024 * 1024
const PDF_TARGET_PX = 3000

export type BackgroundKind = 'image' | 'pdf'

export function kindOf(file: File): BackgroundKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf'
  if (/^image\/(png|jpeg|webp)$/.test(file.type)) return 'image'
  return null
}

// Primera página del PDF → PNG (~3000 px del lado mayor). pdf.js se carga
// solo acá, al subir un PDF.
async function pdfToPng(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await task.promise
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const scale = PDF_TARGET_PX / Math.max(base.width, base.height)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  await task.destroy()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo convertir el PDF'))), 'image/png'))
}

function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { reject(new Error('Imagen no válida')); URL.revokeObjectURL(url) }
    img.src = url
  })
}

export class BackgroundError extends Error {
  constructor(public code: 'format' | 'size' | 'storage-full' | 'permission' | 'other', message?: string) {
    super(message ?? code)
  }
}

// Sube el archivo y devuelve la ruta y el tamaño en píxeles de la imagen.
export async function uploadBackground(orgId: string, file: File): Promise<{ path: string; pxWidth: number; pxHeight: number }> {
  const kind = kindOf(file)
  if (!kind) throw new BackgroundError('format')
  const blob: Blob = kind === 'pdf' ? await pdfToPng(file) : file
  if (blob.size > MAX_BYTES) throw new BackgroundError('size')
  const { width, height } = await imageSize(blob)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
  const path = `${orgId}/backgrounds/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BACKGROUND_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/png',
    upsert: false,
  })
  if (error) {
    const msg = error.message ?? ''
    if (/PLAN_STORAGE_FULL/.test(msg)) throw new BackgroundError('storage-full', msg)
    if (/row-level security|not authorized|403/i.test(msg)) throw new BackgroundError('permission', msg)
    throw new BackgroundError('other', msg)
  }
  return { path, pxWidth: width, pxHeight: height }
}

export async function downloadBackground(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BACKGROUND_BUCKET).download(path)
  if (error || !data) throw error ?? new Error('No se pudo bajar el fondo')
  return URL.createObjectURL(data)
}

// Escala el fondo para que la distancia medida sea la real, dejando fijo el
// primer punto marcado (en metros).
export function calibrate(
  bg: { x: number; y: number; width: number; height: number },
  anchor: { x: number; y: number },
  measuredM: number,
  realM: number,
): { x: number; y: number; width: number; height: number } {
  if (!(measuredM > 0) || !(realM > 0)) return bg
  const k = realM / measuredM
  const r = (n: number) => Math.round(n * 1000) / 1000
  return {
    x: r(anchor.x + (bg.x - anchor.x) * k),
    y: r(anchor.y + (bg.y - anchor.y) * k),
    width: r(bg.width * k),
    height: r(bg.height * k),
  }
}

// ── Recortar el fondo ───────────────────────────────────────────────────────
type Placed = { x: number; y: number; width: number; height: number; crop?: BackgroundCrop }

// Dónde quedaría la imagen ENTERA (sin recorte) en el plano.
export function fullPlacement(bg: Placed): { x: number; y: number; width: number; height: number } {
  const c = bg.crop
  if (!c || !(c.w > 0) || !(c.h > 0)) return { x: bg.x, y: bg.y, width: bg.width, height: bg.height }
  const width = bg.width / c.w, height = bg.height / c.h
  return { x: bg.x - c.x * width, y: bg.y - c.y * height, width, height }
}

// Aplica un recorte nuevo (o lo quita con null) sin mover el dibujo: la parte
// que queda sigue exactamente en el mismo lugar del plano.
export function applyCrop<T extends Placed>(bg: T, crop: BackgroundCrop | null): T {
  const full = fullPlacement(bg)
  const r = (n: number) => Math.round(n * 1000) / 1000
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  if (!crop) {
    const { crop: _drop, ...rest } = bg
    void _drop
    return { ...rest, x: r(full.x), y: r(full.y), width: r(full.width), height: r(full.height) } as T
  }
  const x = clamp(crop.x), y = clamp(crop.y)
  const c = { x, y, w: Math.min(1 - x, Math.max(0.01, crop.w)), h: Math.min(1 - y, Math.max(0.01, crop.h)) }
  const isFull = c.x < 0.0005 && c.y < 0.0005 && c.w > 0.999 && c.h > 0.999
  if (isFull) return applyCrop(bg, null)
  return {
    ...bg,
    crop: { x: r(c.x * 1e3) / 1e3, y: r(c.y * 1e3) / 1e3, w: r(c.w * 1e3) / 1e3, h: r(c.h * 1e3) / 1e3 },
    x: r(full.x + c.x * full.width),
    y: r(full.y + c.y * full.height),
    width: r(c.w * full.width),
    height: r(c.h * full.height),
  }
}

// Rectángulo de la imagen (px) que se dibuja.
export function cropPixels(crop: BackgroundCrop | undefined, naturalWidth: number, naturalHeight: number) {
  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 }
  return { x: c.x * naturalWidth, y: c.y * naturalHeight, width: c.w * naturalWidth, height: c.h * naturalHeight }
}
