'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  CalendarDays,
  ClipboardSignature,
  Image as ImageIcon,
  RotateCcw,
  Type,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AnimatedUploadProgressCard } from '@/components/tools/shared/AnimatedUploadProgressCard'
import { ToolPageIntro } from '@/components/tools/shared/ToolPageIntro'
import { ToolStatGrid } from '@/components/tools/shared/ToolStatGrid'
import { createPdfDownloadName, formatFileSize, parsePageRanges } from '@/lib/page-ranges'
import { isPdfFile, PDF_FILE_ACCEPT } from '@/lib/pdf-files'
import { loadPdfLib } from '@/lib/pdf-runtime'
import { readFileAsArrayBufferWithProgress } from '@/lib/browser-file-reader'

type SignatureMode = 'type' | 'draw' | 'upload'
type PageMode = 'last' | 'all' | 'custom'
type SignaturePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

interface PdfFileInfo {
  file: File
  pageCount: number
}

interface UploadedSignature {
  file: File
  previewUrl: string
  mimeType: 'image/png' | 'image/jpeg'
}

interface SigningResult {
  fileName: string
  pageCount: number
  size: number
  url: string
}

interface SignaturePlacement {
  x: number
  y: number
}

const MAX_PDF_SIZE = 100 * 1024 * 1024
const MAX_SIGNATURE_IMAGE_SIZE = 10 * 1024 * 1024
const SIGNATURE_FONT_STACK = '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive'

const positionGroups: SignaturePosition[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
]

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatSignDate(value: string) {
  if (!value) {
    return ''
  }

  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function getSignaturePlacement(
  position: SignaturePosition,
  pageWidth: number,
  pageHeight: number,
  contentWidth: number,
  contentHeight: number,
  margin: number
): SignaturePlacement {
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

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(nextBlob => {
      if (!nextBlob) {
        reject(new Error('Unable to create a signature image from the current canvas.'))
        return
      }

      resolve(nextBlob)
    }, 'image/png')
  })

  return new Uint8Array(await blob.arrayBuffer())
}

async function renderTypedSignature(text: string) {
  const previewCanvas = document.createElement('canvas')
  const previewContext = previewCanvas.getContext('2d')

  if (!previewContext) {
    throw new Error('Your browser could not prepare the signature preview.')
  }

  const fontSize = 92
  const paddingX = 44

  previewContext.font = `${fontSize}px ${SIGNATURE_FONT_STACK}`
  const metrics = previewContext.measureText(text)
  const width = Math.max(320, Math.ceil(metrics.width + paddingX * 2))
  const height = 180

  previewCanvas.width = width
  previewCanvas.height = height

  const context = previewCanvas.getContext('2d')

  if (!context) {
    throw new Error('Your browser could not render the typed signature.')
  }

  context.clearRect(0, 0, width, height)
  context.font = `${fontSize}px ${SIGNATURE_FONT_STACK}`
  context.fillStyle = '#0f172a'
  context.textBaseline = 'middle'
  context.fillText(text, paddingX, height / 2)

  return canvasToPngBytes(previewCanvas)
}

function getImageMimeType(file: File) {
  if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
    return 'image/png' as const
  }

  if (file.type === 'image/jpeg' || file.type === 'image/jpg' || /\.(jpe?g)$/i.test(file.name)) {
    return 'image/jpeg' as const
  }

  return null
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10)
}

