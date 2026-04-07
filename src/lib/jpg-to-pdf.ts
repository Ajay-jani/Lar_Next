import { PDFDocument } from 'pdf-lib'

export type PdfPageSizePreset = 'fit-image' | 'a4' | 'letter'
export type PdfPageOrientation = 'auto' | 'portrait' | 'landscape'
export type PdfImageFit = 'contain' | 'cover'

export interface ImageToPdfInput {
  name: string
  bytes: ArrayBuffer | Uint8Array
  mimeType: 'image/jpeg' | 'image/png'
}

export interface ImageToPdfOptions {
  pageSize: PdfPageSizePreset
  orientation: PdfPageOrientation
  margin: number
  imageFit: PdfImageFit
  title?: string
  creator?: string
}

interface PageDimensions {
  width: number
  height: number
}

interface Placement {
  x: number
  y: number
  width: number
  height: number
}

const PAGE_PRESETS: Record<Exclude<PdfPageSizePreset, 'fit-image'>, PageDimensions> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
}

function toUint8Array(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}

function normalizeMargin(margin: number) {
  return Math.max(0, Math.min(margin, 96))
}

export function getPdfPageDimensions(
  imageWidth: number,
  imageHeight: number,
  pageSize: PdfPageSizePreset,
  orientation: PdfPageOrientation
): PageDimensions {
  if (pageSize === 'fit-image') {
    if (orientation === 'portrait' && imageWidth > imageHeight) {
      return { width: imageHeight, height: imageWidth }
    }

    if (orientation === 'landscape' && imageHeight > imageWidth) {
      return { width: imageHeight, height: imageWidth }
    }

    return { width: imageWidth, height: imageHeight }
  }

  const preset = PAGE_PRESETS[pageSize]

  if (orientation === 'landscape') {
    return { width: preset.height, height: preset.width }
  }

  if (orientation === 'portrait') {
    return { width: preset.width, height: preset.height }
  }

  const isLandscapeImage = imageWidth > imageHeight
  return isLandscapeImage
    ? { width: preset.height, height: preset.width }
    : { width: preset.width, height: preset.height }
}

export function getImagePlacement(
  page: PageDimensions,
  imageWidth: number,
  imageHeight: number,
  margin: number,
  fit: PdfImageFit
): Placement {
  const safeMargin = normalizeMargin(margin)
  const availableWidth = Math.max(page.width - safeMargin * 2, 1)
  const availableHeight = Math.max(page.height - safeMargin * 2, 1)
  const widthRatio = availableWidth / imageWidth
  const heightRatio = availableHeight / imageHeight
  const ratio = fit === 'cover'
    ? Math.max(widthRatio, heightRatio)
    : Math.min(widthRatio, heightRatio)
  const width = imageWidth * ratio
  const height = imageHeight * ratio

  return {
    x: (page.width - width) / 2,
    y: (page.height - height) / 2,
    width,
    height,
  }
}

export async function convertImagesToPdf(
  images: ImageToPdfInput[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('Add at least one JPG or PNG image before creating the PDF.')
  }

  const pdfDocument = await PDFDocument.create()
  pdfDocument.setCreator(options.creator ?? 'UtilityHub JPG to PDF')
  pdfDocument.setProducer('UtilityHub')
  pdfDocument.setCreationDate(new Date())

  if (options.title) {
    pdfDocument.setTitle(options.title)
  }

  for (const image of images) {
    const imageBytes = toUint8Array(image.bytes)
    const embeddedImage = image.mimeType === 'image/png'
      ? await pdfDocument.embedPng(imageBytes)
      : await pdfDocument.embedJpg(imageBytes)

    const pageDimensions = getPdfPageDimensions(
      embeddedImage.width,
      embeddedImage.height,
      options.pageSize,
      options.orientation
    )

    const page = pdfDocument.addPage([pageDimensions.width, pageDimensions.height])
    const placement = getImagePlacement(
      pageDimensions,
      embeddedImage.width,
      embeddedImage.height,
      options.margin,
      options.imageFit
    )

    page.drawImage(embeddedImage, placement)
  }

  return Uint8Array.from(await pdfDocument.save())
}
