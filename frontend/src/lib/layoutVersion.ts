// Nombre de archivo y etiqueta de versión para exportar un layout.
// La versión la numera la base (layouts.version_number); el texto que el
// usuario escribe en "VERSION DEL PLANO" (meta.version) queda como nota.

// Caracteres que Windows/macOS no aceptan en nombres de archivo. Tildes y ñ
// se conservan.
const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g

// Valor por defecto que traían los layouts creados antes de la numeración
// automática: no es texto escrito a mano, así que no se muestra como nota.
const LEGACY_DEFAULT_NOTE = 'v1.0'

export function sanitizeFileName(name: string): string {
  return name
    .replace(INVALID_FILENAME_CHARS, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .trim()
}

export function exportFileName(layoutName: string, versionNumber: number, ext: 'pdf' | 'png'): string {
  const base = sanitizeFileName(layoutName) || 'Layout'
  return `${base} - v${versionNumber}.${ext}`
}

export function versionNote(metaVersion: string | undefined | null): string {
  const note = (metaVersion ?? '').trim()
  return note === LEGACY_DEFAULT_NOTE ? '' : note
}

// "v3" o "v3 · nota" — lo que va en el cajetín.
export function versionLabel(versionNumber: number, metaVersion?: string | null): string {
  const note = versionNote(metaVersion)
  return note ? `v${versionNumber} · ${note}` : `v${versionNumber}`
}
