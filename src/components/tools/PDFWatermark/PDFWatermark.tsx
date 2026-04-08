'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, RotateCw, Stamp, Type, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize, parsePageRanges } from '@/lib/page-ranges'
import { isPdfFile, PDF_FILE_ACCEPT } from '@/lib/pdf-files'
import { loadPdfLib, loadPdfWatermarkModule } from '@/lib/pdf-runtime'
import type { WatermarkPosition } from '@/lib/pdf-watermark'

interface PDFFileInfo {
  file: File
  pageCount: number
}

interface ImageWatermarkInfo {
  file: File
  mimeType: 'image/png' | 'image/jpeg'
}

interface WatermarkResult {
  fileName: string
  size: number
  pageCount: number
  url: string
}

type RangeMode = 'all' | 'custom'

const MAX_PDF_SIZE = 100 * 1024 * 1024
const MAX_IMAGE_SIZE = 20 * 1024 * 1024

const positionGroups: WatermarkPosition[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
]

const rotationOptions = [0, 30, 45, 90]

export function PDFWatermark() {
  const [pdfFile, setPdfFile] = useState<PDFFileInfo | null>(null)
  const [imageWatermark, setImageWatermark] = useState<ImageWatermarkInfo | null>(null)
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [rangeMode, setRangeMode] = useState<RangeMode>('all')
  const [pageRanges, setPageRanges] = useState('')
  const [position, setPosition] = useState<WatermarkPosition>('center')
  const [fontSize, setFontSize] = useState(28)
  const [imageScale, setImageScale] = useState(0.22)
  const [opacity, setOpacity] = useState(0.5)
  const [rotation, setRotation] = useState(45)
  const [margin, setMargin] = useState(24)
  const [color, setColor] = useState('#334155')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WatermarkResult | null>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const pdfSummary = useMemo(() => {
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
      setError('PDF size must stay under 100MB for browser-based watermarking.')
      return
    }

    try {
      const { PDFDocument } = await loadPdfLib()
      const sourceBytes = await file.arrayBuffer()
      const pdfDocument = await PDFDocument.load(sourceBytes)
      const pageCount = pdfDocument.getPageCount()

      setPdfFile({ file, pageCount })
      setPageRanges(pageCount > 3 ? '1-3' : `1-${pageCount}`)
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read this PDF.')
      setPdfFile(null)
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    clearResult()

    if (!file) {
      setImageWatermark(null)
      return
    }

    const normalizedType = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
      ? 'image/png'
      : file.type === 'image/jpeg' || file.type === 'image/jpg' || /\.(jpe?g)$/i.test(file.name)
        ? 'image/jpeg'
        : null

    if (!normalizedType) {
      setError('Watermark images currently support PNG and JPG files.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Watermark image size must stay under 20MB.')
      return
    }

    setImageWatermark({
      file,
      mimeType: normalizedType,
    })
  }

  const handleApplyWatermark = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before adding a watermark.')
      return
    }

    if (!watermarkText.trim() && !imageWatermark) {
      setError('Add watermark text, choose an image, or use both.')
      return
    }

    setIsProcessing(true)
    setError(null)
    clearResult()

    try {
      const { applyPdfWatermark } = await loadPdfWatermarkModule()
      const pageNumbers = rangeMode === 'all'
        ? undefined
        : parsePageRanges(pageRanges, pdfFile.pageCount)

      const sourceBytes = await pdfFile.file.arrayBuffer()
      const imageBytes = imageWatermark ? await imageWatermark.file.arrayBuffer() : null
      const outputBytes = await applyPdfWatermark(sourceBytes, {
        position,
        opacity,
        rotation,
        margin,
        pageNumbers,
        text: watermarkText.trim()
          ? {
              content: watermarkText,
              color,
              fontSize,
            }
          : undefined,
        image: imageBytes && imageWatermark
          ? {
              bytes: imageBytes,
              mimeType: imageWatermark.mimeType,
              scale: imageScale,
            }
          : undefined,
        title: createPdfDownloadName(pdfFile.file.name, 'watermarked').replace(/\.pdf$/i, ''),
      })

      const safeBytes = Uint8Array.from(outputBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setResult({
        fileName: createPdfDownloadName(pdfFile.file.name, 'watermarked'),
        size: blob.size,
        pageCount: pdfFile.pageCount,
        url,
      })
    } catch (watermarkError) {
      setError(watermarkError instanceof Error ? watermarkError.message : 'Unable to apply the watermark.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-lg">PDF Watermark</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Add text or image watermarks to a full PDF or selected pages with iLovePDF-style controls for position, opacity, and rotation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input type="file" accept={PDF_FILE_ACCEPT} className="hidden" onChange={handlePdfChange} />
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">Processed locally in your browser, up to 100MB.</span>
              </label>

              {pdfFile && (
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="font-medium text-foreground">{pdfFile.file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pdfSummary}</p>
                </div>
              )}

              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Optional image watermark</p>
                </div>
                <label className="block rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center transition-colors hover:border-primary/40">
                  <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" className="hidden" onChange={handleImageChange} />
                  <span className="block text-sm font-medium text-foreground">Choose PNG or JPG</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Great for signatures, seals, or logos.</span>
                </label>

                {imageWatermark && (
                  <div className="mt-4 rounded-2xl bg-muted/35 p-4">
                    <p className="font-medium text-foreground">{imageWatermark.file.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {imageWatermark.mimeType === 'image/png' ? 'PNG' : 'JPG'} · {formatFileSize(imageWatermark.file.size)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Watermark Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Type className="h-4 w-4" />
                  Watermark text
                </label>
                <textarea
                  value={watermarkText}
                  onChange={event => setWatermarkText(event.target.value)}
                  rows={4}
                  placeholder="Example: CONFIDENTIAL"
                  className="form-input min-h-[120px] resize-y"
                />
                <p className="text-sm text-muted-foreground">
                  Use text, an image, or both together just like the iLovePDF watermark workflow.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Apply to</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Text color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={event => setColor(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-2"
                  />
                </div>
              </div>

              {rangeMode === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page ranges</label>
                  <input
                    value={pageRanges}
                    onChange={event => setPageRanges(event.target.value)}
                    placeholder="Example: 1-3, 5, 9-12"
                    className="form-input"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Stamp className="h-4 w-4" />
                  Position
                </label>
                <div className="grid gap-2">
                  {positionGroups.map((group, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2">
                      {group.map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setPosition(option)}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Font size</label>
                  <input
                    type="number"
                    min={10}
                    max={72}
                    value={fontSize}
                    onChange={event => setFontSize(Number.parseInt(event.target.value || '28', 10))}
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Image scale</label>
                  <input
                    type="number"
                    min={0.1}
                    max={0.7}
                    step={0.05}
                    value={imageScale}
                    onChange={event => setImageScale(Number.parseFloat(event.target.value || '0.22'))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Opacity</label>
                  <input
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={event => setOpacity(Number.parseFloat(event.target.value || '0.5'))}
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <RotateCw className="h-4 w-4" />
                    Rotation
                  </label>
                  <select
                    value={rotation}
                    onChange={event => setRotation(Number.parseInt(event.target.value, 10))}
                    className="form-input"
                  >
                    {rotationOptions.map(option => (
                      <option key={option} value={option}>
                        {option}°
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Margin</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={margin}
                    onChange={event => setMargin(Number.parseInt(event.target.value || '24', 10))}
                    className="form-input"
                  />
                </div>
              </div>

              <Button type="button" onClick={handleApplyWatermark} isLoading={isProcessing} className="w-full">
                Apply Watermark
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
              <CardTitle className="text-2xl">Watermarked PDF Ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.pageCount} pages · {formatFileSize(result.size)}
                </p>
              </div>
              <a href={result.url} download={result.fileName} className="w-full md:w-auto">
                <Button type="button">Download PDF</Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
