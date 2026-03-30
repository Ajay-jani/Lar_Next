'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize, parsePageRanges } from '@/lib/page-ranges'

type RangeMode = 'all' | 'custom'
type NumberPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

interface PDFFileInfo {
  file: File
  pageCount: number
}

interface NumberingResult {
  url: string
  fileName: string
  numberedPages: number
  size: number
}

const MAX_FILE_SIZE = 100 * 1024 * 1024

function hexToRgbParts(hex: string) {
  const normalized = hex.replace('#', '')
  const parsed = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized

  const value = Number.parseInt(parsed, 16)

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  }
}

function getNumberPosition(position: NumberPosition, width: number, height: number, textWidth: number, textHeight: number) {
  const margin = 24

  if (position === 'top-left') {
    return { x: margin, y: height - margin - textHeight }
  }

  if (position === 'top-center') {
    return { x: (width - textWidth) / 2, y: height - margin - textHeight }
  }

  if (position === 'top-right') {
    return { x: width - textWidth - margin, y: height - margin - textHeight }
  }

  if (position === 'bottom-left') {
    return { x: margin, y: margin }
  }

  if (position === 'bottom-center') {
    return { x: (width - textWidth) / 2, y: margin }
  }

  return { x: width - textWidth - margin, y: margin }
}

export function PDFPageNumberer() {
  const [pdfFile, setPdfFile] = useState<PDFFileInfo | null>(null)
  const [rangeMode, setRangeMode] = useState<RangeMode>('all')
  const [pageRanges, setPageRanges] = useState('')
  const [position, setPosition] = useState<NumberPosition>('bottom-right')
  const [fontSize, setFontSize] = useState(12)
  const [startNumber, setStartNumber] = useState(1)
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [color, setColor] = useState('#334155')
  const [result, setResult] = useState<NumberingResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const previewText = useMemo(() => `${prefix}${startNumber}${suffix}`, [prefix, startNumber, suffix])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    setResult(null)

    if (!file) {
      setPdfFile(null)
      return
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('PDF size must stay under 100MB for page numbering.')
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pageCount = pdfDoc.getPageCount()
      setPdfFile({ file, pageCount })
      setPageRanges(pageCount > 3 ? '1-3' : `1-${pageCount}`)
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read this PDF.')
      setPdfFile(null)
    }
  }

  const handleNumberPages = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before adding page numbers.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const sourceBytes = await pdfFile.file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(sourceBytes)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const selectedPages = rangeMode === 'all'
        ? Array.from({ length: pdfFile.pageCount }, (_, index) => index + 1)
        : parsePageRanges(pageRanges, pdfFile.pageCount)

      const { r, g, b } = hexToRgbParts(color)

      selectedPages.forEach((pageNumber, index) => {
        const page = pdfDoc.getPage(pageNumber - 1)
        const value = `${prefix}${startNumber + index}${suffix}`
        const textWidth = font.widthOfTextAtSize(value, fontSize)
        const textHeight = font.heightAtSize(fontSize)
        const { width, height } = page.getSize()
        const coordinates = getNumberPosition(position, width, height, textWidth, textHeight)

        page.drawText(value, {
          x: coordinates.x,
          y: coordinates.y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: 0.9,
        })
      })

      const pdfBytes = await pdfDoc.save()
      const safeBytes = Uint8Array.from(pdfBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }

      setResult({
        url,
        fileName: createPdfDownloadName(pdfFile.file.name, 'numbered'),
        numberedPages: selectedPages.length,
        size: blob.size,
      })
    } catch (numberingError) {
      setError(numberingError instanceof Error ? numberingError.message : 'Failed to add page numbers.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="heading-lg">PDF Page Numberer</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Add clear page numbers to a full PDF or only the sections you want, with control over position, numbering, and styling.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">Ideal for reports, handouts, proposals, and review drafts.</span>
              </label>

              {pdfFile && (
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="font-medium text-foreground">{pdfFile.file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pdfFile.pageCount} pages · {formatFileSize(pdfFile.file.size)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Numbering settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start at</label>
                  <input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={event => setStartNumber(Number.parseInt(event.target.value || '1', 10))}
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Font size</label>
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={fontSize}
                    onChange={event => setFontSize(Number.parseInt(event.target.value || '12', 10))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_110px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Prefix</label>
                  <input value={prefix} onChange={event => setPrefix(event.target.value)} className="form-input" placeholder="Page " />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Suffix</label>
                  <input value={suffix} onChange={event => setSuffix(event.target.value)} className="form-input" placeholder="" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Color</label>
                  <input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-2" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Position</label>
                <select value={position} onChange={event => setPosition(event.target.value as NumberPosition)} className="form-input">
                  <option value="top-left">Top left</option>
                  <option value="top-center">Top center</option>
                  <option value="top-right">Top right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-center">Bottom center</option>
                  <option value="bottom-right">Bottom right</option>
                </select>
              </div>

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

              {rangeMode === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page ranges</label>
                  <input
                    value={pageRanges}
                    onChange={event => setPageRanges(event.target.value)}
                    placeholder="Example: 1-3, 5, 8-12"
                    className="form-input"
                  />
                </div>
              )}

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                Preview: <span className="font-medium text-foreground">{previewText}</span>
              </div>

              <Button type="button" onClick={handleNumberPages} isLoading={isProcessing} className="w-full">
                Add Page Numbers
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
              <CardTitle className="text-2xl">Numbered PDF ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Numbered {result.numberedPages} page{result.numberedPages === 1 ? '' : 's'} · {formatFileSize(result.size)}
                </p>
              </div>
              <a href={result.url} download={result.fileName}>
                <Button type="button">Download PDF</Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
