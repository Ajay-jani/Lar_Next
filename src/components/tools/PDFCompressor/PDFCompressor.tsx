'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface CompressionSettings {
  compressionMode: 'balanced' | 'maximum' | 'lossless'
}

interface CompressionResult {
  originalSize: number
  newSize: number
  downloadUrl: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const SUPPORTED_TYPES = ['application/pdf']

export function PDFCompressor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<CompressionSettings>({
    compressionMode: 'balanced',
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [hasAutoOptimized, setHasAutoOptimized] = useState(false)

  const resultUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (resultUrlRef.current && result?.downloadUrl !== resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
    }
    resultUrlRef.current = result?.downloadUrl || null
  }, [result])

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'Please select a valid PDF file'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB'
    }

    return null
  }, [])

  const runOptimization = useCallback(async (
    file: File,
    mode: CompressionSettings['compressionMode']
  ) => {
    setIsProcessing(true)
    setError(null)
    setNote(null)

    try {
      const sourceBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(sourceBuffer, {
        updateMetadata: false,
      })

      if (mode === 'maximum') {
        pdfDoc.setTitle('')
        pdfDoc.setAuthor('')
        pdfDoc.setSubject('')
        pdfDoc.setKeywords([])
        pdfDoc.setProducer('')
        pdfDoc.setCreator('')
      }

      const optimizedBytes = await pdfDoc.save({
        useObjectStreams: mode !== 'lossless',
        addDefaultPage: false,
        updateFieldAppearances: false,
        objectsPerTick: mode === 'maximum' ? 25 : 50,
      })

      const optimizedBlob = new Blob([new Uint8Array(optimizedBytes)], {
        type: 'application/pdf',
      })

      await PDFDocument.load(await optimizedBlob.arrayBuffer(), {
        updateMetadata: false,
      })

      const downloadUrl = URL.createObjectURL(optimizedBlob)
      setResult({
        originalSize: file.size,
        newSize: optimizedBlob.size,
        downloadUrl,
      })

      if (optimizedBlob.size >= file.size) {
        setNote(
          'The default quick optimization finished, but this PDF was already compact so the new file is not smaller.'
        )
      } else if (!hasAutoOptimized && mode === 'balanced') {
        setNote('Quick optimization finished automatically. Download now or try another mode.')
      } else {
        setNote('PDF optimization completed successfully.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF optimization failed'
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }, [hasAutoOptimized])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setError(null)
    setNote(null)
    setResult(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setSettings({ compressionMode: 'balanced' })
    setHasAutoOptimized(false)
    void runOptimization(file, 'balanced').then(() => {
      setHasAutoOptimized(true)
    })
  }, [runOptimization, validateFile])

  const optimizePDF = useCallback(async (mode = settings.compressionMode) => {
    if (!selectedFile) return

    setSettings({ compressionMode: mode })
    await runOptimization(selectedFile, mode)
    setHasAutoOptimized(true)
  }, [runOptimization, selectedFile, settings.compressionMode])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }, [])

  const sizeDelta = useMemo(() => {
    if (!result) return 0
    return result.originalSize - result.newSize
  }, [result])

  const sizeChangePercent = useMemo(() => {
    if (!result || result.originalSize === 0) return 0
    return (sizeDelta / result.originalSize) * 100
  }, [result, sizeDelta])

  const downloadFileName = useMemo(() => {
    if (!selectedFile) return 'optimized_document.pdf'

    const name = selectedFile.name
    const lastDot = name.lastIndexOf('.')
    const nameWithoutExt = lastDot > 0 ? name.substring(0, lastDot) : name

    return `optimized_${nameWithoutExt}.pdf`
  }, [selectedFile])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">PDF Compressor</h1>
        <p className="text-muted-foreground text-lg">
          Upload once and get an instant balanced optimization, then only open settings if you
          want to push for a smaller or higher-fidelity result.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Real PDF optimization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">In-browser processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">True size reporting</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept={SUPPORTED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                aria-label="Select PDF file"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="text-4xl mb-4" role="img" aria-label="Upload icon">PDF</div>
                <p className="text-foreground font-medium mb-2">
                  Click to select a PDF file
                </p>
                <p className="text-muted-foreground text-sm">
                  Supports PDF files up to 50MB
                </p>
              </label>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            {note && !error && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-primary text-sm font-medium">{note}</p>
              </div>
            )}

            {selectedFile && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-foreground font-medium">{selectedFile.name}</p>
                <p className="text-muted-foreground text-sm">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedFile && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Modes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing && (
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Optimizing your PDF now...
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => void optimizePDF('balanced')}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    settings.compressionMode === 'balanced'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">Balanced</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Rewrites the PDF with object-stream optimization.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void optimizePDF('maximum')}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    settings.compressionMode === 'maximum'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">Maximum</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Also strips optional metadata for smaller output.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void optimizePDF('lossless')}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    settings.compressionMode === 'lossless'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">Lossless</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Rebuilds the PDF without stripping metadata.
                  </div>
                </button>
              </div>

              <details className="rounded-lg border border-border bg-muted/20">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground">
                  Advanced explanation
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    This tool performs browser-safe structural optimization. It does not recompress
                    embedded images, so already-optimized PDFs may stay the same size or grow slightly.
                  </p>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatFileSize(result.originalSize)}
                  </div>
                  <div className="text-muted-foreground text-sm">Original</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">
                    {formatFileSize(result.newSize)}
                  </div>
                  <div className="text-muted-foreground text-sm">Optimized</div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${
                      sizeDelta >= 0 ? 'text-info' : 'text-warning'
                    }`}
                  >
                    {sizeChangePercent.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-sm">Size Change</div>
                </div>
              </div>

              <a
                href={result.downloadUrl}
                download={downloadFileName}
                className="block"
                aria-label={`Download optimized PDF: ${downloadFileName}`}
              >
                <Button className="w-full">
                  Download Optimized PDF
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
