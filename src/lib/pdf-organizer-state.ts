export type OrganizerPageKind = 'source' | 'blank'
export type OrganizerPageRotation = 0 | 90 | 180 | 270
export type BlankInsertionPosition = 'before' | 'after'

export interface OrganizerSourceDescriptor {
  id: string
  name: string
  pageCount: number
}

export interface OrganizerSourceDocument {
  id: string
  bytes: ArrayBuffer | Uint8Array
}

export interface OrganizerPageTemplate {
  sourceFileId: string
  sourcePageNumber: number
}

export interface OrganizerPageItem {
  id: string
  kind: OrganizerPageKind
  rotation: OrganizerPageRotation
  sourceFileId?: string
  sourceFileName?: string
  sourcePageNumber?: number
  blankTemplate?: OrganizerPageTemplate
}

export interface OrganizerExportMetadata {
  title?: string
  creator?: string
}

export const DEFAULT_ORGANIZER_BLANK_PAGE = {
  width: 595.28,
  height: 841.89,
}

export function normalizeOrganizerRotation(value: number): OrganizerPageRotation {
  const normalized = ((value % 360) + 360) % 360

  if (normalized !== 0 && normalized !== 90 && normalized !== 180 && normalized !== 270) {
    throw new Error('Page rotation must be one of: 0, 90, 180, or 270 degrees')
  }

  return normalized as OrganizerPageRotation
}

function getPageTemplate(page?: OrganizerPageItem): OrganizerPageTemplate | undefined {
  if (!page) {
    return undefined
  }

  if (page.kind === 'source' && page.sourceFileId && page.sourcePageNumber) {
    return {
      sourceFileId: page.sourceFileId,
      sourcePageNumber: page.sourcePageNumber,
    }
  }

  return page.blankTemplate
}

function getBlankPageId(pages: OrganizerPageItem[]) {
  let nextIndex = pages.filter(page => page.kind === 'blank').length + 1
  let candidate = `blank-page-${nextIndex}`

  while (pages.some(page => page.id === candidate)) {
    nextIndex += 1
    candidate = `blank-page-${nextIndex}`
  }

  return candidate
}

function findTemplateNearIndex(pages: OrganizerPageItem[], index: number): OrganizerPageTemplate | undefined {
  const directTemplate = getPageTemplate(pages[index]) ?? getPageTemplate(pages[index - 1]) ?? getPageTemplate(pages[index + 1])

  if (directTemplate) {
    return directTemplate
  }

  for (let step = 2; step < pages.length; step += 1) {
    const previousTemplate = getPageTemplate(pages[index - step])
    if (previousTemplate) {
      return previousTemplate
    }

    const nextTemplate = getPageTemplate(pages[index + step])
    if (nextTemplate) {
      return nextTemplate
    }
  }

  return undefined
}

function getTargetIndex(index: number, pages: OrganizerPageItem[]) {
  if (pages.length === 0) {
    return 0
  }

  return Math.max(0, Math.min(index, pages.length - 1))
}

export function createOrganizerPages(sources: OrganizerSourceDescriptor[]): OrganizerPageItem[] {
  return sources.flatMap(source =>
    Array.from({ length: source.pageCount }, (_, index) => ({
      id: `${source.id}-page-${index + 1}`,
      kind: 'source' as const,
      rotation: 0 as OrganizerPageRotation,
      sourceFileId: source.id,
      sourceFileName: source.name,
      sourcePageNumber: index + 1,
    }))
  )
}

export function moveOrganizerPage(pages: OrganizerPageItem[], fromIndex: number, toIndex: number): OrganizerPageItem[] {
  if (pages.length <= 1) {
    return [...pages]
  }

  const safeFromIndex = getTargetIndex(fromIndex, pages)
  const safeToIndex = getTargetIndex(toIndex, pages)

  if (safeFromIndex === safeToIndex) {
    return [...pages]
  }

  const nextPages = [...pages]
  const [pageToMove] = nextPages.splice(safeFromIndex, 1)
  nextPages.splice(safeToIndex, 0, pageToMove)

  return nextPages
}

export function nudgeOrganizerPage(
  pages: OrganizerPageItem[],
  pageId: string,
  direction: 'left' | 'right'
): OrganizerPageItem[] {
  const pageIndex = pages.findIndex(page => page.id === pageId)

  if (pageIndex === -1) {
    return [...pages]
  }

  const targetIndex = direction === 'left' ? pageIndex - 1 : pageIndex + 1
  return moveOrganizerPage(pages, pageIndex, targetIndex)
}

export function rotateOrganizerPage(pages: OrganizerPageItem[], pageId: string): OrganizerPageItem[] {
  return pages.map(page => (
    page.id === pageId
      ? { ...page, rotation: normalizeOrganizerRotation(page.rotation + 90) }
      : page
  ))
}

export function removeOrganizerPage(pages: OrganizerPageItem[], pageId: string): OrganizerPageItem[] {
  return pages.filter(page => page.id !== pageId)
}

export function insertBlankPage(
  pages: OrganizerPageItem[],
  pageId: string,
  position: BlankInsertionPosition
): OrganizerPageItem[] {
  const pageIndex = pages.findIndex(page => page.id === pageId)

  if (pageIndex === -1) {
    return [...pages]
  }

  const insertAt = position === 'before' ? pageIndex : pageIndex + 1
  const blankPage: OrganizerPageItem = {
    id: getBlankPageId(pages),
    kind: 'blank',
    rotation: 0,
    blankTemplate: findTemplateNearIndex(pages, pageIndex),
  }

  const nextPages = [...pages]
  nextPages.splice(insertAt, 0, blankPage)

  return nextPages
}

export function appendBlankPage(pages: OrganizerPageItem[]): OrganizerPageItem[] {
  const blankPage: OrganizerPageItem = {
    id: getBlankPageId(pages),
    kind: 'blank',
    rotation: 0,
    blankTemplate: findTemplateNearIndex(pages, pages.length - 1),
  }

  return [...pages, blankPage]
}
