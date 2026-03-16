'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CompressionSettings {
  quality: number
  maxWidth: number
  maxHeight: number
  outputFormat: 'original' | 'image/jpeg' | 'image/png' | 'image/webp'
  compressionMode: 'lossy' | 'lossless'
}

interface CompressionResult {
  originalSize: number
  newSize: number
  downloadUrl: string
}

// Allow larger images while still being safe for in-browser processing.
// 100MB = 100 * 1024 * 1024 bytes.
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function ImageCompressor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    outputFormat: 'original',
    compressionMode: 'lossy'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for cleanup
  const imageUrlRef = useRef<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  // Cleanup URLs on unmount and when result changes
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current)
      }
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
      return 'Please select a valid image file (JPG, PNG, or WebP)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 100MB'
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

    // Cleanup previous image URL
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
    }

    setSelectedFile(file)
  }, [validateFile])

  const compressImage = useCallback(async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Create object URL for the image
      const imageUrl = URL.createObjectURL(selectedFile)
      imageUrlRef.current = imageUrl
      
      const result = await new Promise<CompressionResult>((resolve, reject) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }
        
        const img = new Image()
        
        img.onload = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img
            const aspectRatio = width / height
            
            if (width > settings.maxWidth) {
              width = settings.maxWidth
              height = width / aspectRatio
            }
            
            if (height > settings.maxHeight) {
              height = settings.maxHeight
              width = height * aspectRatio
            }
            
            // Set canvas dimensions
            canvas.width = Math.round(width)
            canvas.height = Math.round(height)
            
            // Draw image with high quality
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            // Determine output format and compression settings
            const outputFormat = settings.outputFormat === 'original' ? selectedFile.type : settings.outputFormat
            
            // Handle lossless vs lossy compression
            let quality: number | undefined
            let finalFormat = outputFormat
            
            if (settings.compressionMode === 'lossless') {
              // For lossless compression, force PNG or keep PNG/WebP
              if (outputFormat === 'image/jpeg') {
                finalFormat = 'image/png' // Convert JPEG to PNG for lossless
              }
              quality = undefined // PNG and lossless WebP don't use quality
            } else {
              // Lossy compression with quality setting
              quality = finalFormat === 'image/png' ? undefined : settings.quality / 100
            }
            
            // Convert to blob
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              
              const downloadUrl = URL.createObjectURL(blob)
              resolve({
                originalSize: selectedFile.size,
                newSize: blob.size,
                downloadUrl
              })
            }, finalFormat, quality)
            
          } catch (err) {
            reject(err)
          } finally {
            // Cleanup image URL
            URL.revokeObjectURL(imageUrl)
            imageUrlRef.current = null
          }
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl)
          imageUrlRef.current = null
          reject(new Error('Failed to load image'))
        }
        
        img.src = imageUrl
      })
      
      setResult(result)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compression failed'
      setError(errorMessage)
      
      // Cleanup on error
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current)
        imageUrlRef.current = null
      }
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

  const updateMaxWidth = useCallback((value: string) => {
    const maxWidth = parseInt(value, 10)
    if (!isNaN(maxWidth) && maxWidth > 0) {
      setSettings(prev => ({ ...prev, maxWidth }))
    }
  }, [])

  const updateMaxHeight = useCallback((value: string) => {
    const maxHeight = parseInt(value, 10)
    if (!isNaN(maxHeight) && maxHeight > 0) {
      setSettings(prev => ({ ...prev, maxHeight }))
    }
  }, [])

  const updateOutputFormat = useCallback((format: CompressionSettings['outputFormat']) => {
    setSettings(prev => ({ ...prev, outputFormat: format }))
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
    if (!selectedFile) return 'compressed_image.jpg'
    
    const name = selectedFile.name
    const lastDot = name.lastIndexOf('.')
    const nameWithoutExt = lastDot > 0 ? name.substring(0, lastDot) : name
    
    // Determine file extension based on output format and compression mode
    let extension = '.jpg'
    let outputFormat = settings.outputFormat === 'original' ? selectedFile.type : settings.outputFormat
    
    // Handle lossless mode conversion
    if (settings.compressionMode === 'lossless' && outputFormat === 'image/jpeg') {
      outputFormat = 'image/png' // JPEG becomes PNG in lossless mode
    }
    
    extension = outputFormat === 'image/png' ? '.png' :
                outputFormat === 'image/webp' ? '.webp' : '.jpg'
    
    const prefix = settings.compressionMode === 'lossless' ? 'lossless_' : 'compressed_'
    return `${prefix}${nameWithoutExt}${extension}`
  }, [selectedFile, settings.outputFormat, settings.compressionMode])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Image Compressor</h1>
        <p className="text-muted-foreground text-lg">
          Reduce image file size with lossy or lossless compression. Perfect for web optimization.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Lossy: Smaller files</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Lossless: Perfect quality</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept={SUPPORTED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                aria-label="Select image file"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="text-4xl mb-4" role="img" aria-label="Upload icon">📁</div>
                <p className="text-foreground font-medium mb-2">
                  Click to select an image
                </p>
                <p className="text-muted-foreground text-sm">
                  Supports JPG, PNG, WebP (max 100MB)
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateCompressionMode('lossy')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      settings.compressionMode === 'lossy'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">Lossy Compression</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Smaller files, adjustable quality
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
                    <div className="font-medium">Lossless Compression</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      No quality loss, larger files
                    </div>
                  </button>
                </div>
              </div>

              {/* Output Format */}
              <div>
                <label htmlFor="output-format" className="block text-sm font-medium text-foreground mb-2">
                  Output Format
                </label>
                <select
                  id="output-format"
                  value={settings.outputFormat}
                  onChange={(e) => updateOutputFormat(e.target.value as CompressionSettings['outputFormat'])}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  aria-label="Select output image format"
                >
                  <option value="original">Keep Original Format</option>
                  <option value="image/jpeg">JPEG (.jpg)</option>
                  <option value="image/png">PNG (.png)</option>
                  <option value="image/webp">WebP (.webp)</option>
                </select>
                {settings.compressionMode === 'lossless' && settings.outputFormat === 'image/jpeg' && (
                  <p className="text-xs text-warning mt-1">
                    ⚠️ JPEG will be converted to PNG for lossless compression
                  </p>
                )}
              </div>

              {/* Quality slider - only show for lossy compression */}
              {settings.compressionMode === 'lossy' && 
               ((settings.outputFormat === 'original' && selectedFile?.type !== 'image/png') || 
                (settings.outputFormat !== 'original' && settings.outputFormat !== 'image/png')) ? (
                <div>
                  <label htmlFor="quality-slider" className="block text-sm font-medium text-foreground mb-2">
                    Quality: {settings.quality}%
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
                    aria-label={`Image quality: ${settings.quality}%`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher quality = larger file size
                  </p>
                </div>
              ) : settings.compressionMode === 'lossless' ? (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    🔒 Lossless Mode: Perfect quality preservation
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    File size reduction through optimization without quality loss
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    PNG format uses lossless compression - quality setting not applicable
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="max-width" className="block text-sm font-medium text-foreground mb-2">
                    Max Width (px)
                  </label>
                  <Input
                    id="max-width"
                    type="number"
                    min="1"
                    max="10000"
                    value={settings.maxWidth}
                    onChange={(e) => updateMaxWidth(e.target.value)}
                    aria-label="Maximum width in pixels"
                  />
                </div>
                <div>
                  <label htmlFor="max-height" className="block text-sm font-medium text-foreground mb-2">
                    Max Height (px)
                  </label>
                  <Input
                    id="max-height"
                    type="number"
                    min="1"
                    max="10000"
                    value={settings.maxHeight}
                    onChange={(e) => updateMaxHeight(e.target.value)}
                    aria-label="Maximum height in pixels"
                  />
                </div>
              </div>

              <Button 
                onClick={compressImage}
                disabled={isProcessing || !selectedFile}
                className="w-full"
                aria-label={isProcessing ? 'Compressing image...' : 'Compress image'}
              >
                {isProcessing ? 'Compressing...' : 'Compress Image'}
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
                aria-label={`Download compressed image: ${downloadFileName}`}
              >
                <Button className="w-full">
                  Download Compressed Image
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}