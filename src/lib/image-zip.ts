import { zipSync } from 'fflate'

export interface ZipImageEntry {
  name: string
  bytes: Uint8Array
}

function sanitizeEntryName(name: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error('ZIP entries need a file name.')
  }

  return trimmed.replace(/[<>:"\\|?*\x00-\x1f]/g, '-')
}

export function createImageZip(entries: ZipImageEntry[]) {
  if (entries.length === 0) {
    throw new Error('Add at least one image before creating a ZIP archive.')
  }

  const zipEntries = Object.fromEntries(
    entries.map(entry => [sanitizeEntryName(entry.name), entry.bytes])
  )

  return zipSync(zipEntries, { level: 0 })
}
