import assert from 'node:assert/strict'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'

const jpgToPdfModule: typeof import('./jpg-to-pdf') = await import(new URL('./jpg-to-pdf.ts', import.meta.url).href)

const {
  convertImagesToPdf,
  getImagePlacement,
  getPdfPageDimensions,
} = jpgToPdfModule

const tinyJpgBytes = await sharp({
  create: {
    width: 2,
    height: 2,
    channels: 3,
    background: { r: 255, g: 0, b: 0 },
  },
}).jpeg().toBuffer()

const tinyPngBytes = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX2HFcAAAAASUVORK5CYII=',
  'base64'
))

test('getPdfPageDimensions respects preset and orientation', () => {
  assert.deepEqual(getPdfPageDimensions(1200, 800, 'a4', 'portrait'), { width: 595.28, height: 841.89 })
  assert.deepEqual(getPdfPageDimensions(1200, 800, 'a4', 'landscape'), { width: 841.89, height: 595.28 })
  assert.deepEqual(getPdfPageDimensions(1200, 800, 'fit-image', 'auto'), { width: 1200, height: 800 })
})

test('getImagePlacement centers contain images inside page bounds', () => {
  const placement = getImagePlacement({ width: 600, height: 800 }, 1200, 600, 24, 'contain')

  assert.equal(placement.width, 552)
  assert.equal(placement.height, 276)
  assert.equal(placement.x, 24)
  assert.equal(placement.y, 262)
})

test('convertImagesToPdf creates one pdf page per image', async () => {
  const pdfBytes = await convertImagesToPdf(
    [
      { name: 'first.jpg', bytes: tinyJpgBytes, mimeType: 'image/jpeg' },
      { name: 'second.png', bytes: tinyPngBytes, mimeType: 'image/png' },
    ],
    {
      pageSize: 'letter',
      orientation: 'portrait',
      margin: 20,
      imageFit: 'contain',
      title: 'Images PDF',
    }
  )

  const pdfDocument = await PDFDocument.load(pdfBytes)

  assert.equal(pdfDocument.getPageCount(), 2)
  assert.equal(pdfDocument.getTitle(), 'Images PDF')
  assert.deepEqual(pdfDocument.getPage(0).getSize(), { width: 612, height: 792 })
})
