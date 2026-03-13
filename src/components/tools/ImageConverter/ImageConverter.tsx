'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface FilterSettings {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  sepia: number
  grayscale: number
  invert: number
  opacity: number
  gamma: number
  exposure: number
  temperature: number
  tint: number
  vibrance: number
  highlights: number
  shadows: number
  clarity: number
  vignette: number
}

interface ConversionSettings {
  format: 'jpeg' | 'png' | 'webp' | 'bmp' | 'tiff'
  quality: number
  width?: number
  height?: number
  maintainAspectRatio: boolean
  backgroundColor: string
}

interface ProcessedImage {
  id: string
  originalName: string
  processedDataUrl: string
  downloadUrl: string
  format: string
  size: number
}

const SUPPORTED_FORMATS = {
  jpeg: { name: 'JPEG', extension: 'jpg', quality: true },
  png: { name: 'PNG', extension: 'png', quality: false },
  webp: { name: 'WebP', extension: 'webp', quality: true },
  bmp: { name: 'BMP', extension: 'bmp', quality: false },
  tiff: { name: 'TIFF', extension: 'tiff', quality: false }
}

const FILTER_PRESETS = {
  none: { name: 'Original', filters: {} },
  vintage: {
    name: 'Vintage',
    filters: { sepia: 30, contrast: 110, brightness: 110, saturation: 80 }
  },
  blackwhite: {
    name: 'Black & White',
    filters: { grayscale: 100, contrast: 120 }
  },
  warm: {
    name: 'Warm',
    filters: { temperature: 20, brightness: 105, saturation: 110 }
  },
  cool: {
    name: 'Cool',
    filters: { temperature: -20, tint: 10, saturation: 90 }
  },
  dramatic: {
    name: 'Dramatic',
    filters: { contrast: 140, shadows: -30, highlights: -20, clarity: 30 }
  },
  soft: {
    name: 'Soft',
    filters: { blur: 1, brightness: 105, contrast: 90, opacity: 95 }
  },
  vibrant: {
    name: 'Vibrant',
    filters: { saturation: 130, vibrance: 20, contrast: 110 }
  }
}

