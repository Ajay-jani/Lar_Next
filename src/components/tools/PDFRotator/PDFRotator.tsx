'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize, parsePageRanges } from '@/lib/page-ranges'

type RotationAngle = 90 | 180 | 270
type RangeMode = 'all' | 'custom'

interface PDFFileInfo {
  file: File
  pageCount: number
}

interface RotationResult {
  url: string
  fileName: string
  rotatedPages: number
  size: number
}

const MAX_FILE_SIZE = 100 * 1024 * 1024

export function PDFRotator() {
  const [pdfFile, setPdfFile] = useState<PDFFileInfo | null>(null)
  const [rangeMode, setRangeMode] = useState<RangeMode>('all')
  const [pageRanges, setPageRanges] = useState('')
  const [rotation, setRotation] = useState<RotationAngle>(90)
  const [result, setResult] = useState<RotationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const fileStats = useMemo(() => {
    if (!pdfFile) {
      return null
    }

    return `${pdfFile.pageCount} pages · ${formatFileSize(pdfFile.file.size)}`
  }, [pdfFile])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    setResult(null)

    if (!file) {
      setPdfFile(null)
      return
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('PDF size must stay under 100MB for in-browser processing.')
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pageCount = pdfDoc.getPageCount()

      setPdfFile({ file, pageCount })
      setPageRanges(pageCount > 1 ? `1-${Math.min(pageCount, 3)}` : '1')
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read this PDF.')
      setPdfFile(null)
    }
  }

  const handleRotate = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before rotating it.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const selectedPages = rangeMode === 'all'
        ? Array.from({ length: pdfFile.pageCount }, (_, index) => index + 1)
        : parsePageRanges(pageRanges, pdfFile.pageCount)

      selectedPages.forEach(pageNumber => {
        const page = pdfDoc.getPage(pageNumber - 1)
        const nextAngle = (page.getRotation().angle + rotation) % 360
        page.setRotation(degrees(nextAngle))
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
        fileName: createPdfDownloadName(pdfFile.file.name, 'rotated'),
        rotatedPages: selectedPages.length,
        size: blob.size,
      })
    } catch (rotationError) {
      setError(rotationError instanceof Error ? rotationError.message : 'Failed to rotate the PDF.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="heading-lg">PDF Rotator</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Rotate an entire PDF or only the page ranges you choose, then download the updated file in one step.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">Up to 100MB. Everything stays in your browser.</span>
              </label>

              {pdfFile && (
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="font-medium text-foreground">{pdfFile.file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{fileStats}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Rotation settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Rotate by</label>
                <div className="grid grid-cols-3 gap-2">
                  {([90, 180, 270] as RotationAngle[]).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRotation(option)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        rotation === option
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option}°
                    </button>
                  ))}
                </div>
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
                    placeholder="Example: 1-3, 5, 9-12"
                    className="form-input"
                  />
                  <p className="text-sm text-muted-foreground">Use commas to combine ranges, like `1-3,5,7-9`.</p>
                </div>
              )}

              <Button type="button" onClick={handleRotate} isLoading={isProcessing} className="w-full">
                Rotate PDF
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
              <CardTitle className="text-2xl">Your rotated PDF is ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rotated {result.rotatedPages} page{result.rotatedPages === 1 ? '' : 's'} · {formatFileSize(result.size)}
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
