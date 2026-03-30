export function parsePageRanges(input: string, totalPages: number): number[] {
  if (totalPages <= 0) {
    return []
  }

  const normalized = input.trim()
  if (!normalized) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>()
  const segments = normalized.split(',').map(segment => segment.trim()).filter(Boolean)

  if (segments.length === 0) {
    throw new Error('Enter at least one page or page range')
  }

  for (const segment of segments) {
    if (segment.includes('-')) {
      const [rawStart, rawEnd] = segment.split('-').map(part => part.trim())
      const start = Number.parseInt(rawStart, 10)
      const end = Number.parseInt(rawEnd, 10)

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid page range: "${segment}"`)
      }

      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        throw new Error(`Page range "${segment}" is outside the document bounds`)
      }

      if (start > end) {
        throw new Error(`Page range "${segment}" must go from low to high`)
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page)
      }
    } else {
      const page = Number.parseInt(segment, 10)

      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: "${segment}"`)
      }

      if (page < 1 || page > totalPages) {
        throw new Error(`Page ${page} is outside the document bounds`)
      }

      pages.add(page)
    }
  }

  return Array.from(pages).sort((left, right) => left - right)
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) {
    return '0 Bytes'
  }

  const units = ['Bytes', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function createPdfDownloadName(fileName: string, suffix: string): string {
  const baseName = fileName.replace(/\.pdf$/i, '').trim() || 'document'
  const normalizedSuffix = suffix.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')

  return `${baseName}-${normalizedSuffix || 'updated'}.pdf`
}
