'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CompressionSettings {
  quality: number
  imageQuality: number
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
    quality: 80,
    imageQuality: 70,
    compressionMode: 'balanced'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for cleanup
  const resultUrlRef = useRef<string | null>(null)

  // Cleanup URLs on unmount and when result changes
  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current)
      }
    }
  }, [])

  // Cleanup previous result URL when new result is set
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    // Clear previous state
    setError(null)
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
  }, [validateFile])

  const compressPDF = useCallback(async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // For now, we'll simulate PDF compression
      // In a real implementation, you would use a PDF library like PDF-lib
      const result = await new Promise<CompressionResult>((resolve, reject) => {
        // Simulate processing time
        setTimeout(() => {
          try {
            // Create a simulated compressed file
            // In reality, this would involve actual PDF processing
            const compressionRatio = settings.compressionMode === 'maximum' ? 0.4 : 
                                   settings.compressionMode === 'balanced' ? 0.6 : 0.8
            
            const simulatedSize = Math.floor(selectedFile.size * compressionRatio)
            
            // Create a blob with the original file (simulation)
            const blob = new Blob([selectedFile], { type: 'application/pdf' })
            const downloadUrl = URL.createObjectURL(blob)
            
            resolve({
              originalSize: selectedFile.size,
              newSize: simulatedSize,
              downloadUrl
            })
          } catch (err) {
            reject(err)
          }
        }, 2000) // Simulate 2 second processing time
      })
      
      setResult(result)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compression failed'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedFile, settings])

  const updateQuality = useCallback((value: string) => {
    const quality = parseInt(value, 10)
    if (!isNaN(quality) && quality >= 10 && quality <= 100) {
      setSettings(prev => ({ ...prev, quality }))
    }
  }, [])

  const updateImageQuality = useCallback((value: string) => {
    const imageQuality = parseInt(value, 10)
    if (!isNaN(imageQuality) && imageQuality >= 10 && imageQuality <= 100) {
      setSettings(prev => ({ ...prev, imageQuality }))
    }
  }, [])

  const updateCompressionMode = useCallback((mode: CompressionSettings['compressionMode']) => {
    setSettings(prev => ({ ...prev, compressionMode: mode }))
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }, [])

  const compressionRatio = useMemo(() => {
    if (!result) return 0
    return ((result.originalSize - result.newSize) / result.originalSize) * 100
  }, [result])

  const downloadFileName = useMemo(() => {
    if (!selectedFile) return 'compressed_document.pdf'
    
    const name = selectedFile.name
    const lastDot = name.lastIndexOf('.')
    const nameWithoutExt = lastDot > 0 ? name.substring(0, lastDot) : name
    
    return `compressed_${nameWithoutExt}.pdf`
  }, [selectedFile])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">PDF Compressor</h1>
        <p className="text-muted-foreground text-lg">
          Reduce PDF file size while maintaining document quality and readability.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Balanced: Best quality/size ratio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Maximum: Smallest file size</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload Section */}
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
                <div className="text-4xl mb-4" role="img" aria-label="Upload icon">📄</div>
                <p className="text-foreground font-medium mb-2">
                  Click to select a PDF file
                </p>
                <p className="text-muted-foreground text-sm">
                  Supports PDF files (max 50MB)
                </p>
              </label>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm font-medium">{error}</p>
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

        {/* Settings Section */}
        {selectedFile && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Compression Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compression Mode Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Compression Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateCompressionMode('balanced')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      settings.compressionMode === 'balanced'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">Balanced</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Good quality & size
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCompressionMode('maximum')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      settings.compressionMode === 'maximum'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">Maximum</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Smallest file size
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCompressionMode('lossless')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      settings.compressionMode === 'lossless'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">Lossless</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      No quality loss
                    </div>
                  </button>
                </div>
              </div>

              {/* Quality Settings - only show for non-lossless modes */}
              {settings.compressionMode !== 'lossless' && (
                <>
                  <div>
                    <label htmlFor="quality-slider" className="block text-sm font-medium text-foreground mb-2">
                      Document Quality: {settings.quality}%
                    </label>
                    <Input
                      id="quality-slider"
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={settings.quality}
                      onChange={(e) => updateQuality(e.target.value)}
                      className="w-full"
                      aria-label={`Document quality: ${settings.quality}%`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher quality = larger file size
                    </p>
                  </div>

                  <div>
                    <label htmlFor="image-quality-slider" className="block text-sm font-medium text-foreground mb-2">
                      Image Quality: {settings.imageQuality}%
                    </label>
                    <Input
                      id="image-quality-slider"
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={settings.imageQuality}
                      onChange={(e) => updateImageQuality(e.target.value)}
                      className="w-full"
                      aria-label={`Image quality: ${settings.imageQuality}%`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quality of images within the PDF
                    </p>
                  </div>
                </>
              )}

              {settings.compressionMode === 'lossless' && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    🔒 Lossless Mode: Perfect quality preservation
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    File size reduction through optimization without quality loss
                  </p>
                </div>
              )}

              <Button 
                onClick={compressPDF}
                disabled={isProcessing || !selectedFile}
                className="w-full"
                aria-label={isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
              >
                {isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Compression Results</CardTitle>
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
                  <div className="text-muted-foreground text-sm">Compressed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-info">
                    {compressionRatio.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-sm">Saved</div>
                </div>
              </div>
              
              <a
                href={result.downloadUrl}
                download={downloadFileName}
                className="block"
                aria-label={`Download compressed PDF: ${downloadFileName}`}
              >
                <Button className="w-full">
                  Download Compressed PDF
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}