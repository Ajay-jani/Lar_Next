import assert from 'node:assert/strict'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'

const watermarkModule: typeof import('./pdf-watermark') = await import(new URL('./pdf-watermark.ts', import.meta.url).href)

const {
  applyPdfWatermark,
  getWatermarkPlacement,
} = watermarkModule

async function createPdfBytes(pageSizes: Array<[number, number]>) {
  const document = await PDFDocument.create()

  pageSizes.forEach(size => {
    document.addPage(size)
  })

  return Uint8Array.from(await document.save())
}

const tinyPngBytes = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX2HFcAAAAASUVORK5CYII=',
  'base64'
))

test('getWatermarkPlacement positions blocks correctly', () => {
  const topLeft = getWatermarkPlacement('top-left', 600, 800, 120, 80, 24)
  const center = getWatermarkPlacement('center', 600, 800, 120, 80, 24)
  const bottomRight = getWatermarkPlacement('bottom-right', 600, 800, 120, 80, 24)

  assert.deepEqual(topLeft, { x: 24, y: 696 })
  assert.deepEqual(center, { x: 240, y: 360 })
  assert.deepEqual(bottomRight, { x: 456, y: 24 })
})

test('applyPdfWatermark adds a text watermark and preserves page count', async () => {
  const sourceBytes = await createPdfBytes([
    [600, 800],
    [600, 800],
  ])

  const watermarkedBytes = await applyPdfWatermark(sourceBytes, {
    position: 'center',
    opacity: 0.5,
    rotation: 45,
    margin: 24,
    pageNumbers: [1, 2],
    text: {
      content: 'CONFIDENTIAL',
      color: '#334155',
      fontSize: 28,
    },
    title: 'Watermarked PDF',
  })

  const watermarkedDocument = await PDFDocument.load(watermarkedBytes)

  assert.equal(watermarkedDocument.getPageCount(), 2)
  assert.equal(watermarkedDocument.getTitle(), 'Watermarked PDF')
})

test('applyPdfWatermark supports image watermarks', async () => {
  const sourceBytes = await createPdfBytes([
    [612, 792],
  ])

  const watermarkedBytes = await applyPdfWatermark(sourceBytes, {
    position: 'bottom-right',
    opacity: 0.7,
    rotation: 0,
    margin: 18,
    image: {
      bytes: tinyPngBytes,
      mimeType: 'image/png',
      scale: 0.25,
    },
  })

  const watermarkedDocument = await PDFDocument.load(watermarkedBytes)

  assert.equal(watermarkedDocument.getPageCount(), 1)
})