export function ImageConverter() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null)
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
    opacity: 100,
    gamma: 100,
    exposure: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    highlights: 0,
    shadows: 0,
    clarity: 0,
    vignette: 0
  })
  const [conversion, setConversion] = useState<ConversionSettings>({
    format: 'jpeg',
    quality: 90,
    maintainAspectRatio: true,
    backgroundColor: '#ffffff'
  })
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed')
  
  // Refs for cleanup and canvas operations
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedUrlsRef = useRef<Set<string>>(new Set())

  // Cleanup URLs on unmount
  useEffect(() => {
    const currentProcessedUrls = processedUrlsRef.current
    const currentImages = images
    
    return () => {
      currentProcessedUrls.forEach(url => {
        URL.revokeObjectURL(url)
      })
      currentImages.forEach(img => {
        URL.revokeObjectURL(img.preview)
      })
    }
  }, [images])

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files')
        return false
      }
      if (file.size > 200 * 1024 * 1024) { // 50MB limit
        setError('File size must be less than 50MB')
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setError(null)
    const newImages: ImageFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }))

    setImages(prev => [...prev, ...newImages])
    if (!selectedImage && newImages.length > 0) {
      setSelectedImage(newImages[0])
    }
  }, [selectedImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Filter application
  const applyFiltersToCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    filters: FilterSettings
  ) => {
    // Create filter string for CSS filters
    const cssFilters = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `hue-rotate(${filters.hue}deg)`,
      `blur(${filters.blur}px)`,
      `sepia(${filters.sepia}%)`,
      `grayscale(${filters.grayscale}%)`,
      `invert(${filters.invert}%)`,
      `opacity(${filters.opacity}%)`
    ].join(' ')

    ctx.filter = cssFilters

    // For advanced filters that need manual implementation
    if (filters.gamma !== 100 || filters.exposure !== 0 || filters.temperature !== 0 || 
        filters.tint !== 0 || filters.vibrance !== 0 || filters.highlights !== 0 || 
        filters.shadows !== 0 || filters.clarity !== 0 || filters.vignette !== 0) {
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        // Gamma correction
        if (filters.gamma !== 100) {
          const gamma = filters.gamma / 100
          r = Math.pow(r / 255, 1 / gamma) * 255
          g = Math.pow(g / 255, 1 / gamma) * 255
          b = Math.pow(b / 255, 1 / gamma) * 255
        }

        // Exposure adjustment
        if (filters.exposure !== 0) {
          const exposure = filters.exposure / 100
          r = Math.min(255, r * (1 + exposure))
          g = Math.min(255, g * (1 + exposure))
          b = Math.min(255, b * (1 + exposure))
        }

        // Temperature adjustment (simplified)
        if (filters.temperature !== 0) {
          const temp = filters.temperature / 100
          if (temp > 0) {
            r = Math.min(255, r * (1 + temp * 0.3))
            b = Math.max(0, b * (1 - temp * 0.3))
          } else {
            r = Math.max(0, r * (1 + temp * 0.3))
            b = Math.min(255, b * (1 - temp * 0.3))
          }
        }

        // Tint adjustment
        if (filters.tint !== 0) {
          const tint = filters.tint / 100
          g = Math.min(255, Math.max(0, g * (1 + tint * 0.3)))
        }

        // Vibrance (selective saturation)
        if (filters.vibrance !== 0) {
          const vibrance = filters.vibrance / 100
          const max = Math.max(r, g, b)
          const avg = (r + g + b) / 3
          const amt = (Math.abs(max - avg) * 2 / 255) * vibrance
          
          r = Math.min(255, Math.max(0, r + (r - avg) * amt))
          g = Math.min(255, Math.max(0, g + (g - avg) * amt))
          b = Math.min(255, Math.max(0, b + (b - avg) * amt))
        }

        // Highlights and shadows (simplified)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        
        if (filters.highlights !== 0 && luminance > 128) {
          const highlight = filters.highlights / 100
          const factor = 1 + highlight * (luminance - 128) / 127
          r *= factor
          g *= factor
          b *= factor
        }
        
        if (filters.shadows !== 0 && luminance < 128) {
          const shadow = filters.shadows / 100
          const factor = 1 + shadow * (128 - luminance) / 128
          r *= factor
          g *= factor
          b *= factor
        }

        // Clarity (edge enhancement)
        if (filters.clarity !== 0) {
          // Simplified clarity - would need more complex edge detection in real implementation
          const clarity = filters.clarity / 100 * 0.1
          r = Math.min(255, Math.max(0, r * (1 + clarity)))
          g = Math.min(255, Math.max(0, g * (1 + clarity)))
          b = Math.min(255, Math.max(0, b * (1 + clarity)))
        }

        data[i] = Math.min(255, Math.max(0, r))
        data[i + 1] = Math.min(255, Math.max(0, g))
        data[i + 2] = Math.min(255, Math.max(0, b))
      }

      ctx.putImageData(imageData, 0, 0)
    }

    // Vignette effect
    if (filters.vignette > 0) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, maxRadius
      )
      
      const vignetteStrength = filters.vignette / 100
      gradient.addColorStop(0, `rgba(0,0,0,0)`)
      gradient.addColorStop(0.7, `rgba(0,0,0,${vignetteStrength * 0.3})`)
      gradient.addColorStop(1, `rgba(0,0,0,${vignetteStrength * 0.8})`)
      
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
    }
  }, [])

  // Process single image
  const processImage = useCallback(async (imageFile: ImageFile): Promise<ProcessedImage> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = canvasRef.current || document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            throw new Error('Canvas context not available')
          }

          // Calculate dimensions
          let { width, height } = img
          
          if (conversion.width || conversion.height) {
            if (conversion.maintainAspectRatio) {
              const aspectRatio = width / height
              if (conversion.width && conversion.height) {
                // Use the dimension that results in smaller image
                const widthRatio = conversion.width / width
                const heightRatio = conversion.height / height
                const ratio = Math.min(widthRatio, heightRatio)
                width = width * ratio
                height = height * ratio
              } else if (conversion.width) {
                height = conversion.width / aspectRatio
                width = conversion.width
              } else if (conversion.height) {
                width = conversion.height * aspectRatio
                height = conversion.height
              }
            } else {
              width = conversion.width || width
              height = conversion.height || height
            }
          }

          canvas.width = width
          canvas.height = height

          // Fill background for formats that don't support transparency
          if (conversion.format === 'jpeg' || conversion.format === 'bmp') {
            ctx.fillStyle = conversion.backgroundColor
            ctx.fillRect(0, 0, width, height)
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height)

          // Apply filters
          applyFiltersToCanvas(ctx, canvas, filters)

          // Convert to desired format
          const quality = SUPPORTED_FORMATS[conversion.format].quality ? 
            conversion.quality / 100 : undefined

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'))
              return
            }

            const processedDataUrl = canvas.toDataURL(`image/${conversion.format}`, quality)
            const downloadUrl = URL.createObjectURL(blob)
            processedUrlsRef.current.add(downloadUrl)

            const originalName = imageFile.file.name
            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
            const newExtension = SUPPORTED_FORMATS[conversion.format].extension

            resolve({
              id: imageFile.id,
              originalName: `${nameWithoutExt}.${newExtension}`,
              processedDataUrl,
              downloadUrl,
              format: conversion.format,
              size: blob.size
            })
          }, `image/${conversion.format}`, quality)

        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageFile.preview
    })
  }, [filters, conversion, applyFiltersToCanvas])

  // Process all images
  const processAllImages = useCallback(async () => {
    if (images.length === 0) {
      setError('Please select images to process')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const processed: ProcessedImage[] = []
      
      for (const image of images) {
        const result = await processImage(image)
        processed.push(result)
      }

      setProcessedImages(processed)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [images, processImage])

  // Filter presets
  const applyPreset = useCallback((presetKey: keyof typeof FILTER_PRESETS) => {
    const preset = FILTER_PRESETS[presetKey]
    setFilters(prev => {
      const newFilters = { ...prev }
      Object.entries(preset.filters).forEach(([key, value]) => {
        if (key in newFilters && typeof value === 'number') {
          (newFilters as any)[key] = value
        }
      })
      return newFilters
    })
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
      opacity: 100,
      gamma: 100,
      exposure: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      highlights: 0,
      shadows: 0,
      clarity: 0,
      vignette: 0
    })
  }, [])

  // Update filter value
  const updateFilter = useCallback((key: keyof FilterSettings, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Update conversion settings
  const updateConversion = useCallback((key: keyof ConversionSettings, value: any) => {
    setConversion(prev => ({ ...prev, [key]: value }))
  }, [])

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id)
      const removedImage = prev.find(img => img.id === id)
      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview)
      }
      if (selectedImage?.id === id) {
        setSelectedImage(updated[0] || null)
      }
      return updated
    })
  }, [selectedImage])

  // Download all processed images
  const downloadAll = useCallback(() => {
    processedImages.forEach(img => {
      const a = document.createElement('a')
      a.href = img.downloadUrl
      a.download = img.originalName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })
  }, [processedImages])

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Image Converter & Filter</h1>
        <p className="text-muted-foreground text-lg">
          Convert images between formats and apply professional filters
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Multiple formats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Advanced filters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Batch processing</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Upload Section */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-4xl mb-4">📸</div>
                <p className="text-foreground font-medium mb-2">
                  Drop images here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, WebP, BMP, TIFF
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 50MB per file
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />

              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Selected Images ({images.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                          selectedImage?.id === img.id ? 'border-primary bg-primary/10' : 'border-border'
                        }`}
                        onClick={() => setSelectedImage(img)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {img.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(img.file.size)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(img.id)
                          }}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Output Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="format-select" className="block text-sm font-medium text-foreground mb-2">
                  Format
                </label>
                <select
                  id="format-select"
                  value={conversion.format}
                  onChange={(e) => updateConversion('format', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.entries(SUPPORTED_FORMATS).map(([key, format]) => (
                    <option key={key} value={key}>{format.name}</option>
                  ))}
                </select>
              </div>

              {SUPPORTED_FORMATS[conversion.format].quality && (
                <div>
                  <label htmlFor="quality-slider" className="block text-sm font-medium text-foreground mb-2">
                    Quality: {conversion.quality}%
                  </label>
                  <Input
                    id="quality-slider"
                    type="range"
                    min="10"
                    max="100"
                    value={conversion.quality}
                    onChange={(e) => updateConversion('quality', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="width-input" className="block text-sm font-medium text-foreground mb-2">
                    Width (px)
                  </label>
                  <Input
                    id="width-input"
                    type="number"
                    placeholder="Auto"
                    value={conversion.width || ''}
                    onChange={(e) => updateConversion('width', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <label htmlFor="height-input" className="block text-sm font-medium text-foreground mb-2">
                    Height (px)
                  </label>
                  <Input
                    id="height-input"
                    type="number"
                    placeholder="Auto"
                    value={conversion.height || ''}
                    onChange={(e) => updateConversion('height', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="aspect-ratio"
                  type="checkbox"
                  checked={conversion.maintainAspectRatio}
                  onChange={(e) => updateConversion('maintainAspectRatio', e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="aspect-ratio" className="text-sm text-foreground">
                  Maintain aspect ratio
                </label>
              </div>

              {(conversion.format === 'jpeg' || conversion.format === 'bmp') && (
                <div>
                  <label htmlFor="bg-color" className="block text-sm font-medium text-foreground mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="bg-color"
                      type="color"
                      value={conversion.backgroundColor}
                      onChange={(e) => updateConversion('backgroundColor', e.target.value)}
                      className="w-12 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={conversion.backgroundColor}
                      onChange={(e) => updateConversion('backgroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Preview
                {selectedImage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('original')}
                      className={`px-3 py-1 rounded text-sm ${
                        previewMode === 'original' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('processed')}
                      className={`px-3 py-1 rounded text-sm ${
                        previewMode === 'processed' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      Filtered
                    </button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 rounded-lg border-2 border-dashed border-border min-h-96">
                {selectedImage ? (
                  <div className="text-center max-w-full">
                    {previewMode === 'original' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedImage.preview}
                        alt="Original"
                        className="max-w-full max-h-80 object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedImage.preview}
                          alt="Filtered preview"
                          className="max-w-full max-h-80 object-contain rounded-lg shadow-lg"
                          style={{
                            filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%) invert(${filters.invert}%) opacity(${filters.opacity}%)`
                          }}
                        />
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-4">
                      {selectedImage.file.name} • {formatFileSize(selectedImage.file.size)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <div className="text-6xl mb-4">🖼️</div>
                    <p>Select an image to preview</p>
                    <p className="text-sm mt-2">Upload images to get started</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Button */}
          <div className="flex gap-4">
            <Button
              onClick={processAllImages}
              disabled={isProcessing || images.length === 0}
              className="flex-1"
              size="lg"
            >
              {isProcessing ? 'Processing...' : `Process ${images.length} Image${images.length !== 1 ? 's' : ''}`}
            </Button>
            
            {processedImages.length > 0 && (
              <Button
                onClick={downloadAll}
                variant="outline"
                size="lg"
              >
                Download All
              </Button>
            )}
          </div>

          {/* Results */}
          {processedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {processedImages.map((img) => (
                    <div key={img.id} className="border border-border rounded-lg p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.processedDataUrl}
                        alt={img.originalName}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {img.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {img.format.toUpperCase()} • {formatFileSize(img.size)}
                        </p>
                        <a
                          href={img.downloadUrl}
                          download={img.originalName}
                          className="block"
                        >
                          <Button size="sm" className="w-full">
                            Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Filter Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key as keyof typeof FILTER_PRESETS)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="w-full mt-3"
              >
                Reset All
              </Button>
            </CardContent>
          </Card>

          {/* Basic Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
                { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
                { key: 'saturation', label: 'Saturation', min: 0, max: 200, unit: '%' },
                { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°' },
                { key: 'opacity', label: 'Opacity', min: 0, max: 100, unit: '%' }
              ].map(({ key, label, min, max, unit }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {label}: {filters[key as keyof FilterSettings]}{unit}
                  </label>
                  <Input
                    type="range"
                    min={min}
                    max={max}
                    value={filters[key as keyof FilterSettings]}
                    onChange={(e) => updateFilter(key as keyof FilterSettings, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Effects */}
          <Card>
            <CardHeader>
              <CardTitle>Effects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'blur', label: 'Blur', min: 0, max: 10, unit: 'px' },
                { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
                { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
                { key: 'invert', label: 'Invert', min: 0, max: 100, unit: '%' },
                { key: 'vignette', label: 'Vignette', min: 0, max: 100, unit: '%' }
              ].map(({ key, label, min, max, unit }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {label}: {filters[key as keyof FilterSettings]}{unit}
                  </label>
                  <Input
                    type="range"
                    min={min}
                    max={max}
                    value={filters[key as keyof FilterSettings]}
                    onChange={(e) => updateFilter(key as keyof FilterSettings, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Advanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'gamma', label: 'Gamma', min: 50, max: 200, unit: '%' },
                { key: 'exposure', label: 'Exposure', min: -100, max: 100, unit: '%' },
                { key: 'temperature', label: 'Temperature', min: -100, max: 100, unit: '' },
                { key: 'tint', label: 'Tint', min: -100, max: 100, unit: '' },
                { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, unit: '%' },
                { key: 'highlights', label: 'Highlights', min: -100, max: 100, unit: '%' },
                { key: 'shadows', label: 'Shadows', min: -100, max: 100, unit: '%' },
                { key: 'clarity', label: 'Clarity', min: -100, max: 100, unit: '%' }
              ].map(({ key, label, min, max, unit }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {label}: {filters[key as keyof FilterSettings]}{unit}
                  </label>
                  <Input
                    type="range"
                    min={min}
                    max={max}
                    value={filters[key as keyof FilterSettings]}
                    onChange={(e) => updateFilter(key as keyof FilterSettings, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}