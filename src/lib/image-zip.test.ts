import assert from 'node:assert/strict'
import test from 'node:test'
import { unzipSync } from 'fflate'

const imageZipModule: typeof import('./image-zip') = await import(new URL('./image-zip.ts', import.meta.url).href)

const { createImageZip } = imageZipModule

test('createImageZip packages images into a zip archive', () => {
  const zipBytes = createImageZip([
    { name: 'page-001.jpg', bytes: new Uint8Array([1, 2, 3]) },
    { name: 'page-002.jpg', bytes: new Uint8Array([4, 5, 6]) },
  ])

  const files = unzipSync(zipBytes)

  assert.deepEqual(Object.keys(files).sort(), ['page-001.jpg', 'page-002.jpg'])
  assert.deepEqual(Array.from(files['page-001.jpg']), [1, 2, 3])
})