export function PDFSigner() {
  const [pdfFile, setPdfFile] = useState<PdfFileInfo | null>(null)
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('type')
  const [typedSignature, setTypedSignature] = useState('Alex Martin')
  const [uploadedSignature, setUploadedSignature] = useState<UploadedSignature | null>(null)
  const [signerName, setSignerName] = useState('')
  const [includeDate, setIncludeDate] = useState(true)
  const [signDate, setSignDate] = useState(getTodayValue())
  const [pageMode, setPageMode] = useState<PageMode>('last')
  const [pageRanges, setPageRanges] = useState('')
  const [position, setPosition] = useState<SignaturePosition>('bottom-right')
  const [signatureScale, setSignatureScale] = useState(0.28)
  const [opacity, setOpacity] = useState(1)
  const [margin, setMargin] = useState(28)
  const [isPreparingPdf, setIsPreparingPdf] = useState(false)
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0)
  const [pdfUploadStatus, setPdfUploadStatus] = useState('Waiting for a file')
  const [uploadingPdfName, setUploadingPdfName] = useState('')
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SigningResult | null>(null)

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  useEffect(() => {
    return () => {
      if (uploadedSignature?.previewUrl) {
        URL.revokeObjectURL(uploadedSignature.previewUrl)
      }
    }
  }, [uploadedSignature])

  useEffect(() => {
    const canvas = signatureCanvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#0f172a'
    context.lineWidth = 4
  }, [])

  const clearResult = () => {
    setResult(currentResult => {
      if (currentResult?.url) {
        URL.revokeObjectURL(currentResult.url)
      }

      return null
    })
  }

  const selectedPageSummary = useMemo(() => {
    if (!pdfFile) {
      return 'No PDF'
    }

    if (pageMode === 'last') {
      return 'Last page'
    }

    if (pageMode === 'all') {
      return 'All pages'
    }

    return pageRanges.trim() || 'Custom range'
  }, [pageMode, pageRanges, pdfFile])

  const captionSummary = useMemo(() => {
    const parts = [
      signerName.trim() ? 'Name' : null,
      includeDate ? 'Date' : null,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' + ') : 'Signature only'
  }, [includeDate, signerName])

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    clearResult()

    if (!file) {
      setPdfFile(null)
      return
    }

    if (!isPdfFile(file)) {
      setError('Please choose a PDF file.')
      return
    }

    if (file.size > MAX_PDF_SIZE) {
      setError('PDF size must stay under 100MB for browser-based signing.')
      return
    }

    try {
      setIsPreparingPdf(true)
      setUploadingPdfName(file.name)
      setPdfUploadStatus('Pulling your PDF into the signing studio...')
      setPdfUploadProgress(4)

      const sourceBytes = await readFileAsArrayBufferWithProgress(file, progress => {
        setPdfUploadProgress(Math.max(6, Math.min(Math.round(progress * 0.74), 76)))
      })

      setPdfUploadStatus('Analyzing pages and signature space...')
      setPdfUploadProgress(84)
      await wait(120)

      const { PDFDocument } = await loadPdfLib()
      const pdfDocument = await PDFDocument.load(sourceBytes)
      const pageCount = pdfDocument.getPageCount()
      setPdfUploadStatus('Almost ready. Warming up the signing canvas...')
      setPdfUploadProgress(100)
      await wait(220)

      setPdfFile({ file, pageCount })
      setPageRanges(pageCount > 1 ? `${Math.max(1, pageCount - 1)}-${pageCount}` : '1')
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read this PDF.')
      setPdfFile(null)
    } finally {
      setIsPreparingPdf(false)
    }
  }

  const handleSignatureImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    clearResult()

    if (!file) {
      setUploadedSignature(currentSignature => {
        if (currentSignature?.previewUrl) {
          URL.revokeObjectURL(currentSignature.previewUrl)
        }

        return null
      })
      return
    }

    const mimeType = getImageMimeType(file)

    if (!mimeType) {
      setError('Signature image uploads support PNG and JPG files.')
      return
    }

    if (file.size > MAX_SIGNATURE_IMAGE_SIZE) {
      setError('Signature image size must stay under 10MB.')
      return
    }

    setUploadedSignature(currentSignature => {
      if (currentSignature?.previewUrl) {
        URL.revokeObjectURL(currentSignature.previewUrl)
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
        mimeType,
      }
    })
  }

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const scaleX = canvas.width / bounds.width
    const scaleY = canvas.height / bounds.height

    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    }
  }

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const point = getCanvasPoint(event)
    isDrawingRef.current = true
    setHasDrawnSignature(true)
    clearResult()
    setError(null)
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return
    }

    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const point = getCanvasPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return
    }

    const canvas = signatureCanvasRef.current

    isDrawingRef.current = false
    canvas?.releasePointerCapture(event.pointerId)
  }

  const clearDrawnSignature = () => {
    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawnSignature(false)
    clearResult()
    setError(null)
  }

  const buildSignatureAsset = async () => {
    if (signatureMode === 'type') {
      const trimmedSignature = typedSignature.trim()

      if (!trimmedSignature) {
        throw new Error('Type a signature before applying it to the PDF.')
      }

      return {
        bytes: await renderTypedSignature(trimmedSignature),
        mimeType: 'image/png' as const,
      }
    }

    if (signatureMode === 'draw') {
      const canvas = signatureCanvasRef.current

      if (!canvas || !hasDrawnSignature) {
        throw new Error('Draw your signature before applying it to the PDF.')
      }

      return {
        bytes: await canvasToPngBytes(canvas),
        mimeType: 'image/png' as const,
      }
    }

    if (!uploadedSignature) {
      throw new Error('Upload a signature image before applying it to the PDF.')
    }

    return {
      bytes: new Uint8Array(await uploadedSignature.file.arrayBuffer()),
      mimeType: uploadedSignature.mimeType,
    }
  }

  const handleSignPdf = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before signing it.')
      return
    }

    setIsProcessing(true)
    setError(null)
    clearResult()

    try {
      const { PDFDocument, StandardFonts, rgb } = await loadPdfLib()
      const signatureAsset = await buildSignatureAsset()
      const sourceBytes = await pdfFile.file.arrayBuffer()
      const pdfDocument = await PDFDocument.load(sourceBytes)
      const selectedPages = pageMode === 'last'
        ? [pdfFile.pageCount]
        : pageMode === 'all'
          ? Array.from({ length: pdfFile.pageCount }, (_, index) => index + 1)
          : parsePageRanges(pageRanges, pdfFile.pageCount)

      const signatureImage = signatureAsset.mimeType === 'image/png'
        ? await pdfDocument.embedPng(signatureAsset.bytes)
        : await pdfDocument.embedJpg(signatureAsset.bytes)

      const resolvedSignerName = signerName.trim()
      const captionLines = [
        resolvedSignerName || null,
        includeDate ? formatSignDate(signDate) : null,
      ].filter((line): line is string => Boolean(line))
      const captionFont = captionLines.length > 0
        ? await pdfDocument.embedFont(StandardFonts.Helvetica)
        : null
      const safeScale = clamp(signatureScale, 0.12, 0.45)
      const safeOpacity = clamp(opacity, 0.5, 1)
      const safeMargin = clamp(margin, 0, 96)

      selectedPages.forEach(pageNumber => {
        const page = pdfDocument.getPage(pageNumber - 1)
        const { width, height } = page.getSize()

        let imageWidth = Math.min(width * safeScale, width - safeMargin * 2)
        let imageHeight = imageWidth * (signatureImage.height / signatureImage.width)
        const maxImageHeight = height * 0.22

        if (imageHeight > maxImageHeight) {
          const fitRatio = maxImageHeight / imageHeight
          imageHeight *= fitRatio
          imageWidth *= fitRatio
        }

        const captionFontSize = 10
        const captionLineHeight = captionFont ? captionFont.heightAtSize(captionFontSize) * 1.25 : 0
        const captionWidths = captionFont
          ? captionLines.map(line => captionFont.widthOfTextAtSize(line, captionFontSize))
          : []
        const captionHeight = captionFont && captionLines.length > 0
          ? (captionLines.length * captionLineHeight) + 8
          : 0
        const blockWidth = Math.max(imageWidth, ...captionWidths, 0)
        const blockHeight = imageHeight + captionHeight
        const placement = getSignaturePlacement(position, width, height, blockWidth, blockHeight, safeMargin)

        page.drawImage(signatureImage, {
          x: placement.x + ((blockWidth - imageWidth) / 2),
          y: placement.y + captionHeight,
          width: imageWidth,
          height: imageHeight,
          opacity: safeOpacity,
        })

        if (captionFont && captionLines.length > 0) {
          captionLines.forEach((line, index) => {
            page.drawText(line, {
              x: placement.x + ((blockWidth - captionWidths[index]) / 2),
              y: placement.y + captionHeight - ((index + 1) * captionLineHeight),
              size: captionFontSize,
              font: captionFont,
              color: rgb(0.2, 0.23, 0.32),
              opacity: Math.min(1, safeOpacity + 0.05),
            })
          })
        }
      })

      const pdfBytes = await pdfDocument.save()
      const safeBytes = Uint8Array.from(pdfBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setResult({
        fileName: createPdfDownloadName(pdfFile.file.name, 'signed'),
        pageCount: selectedPages.length,
        size: blob.size,
        url,
      })
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'Unable to sign the PDF.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <ToolPageIntro
        title="Sign PDF"
        description="Add a professional signature to a PDF with a typed, drawn, or uploaded signature, then place it exactly where it belongs without leaving your browser."
        features={[
          { label: 'Typed, drawn, or uploaded', tone: 'primary' },
          { label: 'Last page or custom ranges', tone: 'success' },
          { label: 'Private in-browser signing', tone: 'warning' },
        ]}
      />

      <ToolStatGrid
        items={[
          { label: 'PDF pages', value: pdfFile ? String(pdfFile.pageCount) : '0', tone: 'primary' },
          { label: 'Apply to', value: selectedPageSummary, tone: 'info' },
          { label: 'Caption', value: captionSummary, tone: 'warning' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Upload and Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isPreparingPdf ? (
              <AnimatedUploadProgressCard
                progress={pdfUploadProgress}
                fileName={uploadingPdfName || 'Preparing PDF'}
                title="Building your signing workspace"
                status={pdfUploadStatus}
                caption="Counting pages, checking the file, and getting the canvas ready so signing feels instant."
              />
            ) : (
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input
                  type="file"
                  accept={PDF_FILE_ACCEPT}
                  className="hidden"
                  onChange={handlePdfChange}
                  aria-label="Select PDF file"
                />
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  Great for contracts, proposals, onboarding documents, and approval pages.
                </span>
              </label>
            )}

            {pdfFile ? (
              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="font-medium text-foreground">{pdfFile.file.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pdfFile.pageCount} pages · {formatFileSize(pdfFile.file.size)}
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Signature mode</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { id: 'type', label: 'Type', icon: <Type className="h-4 w-4" /> },
                  { id: 'draw', label: 'Draw', icon: <ClipboardSignature className="h-4 w-4" /> },
                  { id: 'upload', label: 'Upload', icon: <ImageIcon className="h-4 w-4" /> },
                ] as Array<{ id: SignatureMode; label: string; icon: React.ReactNode }>).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSignatureMode(option.id)
                      clearResult()
                      setError(null)
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                      signatureMode === option.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {option.icon}
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {signatureMode === 'type' ? (
              <div className="space-y-4 rounded-3xl border border-border bg-background p-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Typed signature</label>
                  <input
                    value={typedSignature}
                    onChange={event => {
                      setTypedSignature(event.target.value)
                      clearResult()
                      setError(null)
                    }}
                    className="form-input"
                    placeholder="Alex Martin"
                  />
                </div>

                <div className="rounded-3xl border border-primary/15 bg-white px-6 py-8 text-center shadow-sm">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
                  <p
                    className="break-words text-4xl text-slate-900 sm:text-5xl"
                    style={{ fontFamily: SIGNATURE_FONT_STACK }}
                  >
                    {typedSignature.trim() || 'Your signature'}
                  </p>
                </div>
              </div>
            ) : null}

            {signatureMode === 'draw' ? (
              <div className="space-y-4 rounded-3xl border border-border bg-background p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Draw your signature</p>
                    <p className="mt-1 text-sm text-muted-foreground">Use your mouse, trackpad, or finger to sign naturally.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearDrawnSignature} leftIcon={<RotateCcw className="h-4 w-4" />}>
                    Clear
                  </Button>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-[linear-gradient(180deg,transparent_0%,transparent_48%,rgba(148,163,184,0.12)_48%,rgba(148,163,184,0.12)_52%,transparent_52%,transparent_100%)]">
                  <canvas
                    ref={signatureCanvasRef}
                    width={900}
                    height={260}
                    className="h-52 w-full touch-none"
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerUp}
                  />
                  {!hasDrawnSignature ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Start drawing anywhere in this box.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {signatureMode === 'upload' ? (
              <div className="space-y-4 rounded-3xl border border-border bg-background p-5">
                <label className="block rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary/40">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleSignatureImageChange}
                    aria-label="Select signature image"
                  />
                  <span className="block text-sm font-medium text-foreground">Upload a transparent PNG or JPG signature</span>
                  <span className="mt-2 block text-xs text-muted-foreground">Ideal if you already have a scanned signature or signature stamp.</span>
                </label>

                {uploadedSignature ? (
                  <div className="rounded-3xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="overflow-hidden rounded-2xl border border-border bg-white p-3">
                        <Image
                          src={uploadedSignature.previewUrl}
                          alt={uploadedSignature.file.name}
                          width={320}
                          height={140}
                          unoptimized
                          className="h-auto w-full max-w-[240px] object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-foreground">{uploadedSignature.file.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {uploadedSignature.mimeType === 'image/png' ? 'PNG' : 'JPG'} · {formatFileSize(uploadedSignature.file.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Signing Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Signer name label</label>
                <input
                  value={signerName}
                  onChange={event => {
                    setSignerName(event.target.value)
                    clearResult()
                    setError(null)
                  }}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Signing date
                </label>
                <input
                  type="date"
                  value={signDate}
                  onChange={event => {
                    setSignDate(event.target.value)
                    clearResult()
                    setError(null)
                  }}
                  className="form-input"
                  disabled={!includeDate}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={event => {
                  setIncludeDate(event.target.checked)
                  clearResult()
                  setError(null)
                }}
                className="h-4 w-4 rounded border border-input"
              />
              <span className="text-sm text-foreground">Include the signing date under the signature</span>
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Apply signature to</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { id: 'last', label: 'Last page' },
                  { id: 'all', label: 'All pages' },
                  { id: 'custom', label: 'Custom range' },
                ] as Array<{ id: PageMode; label: string }>).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setPageMode(option.id)
                      clearResult()
                      setError(null)
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      pageMode === option.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {pageMode === 'custom' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Page ranges</label>
                <input
                  value={pageRanges}
                  onChange={event => {
                    setPageRanges(event.target.value)
                    clearResult()
                    setError(null)
                  }}
                  placeholder="Example: 1, 3, 6-8"
                  className="form-input"
                />
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Placement</label>
              <div className="grid gap-2">
                {positionGroups.map((group, rowIndex) => (
                  <div key={`sign-position-row-${rowIndex}`} className="grid grid-cols-3 gap-2">
                    {group.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setPosition(option)
                          clearResult()
                          setError(null)
                        }}
                        className={`rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-colors sm:px-3 sm:text-sm ${
                          position === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {option.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Size</label>
                <input
                  type="number"
                  min={0.12}
                  max={0.45}
                  step={0.02}
                  value={signatureScale}
                  onChange={event => {
                    setSignatureScale(Number.parseFloat(event.target.value || '0.28'))
                    clearResult()
                    setError(null)
                  }}
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Opacity</label>
                <input
                  type="number"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={event => {
                    setOpacity(Number.parseFloat(event.target.value || '1'))
                    clearResult()
                    setError(null)
                  }}
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Margin</label>
                <input
                  type="number"
                  min={0}
                  max={96}
                  value={margin}
                  onChange={event => {
                    setMargin(Number.parseInt(event.target.value || '28', 10))
                    clearResult()
                    setError(null)
                  }}
                  className="form-input"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
              Default workflow: sign the last page, place the signature in the lower-right corner, and add the current date.
            </div>

            <Button
              type="button"
              onClick={handleSignPdf}
              isLoading={isProcessing}
              disabled={!pdfFile}
              className="w-full"
              leftIcon={<ClipboardSignature className="h-4 w-4" />}
            >
              Sign PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="mt-6 border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-2xl">Signed PDF Ready</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-foreground">{result.fileName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed on {result.pageCount} page{result.pageCount === 1 ? '' : 's'} · {formatFileSize(result.size)}
              </p>
            </div>
            <a href={result.url} download={result.fileName} className="w-full md:w-auto" aria-label="Download signed PDF">
              <Button type="button" className="w-full md:w-auto">Download signed PDF</Button>
            </a>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
