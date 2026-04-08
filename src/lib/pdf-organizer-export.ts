import { PDFDocument, degrees } from 'pdf-lib'
import type {
  OrganizerExportMetadata,
  OrganizerPageItem,
  OrganizerPageTemplate,
  OrganizerPageRotation,
  OrganizerSourceDocument,
} from './pdf-organizer-state'

const DEFAULT_ORGANIZER_BLANK_PAGE = {
  width: 595.28,
  height: 841.89,
}

function toUint8Array(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}

function normalizeOrganizerRotation(value: number): OrganizerPageRotation {
  const normalized = ((value % 360) + 360) % 360

  if (normalized !== 0 && normalized !== 90 && normalized !== 180 && normalized !== 270) {
    throw new Error('Page rotation must be one of: 0, 90, 180, or 270 degrees')
  }

  return normalized as OrganizerPageRotation
}

async function getBlankPageSize(
  blankTemplate: OrganizerPageTemplate | undefined,
  sourceMap: Map<string, PDFDocument>
) {
  if (!blankTemplate) {
    return DEFAULT_ORGANIZER_BLANK_PAGE
  }

  const sourceDocument = sourceMap.get(blankTemplate.sourceFileId)
  const sourcePageIndex = blankTemplate.sourcePageNumber - 1

  if (!sourceDocument || sourcePageIndex < 0 || sourcePageIndex >= sourceDocument.getPageCount()) {
    return DEFAULT_ORGANIZER_BLANK_PAGE
  }

  return sourceDocument.getPage(sourcePageIndex).getSize()
}

export async function exportOrganizedPdf(
  sourceDocuments: OrganizerSourceDocument[],
  pages: OrganizerPageItem[],
  metadata: OrganizerExportMetadata = {}
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('Add at least one page before organizing the PDF.')
  }

  const outputDocument = await PDFDocument.create()
  outputDocument.setCreator(metadata.creator ?? 'UtilityHub PDF Organizer')
  outputDocument.setProducer('UtilityHub')
  outputDocument.setCreationDate(new Date())

  if (metadata.title) {
    outputDocument.setTitle(metadata.title)
  }

  const sourceMap = new Map<string, PDFDocument>()

  for (const sourceDocument of sourceDocuments) {
    sourceMap.set(sourceDocument.id, await PDFDocument.load(toUint8Array(sourceDocument.bytes)))
  }

  for (const page of pages) {
    if (page.kind === 'blank') {
      const size = await getBlankPageSize(page.blankTemplate, sourceMap)
      const blankPage = outputDocument.addPage([size.width, size.height])

      if (page.rotation !== 0) {
        blankPage.setRotation(degrees(page.rotation))
      }

      continue
    }

    if (!page.sourceFileId || !page.sourcePageNumber) {
      throw new Error('One of the selected pages is missing its source document information.')
    }

    const sourceDocument = sourceMap.get(page.sourceFileId)

    if (!sourceDocument) {
      throw new Error(`Source PDF for page "${page.id}" is no longer available.`)
    }

    const sourcePageIndex = page.sourcePageNumber - 1

    if (sourcePageIndex < 0 || sourcePageIndex >= sourceDocument.getPageCount()) {
      throw new Error(`Page ${page.sourcePageNumber} is outside the bounds of "${page.sourceFileName ?? page.sourceFileId}".`)
    }

    const [copiedPage] = await outputDocument.copyPages(sourceDocument, [sourcePageIndex])
    const nextRotation = normalizeOrganizerRotation(copiedPage.getRotation().angle + page.rotation)
    copiedPage.setRotation(degrees(nextRotation))
    outputDocument.addPage(copiedPage)
  }

  return Uint8Array.from(await outputDocument.save())
}
