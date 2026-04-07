import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface TextWatermarkOptions {
  content: string
  color: string
  fontSize: number
}

export interface ImageWatermarkOptions {
  bytes: ArrayBuffer | Uint8Array
  mimeType: 'image/png' | 'image/jpeg'
  scale: number
}

export interface PdfWatermarkOptions {
  position: WatermarkPosition
  opacity: number
  rotation: number
  margin: number
  pageNumbers?: number[]
  text?: TextWatermarkOptions
  image?: ImageWatermarkOptions
  title?: string
  creator?: string
}

interface TextLayout {
  lines: string[]
  width: number
  height: number
  lineWidths: number[]
  lineHeight: number
}

interface Placement {
  x: number
  y: number
}

function toUint8Array(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}

function normalizeOpacity(opacity: number) {
  return Math.max(0.1, Math.min(opacity, 1))
}

function normalizeScale(scale: number) {
  return Math.max(0.1, Math.min(scale, 0.7))
}

export function hexToRgbParts(hex: string) {
  const normalized = hex.replace('#', '')
  const parsed = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized

  const value = Number.parseInt(parsed, 16)

  if (!Number.isInteger(value)) {
    throw new Error('Enter a valid watermark color.')
  }

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  }
}

export function getWatermarkPlacement(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  contentWidth: number,
  contentHeight: number,
  margin: number
): Placement {
  const safeMargin = Math.max(0, margin)

  if (position === 'top-left') {
    return { x: safeMargin, y: pageHeight - contentHeight - safeMargin }
  }

  if (position === 'top-center') {
    return { x: (pageWidth - contentWidth) / 2, y: pageHeight - contentHeight - safeMargin }
  }

  if (position === 'top-right') {
    return { x: pageWidth - contentWidth - safeMargin, y: pageHeight - contentHeight - safeMargin }
  }

  if (position === 'center-left') {
    return { x: safeMargin, y: (pageHeight - contentHeight) / 2 }
  }

  if (position === 'center') {
    return { x: (pageWidth - contentWidth) / 2, y: (pageHeight - contentHeight) / 2 }
  }

  if (position === 'center-right') {
    return { x: pageWidth - contentWidth - safeMargin, y: (pageHeight - contentHeight) / 2 }
  }

  if (position === 'bottom-left') {
    return { x: safeMargin, y: safeMargin }
  }

  if (position === 'bottom-center') {
    return { x: (pageWidth - contentWidth) / 2, y: safeMargin }
  }

  return { x: pageWidth - contentWidth - safeMargin, y: safeMargin }
}

function createTextLayout(content: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, fontSize: number): TextLayout | null {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const lineHeight = font.heightAtSize(fontSize) * 1.2
  const lineWidths = lines.map(line => font.widthOfTextAtSize(line, fontSize))

  return {
    lines,
    width: Math.max(...lineWidths, 0),
    height: lineHeight * lines.length,
    lineWidths,
    lineHeight,
  }
}

function resolvePageNumbers(pageCount: number, pageNumbers?: number[]) {
  if (!pageNumbers || pageNumbers.length === 0) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const normalized = Array.from(new Set(pageNumbers)).sort((left, right) => left - right)

  normalized.forEach(pageNumber => {
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Page ${pageNumber} is outside the document bounds.`)
    }
  })

  return normalized
}

export async function applyPdfWatermark(
  sourceBytes: ArrayBuffer | Uint8Array,
  options: PdfWatermarkOptions
): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.load(toUint8Array(sourceBytes))
  const pageNumbers = resolvePageNumbers(pdfDocument.getPageCount(), options.pageNumbers)
  const textContent = options.text?.content.trim() ?? ''

  if (!textContent && !options.image) {
    throw new Error('Add watermark text or choose an image first.')
  }

  if (options.title) {
    pdfDocument.setTitle(options.title)
  }

  pdfDocument.setCreator(options.creator ?? 'UtilityHub PDF Watermark')
  pdfDocument.setProducer('UtilityHub')
  pdfDocument.setModificationDate(new Date())

  const font = textContent ? await pdfDocument.embedFont(StandardFonts.HelveticaBold) : null
  const textLayout = font && options.text
    ? createTextLayout(textContent, font, options.text.fontSize)
    : null

  let embeddedImage: Awaited<ReturnType<PDFDocument['embedPng']>> | Awaited<ReturnType<PDFDocument['embedJpg']>> | null = null

  if (options.image) {
    const imageBytes = toUint8Array(options.image.bytes)
    embeddedImage = options.image.mimeType === 'image/png'
      ? await pdfDocument.embedPng(imageBytes)
      : await pdfDocument.embedJpg(imageBytes)
  }

  const opacity = normalizeOpacity(options.opacity)
  const margin = Math.max(0, options.margin)
  const textColor = options.text ? hexToRgbParts(options.text.color) : null
  const rotation = degrees(options.rotation)
  const gap = embeddedImage && textLayout ? 12 : 0

  pageNumbers.forEach(pageNumber => {
    const page = pdfDocument.getPage(pageNumber - 1)
    const { width, height } = page.getSize()
    const imageScale = options.image ? normalizeScale(options.image.scale) : 0
    const imageDimensions = embeddedImage
      ? (() => {
          const fitRatio = Math.min(
            (width * imageScale) / embeddedImage.width,
            (height * imageScale) / embeddedImage.height
          )

          return {
            width: embeddedImage.width * fitRatio,
            height: embeddedImage.height * fitRatio,
          }
        })()
      : null

    const blockWidth = Math.max(imageDimensions?.width ?? 0, textLayout?.width ?? 0)
    const blockHeight = (imageDimensions?.height ?? 0) + (textLayout?.height ?? 0) + gap
    const placement = getWatermarkPlacement(
      options.position,
      width,
      height,
      blockWidth,
      blockHeight,
      margin
    )

    if (imageDimensions && embeddedImage) {
      page.drawImage(embeddedImage, {
        x: placement.x + (blockWidth - imageDimensions.width) / 2,
        y: placement.y + (textLayout ? textLayout.height + gap : 0),
        width: imageDimensions.width,
        height: imageDimensions.height,
        opacity,
        rotate: rotation,
      })
    }

    if (textLayout && font && textColor) {
      textLayout.lines.forEach((line, index) => {
        page.drawText(line, {
          x: placement.x + (blockWidth - textLayout.lineWidths[index]) / 2,
          y: placement.y + textLayout.height - ((index + 1) * textLayout.lineHeight),
          size: options.text?.fontSize ?? 28,
          font,
          color: rgb(textColor.r, textColor.g, textColor.b),
          opacity,
          rotate: rotation,
        })
      })
    }
  })

  return Uint8Array.from(await pdfDocument.save())
}
