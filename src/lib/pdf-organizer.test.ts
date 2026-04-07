import assert from 'node:assert/strict'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'

const organizerModule: typeof import('./pdf-organizer') = await import(new URL('./pdf-organizer.ts', import.meta.url).href)

const {
  createOrganizerPages,
  exportOrganizedPdf,
  insertBlankPage,
  moveOrganizerPage,
  nudgeOrganizerPage,
  removeOrganizerPage,
  rotateOrganizerPage,
} = organizerModule

async function createPdfBytes(pageSizes: Array<[number, number]>) {
  const document = await PDFDocument.create()

  pageSizes.forEach(size => {
    document.addPage(size)
  })

  return Uint8Array.from(await document.save())
}

test('createOrganizerPages expands every source document into page items', () => {
  const pages = createOrganizerPages([
    { id: 'alpha', name: 'alpha.pdf', pageCount: 2 },
    { id: 'beta', name: 'beta.pdf', pageCount: 1 },
  ])

  assert.equal(pages.length, 3)
  assert.deepEqual(
    pages.map(page => [page.id, page.sourceFileId, page.sourcePageNumber]),
    [
      ['alpha-page-1', 'alpha', 1],
      ['alpha-page-2', 'alpha', 2],
      ['beta-page-1', 'beta', 1],
    ]
  )
})

test('page operations support move, rotate, blank insertion, removal, and nudging', () => {
  const initialPages = createOrganizerPages([
    { id: 'alpha', name: 'alpha.pdf', pageCount: 2 },
    { id: 'beta', name: 'beta.pdf', pageCount: 1 },
  ])

  const movedPages = moveOrganizerPage(initialPages, 2, 0)
  const rotatedPages = rotateOrganizerPage(movedPages, 'alpha-page-1')
  const insertedPages = insertBlankPage(rotatedPages, 'alpha-page-1', 'before')
  const nudgedPages = nudgeOrganizerPage(insertedPages, 'blank-page-1', 'left')
  const finalPages = removeOrganizerPage(nudgedPages, 'alpha-page-2')

  assert.deepEqual(
    finalPages.map(page => page.id),
    ['blank-page-1', 'beta-page-1', 'alpha-page-1']
  )
  assert.equal(finalPages[0].kind, 'blank')
  assert.equal(finalPages[2].rotation, 90)
})

test('exportOrganizedPdf creates a PDF that matches the arranged pages', async () => {
  const alphaBytes = await createPdfBytes([
    [400, 600],
    [420, 600],
  ])
  const betaBytes = await createPdfBytes([
    [700, 500],
  ])

  let arrangedPages = createOrganizerPages([
    { id: 'alpha', name: 'alpha.pdf', pageCount: 2 },
    { id: 'beta', name: 'beta.pdf', pageCount: 1 },
  ])

  arrangedPages = moveOrganizerPage(arrangedPages, 2, 0)
  arrangedPages = rotateOrganizerPage(arrangedPages, 'alpha-page-1')
  arrangedPages = insertBlankPage(arrangedPages, 'alpha-page-1', 'before')
  arrangedPages = removeOrganizerPage(arrangedPages, 'alpha-page-2')

  const organizedBytes = await exportOrganizedPdf(
    [
      { id: 'alpha', bytes: alphaBytes },
      { id: 'beta', bytes: betaBytes },
    ],
    arrangedPages,
    { title: 'Organized Test PDF' }
  )

  const organizedDocument = await PDFDocument.load(organizedBytes)

  assert.equal(organizedDocument.getPageCount(), 3)
  assert.equal(organizedDocument.getTitle(), 'Organized Test PDF')

  const firstPageSize = organizedDocument.getPage(0).getSize()
  const secondPageSize = organizedDocument.getPage(1).getSize()
  const thirdPage = organizedDocument.getPage(2)

  assert.equal(firstPageSize.width, 700)
  assert.equal(firstPageSize.height, 500)
  assert.equal(secondPageSize.width, 400)
  assert.equal(secondPageSize.height, 600)
  assert.equal(thirdPage.getRotation().angle, 90)
})
