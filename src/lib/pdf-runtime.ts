let pdfLibPromise: Promise<typeof import('pdf-lib')> | null = null
let pdfOrganizerExportPromise: Promise<typeof import('./pdf-organizer-export')> | null = null
let pdfWatermarkPromise: Promise<typeof import('./pdf-watermark')> | null = null
let jpgToPdfPromise: Promise<typeof import('./jpg-to-pdf')> | null = null

export function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import('pdf-lib')
  }

  return pdfLibPromise
}

export function loadPdfOrganizerExport() {
  if (!pdfOrganizerExportPromise) {
    pdfOrganizerExportPromise = import('./pdf-organizer-export')
  }

  return pdfOrganizerExportPromise
}

export function loadPdfWatermarkModule() {
  if (!pdfWatermarkPromise) {
    pdfWatermarkPromise = import('./pdf-watermark')
  }

  return pdfWatermarkPromise
}

export function loadJpgToPdfModule() {
  if (!jpgToPdfPromise) {
    jpgToPdfPromise = import('./jpg-to-pdf')
  }

  return jpgToPdfPromise
}
