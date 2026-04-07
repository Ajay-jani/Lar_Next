'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Download, FileImage, Upload } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatFileSize, parsePageRanges } from '@/lib/page-ranges'
import { createImageZip } from '@/lib/image-zip'

type RangeMode = 'all' | 'custom'

interface PdfFileInfo {
  file: File
  pageCount: number
}

interface ConversionResult {
  fileName: string
  imageCount: number
  size: number
  url: string
}

interface PdfJsPageProxy {
  getViewport: (_params: { scale: number }) => { width: number; height: number }
  render: (_params: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => { promise: Promise<void> }
}

interface PdfJsDocumentProxy {
  numPages: number
  getPage: (_pageNumber: number) => Promise<PdfJsPageProxy>
  destroy?: () => void
}

interface PdfJsModule {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (_source: { data: ArrayBuffer }) => { promise: Promise<PdfJsDocumentProxy> }
}

const MAX_FILE_SIZE = 100 * 1024 * 1024
const pdfJsUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'
const pdfJsWorkerUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

async function loadPdfJs() {
  const pdfjs = await import(/* webpackIgnore: true */ pdfJsUrl) as unknown as PdfJsModule
  pdfjs.GlobalWorkerOptions.workerSrc = pdfJsWorkerUrl
  return pdfjs
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to convert a rendered page into a JPG image.'))
        return
      }

      blob.arrayBuffer()
        .then(buffer => resolve(new Uint8Array(buffer)))
        .catch(reject)
    }, 'image/jpeg', quality)
  })
}

export function PDFToJPG() {
  const [pdfFile, setPdfFile] = useState<PdfFileInfo | null>(null)
  const [rangeMode, setRangeMode] = useState<RangeMode>('all')
  const [pageRanges, setPageRanges] = useState('')
  const [scale, setScale] = useState(1.5)
  const [quality, setQuality] = useState(0.9)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConversionResult | null>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const fileSummary = useMemo(() => {
    if (!pdfFile) {
      return null
    }

    return `${pdfFile.pageCount} pages · ${formatFileSize(pdfFile.file.size)}`
  }, [pdfFile])

  const clearResult = () => {
    setResult(currentResult => {
      if (currentResult?.url) {
        URL.revokeObjectURL(currentResult.url)
      }

      return null
    })
  }

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    setProgress(0)
    clearResult()

    if (!file) {
      setPdfFile(null)
      return
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('PDF size must stay under 100MB for browser-based conversion.')
      return
    }

    try {
      const sourceBytes = await file.arrayBuffer()
      const pdfDocument = await PDFDocument.load(sourceBytes)
      const pageCount = pdfDocument.getPageCount()

      setPdfFile({ file, pageCount })
      setPageRanges(pageCount > 10 ? '1-10' : `1-${pageCount}`)
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read this PDF.')
      setPdfFile(null)
    }
  }

  const handleConvert = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before converting it to JPG images.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    clearResult()

    try {
      const selectedPages = rangeMode === 'all'
        ? Array.from({ length: pdfFile.pageCount }, (_, index) => index + 1)
        : parsePageRanges(pageRanges, pdfFile.pageCount)

      const pdfjs = await loadPdfJs()
      const sourceBytes = await pdfFile.file.arrayBuffer()
      const pdfDocumentProxy = await pdfjs.getDocument({ data: sourceBytes }).promise
      const imageEntries: Array<{ name: string; bytes: Uint8Array }> = []
      const safeBaseName = pdfFile.file.name.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'document'

      for (let index = 0; index < selectedPages.length; index += 1) {
        const pageNumber = selectedPages[index]
        const page = await pdfDocumentProxy.getPage(pageNumber)
        const viewport = page.getViewport({ scale })
        const canvas = window.document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Your browser could not create an image canvas for this PDF page.')
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise

        const bytes = await canvasToJpegBytes(canvas, quality)

        imageEntries.push({
          name: `${safeBaseName}-page-${String(pageNumber).padStart(4, '0')}.jpg`,
          bytes,
        })

        setProgress(Math.round(((index + 1) / selectedPages.length) * 100))
      }

      pdfDocumentProxy.destroy?.()

      const zipBytes = createImageZip(imageEntries)
      const safeZipBytes = new Uint8Array(zipBytes.byteLength)
      safeZipBytes.set(zipBytes)
      const blob = new Blob([safeZipBytes.buffer], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)

      setResult({
        fileName: `${safeBaseName}-jpg-images.zip`,
        imageCount: imageEntries.length,
        size: blob.size,
        url,
      })
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : 'Unable to convert the PDF pages into JPG images.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-lg">PDF to JPG</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Convert every page of a PDF into JPG images and download them in one ZIP file, built for large book-style PDFs with hundreds of pages.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">Great for scanned books, notes, and document archives.</span>
              </label>

              {pdfFile && (
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="font-medium text-foreground">{pdfFile.file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{fileSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Convert pages</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'custom'] as RangeMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRangeMode(mode)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        rangeMode === mode
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'all' ? 'All pages' : 'Custom range'}
                    </button>
                  ))}
                </div>
              </div>

              {rangeMode === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page ranges</label>
                  <input
                    value={pageRanges}
                    onChange={event => setPageRanges(event.target.value)}
                    placeholder="Example: 1-50, 75, 100-160"
                    className="form-input"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Render scale</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.25}
                    value={scale}
                    onChange={event => setScale(Number.parseFloat(event.target.value || '1.5'))}
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">JPG quality</label>
                  <input
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={event => setQuality(Number.parseFloat(event.target.value || '0.9'))}
                    className="form-input"
                  />
                </div>
              </div>

              {(isProcessing || progress > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Rendering pages</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                Output format: one JPG per page, bundled into a ZIP archive for faster download and easier sharing.
              </div>

              <Button
                type="button"
                onClick={handleConvert}
                isLoading={isProcessing}
                disabled={!pdfFile}
                className="w-full"
                leftIcon={<FileImage className="h-4 w-4" />}
              >
                Convert to JPG ZIP
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">JPG ZIP Ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.imageCount} image{result.imageCount === 1 ? '' : 's'} · {formatFileSize(result.size)}
                </p>
              </div>
              <a href={result.url} download={result.fileName}>
                <Button type="button" leftIcon={<Download className="h-4 w-4" />}>Download ZIP</Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
