'use client'

import React, { useEffect, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize, parsePageRanges } from '@/lib/page-ranges'

interface PDFFileInfo {
  file: File
  pageCount: number
}

interface ExtractionResult {
  url: string
  fileName: string
  extractedPages: number
  size: number
}

const MAX_FILE_SIZE = 100 * 1024 * 1024

export function PDFPageExtractor() {
  const [pdfFile, setPdfFile] = useState<PDFFileInfo | null>(null)
  const [pageRanges, setPageRanges] = useState('')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

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
      setError('PDF size must stay under 100MB for in-browser extraction.')
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

  const handleExtract = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before extracting pages.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const sourceBytes = await pdfFile.file.arrayBuffer()
      const sourcePdf = await PDFDocument.load(sourceBytes)
      const targetPdf = await PDFDocument.create()
      const selectedPages = parsePageRanges(pageRanges, pdfFile.pageCount)
      const copiedPages = await targetPdf.copyPages(sourcePdf, selectedPages.map(page => page - 1))

      copiedPages.forEach(page => targetPdf.addPage(page))

      const pdfBytes = await targetPdf.save()
      const safeBytes = Uint8Array.from(pdfBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }

      setResult({
        url,
        fileName: createPdfDownloadName(pdfFile.file.name, 'extracted-pages'),
        extractedPages: selectedPages.length,
        size: blob.size,
      })
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : 'Failed to extract the selected pages.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="heading-lg">PDF Page Extractor</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Keep only the pages you need and export them into a clean PDF for sharing, review, or follow-up edits.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Select a PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                <span className="block text-lg font-medium text-foreground">Choose a PDF file</span>
                <span className="mt-2 block text-sm text-muted-foreground">The file is read and processed locally in your browser.</span>
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
              <CardTitle className="text-2xl">Pages to keep</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Page ranges</label>
                <input
                  value={pageRanges}
                  onChange={event => setPageRanges(event.target.value)}
                  placeholder="Example: 1-3, 5, 9-12"
                  className="form-input"
                />
                <p className="text-sm text-muted-foreground">
                  Use commas to combine ranges. The output PDF keeps the selected pages in ascending order.
                </p>
              </div>

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                Great for trimming meeting packs, sending only signed pages, or pulling out the chapters you actually need.
              </div>

              <Button type="button" onClick={handleExtract} isLoading={isProcessing} className="w-full">
                Extract Pages
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
              <CardTitle className="text-2xl">Extraction complete</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.extractedPages} extracted page{result.extractedPages === 1 ? '' : 's'} · {formatFileSize(result.size)}
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
