'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ImageFile {
  id: string
  file: File
  name: string
  size: number
  originalWidth: number
  originalHeight: number
  preview: string
}

interface ResizeOptions {
  width: number
  height: number
  maintainAspectRatio: boolean
  resizeMode: 'exact' | 'fit' | 'fill' | 'stretch'
  quality: number
  format: 'original' | 'jpeg' | 'png' | 'webp'
  outputPrefix: string
}

interface ResizePreset {
  name: string
  width: number
  height: number
  description: string
  icon: string
}

const RESIZE_PRESETS: ResizePreset[] = [
  { name: 'Instagram Square', width: 1080, height: 1080, description: 'Perfect for Instagram posts', icon: '📱' },
  { name: 'Instagram Story', width: 1080, height: 1920, description: 'Vertical story format', icon: '📲' },
  { name: 'Facebook Cover', width: 1200, height: 630, description: 'Facebook cover photo', icon: '📘' },
  { name: 'Twitter Header', width: 1500, height: 500, description: 'Twitter profile header', icon: '🐦' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, description: 'HD video thumbnail', icon: '📺' },
  { name: 'LinkedIn Banner', width: 1584, height: 396, description: 'Professional banner', icon: '💼' },
  { name: 'Avatar/Profile', width: 400, height: 400, description: 'Profile picture', icon: '👤' },
  { name: 'Website Hero', width: 1920, height: 1080, description: 'Full HD hero image', icon: '🌐' },
  { name: 'Email Header', width: 600, height: 200, description: 'Email newsletter header', icon: '📧' },
  { name: 'Print 4x6', width: 1800, height: 1200, description: '4x6 inch print (300 DPI)', icon: '🖨️' },
  { name: 'Print 8x10', width: 3000, height: 2400, description: '8x10 inch print (300 DPI)', icon: '🖼️' },
  { name: 'HD Wallpaper', width: 1920, height: 1080, description: 'Desktop wallpaper', icon: '🖥️' }
]

export function ImageResizer() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null)
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>({
    width: 800,
    height: 600,
    maintainAspectRatio: true,
    resizeMode: 'fit',
    quality: 90,
    format: 'original',
    outputPrefix: 'resized'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resizedResults, setResizedResults] = useState<{ name: string; url: string; size: number; dimensions: string }[]>([])
  const [progress, setProgress] = useState(0)

  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resizedUrlsRef = useRef<string[]>([])

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      resizedUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      images.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [images])

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    if (!selectedImage) return null
    
    const { width, height, maintainAspectRatio, resizeMode } = resizeOptions
    const { originalWidth, originalHeight } = selectedImage
    
    if (!maintainAspectRatio || resizeMode === 'exact' || resizeMode === 'stretch') {
      return { width, height }
    }
    
    const aspectRatio = originalWidth / originalHeight
    
    if (resizeMode === 'fit') {
      // Fit within bounds
      if (width / height > aspectRatio) {
        return { width: Math.round(height * aspectRatio), height }
      } else {
        return { width, height: Math.round(width / aspectRatio) }
      }
    } else if (resizeMode === 'fill') {
      // Fill bounds (may crop)
      if (width / height < aspectRatio) {
        return { width: Math.round(height * aspectRatio), height }
      } else {
        return { width, height: Math.round(width / aspectRatio) }
      }
    }
    
    return { width, height }
  }, [selectedImage, resizeOptions])

  // Analyze image file
  const analyzeImage = useCallback(async (file: File): Promise<{ width: number; height: number; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          preview: url
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    })
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files')
        return false
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('Image file size must be less than 50MB')
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setError(null)
    setResizedResults([])

    try {
      const newImages: ImageFile[] = []

      for (const file of validFiles) {
        const { width, height, preview } = await analyzeImage(file)
        
        const imageFile: ImageFile = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          size: file.size,
          originalWidth: width,
          originalHeight: height,
          preview
        }

        newImages.push(imageFile)
      }

      setImages(prev => [...prev, ...newImages])
      if (!selectedImage && newImages.length > 0) {
        setSelectedImage(newImages[0])
        // Auto-set dimensions based on first image
        setResizeOptions(prev => ({
          ...prev,
          width: Math.min(newImages[0].originalWidth, 1920),
          height: Math.min(newImages[0].originalHeight, 1080)
        }))
      }
    } catch (err) {
      setError('Failed to analyze image files')
    }
  }, [selectedImage, analyzeImage])

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
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

  // Apply preset
  const applyPreset = useCallback((preset: ResizePreset) => {
    setResizeOptions(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height,
      maintainAspectRatio: true,
      resizeMode: 'fit'
    }))
  }, [])

  // Update dimensions when aspect ratio is toggled
  const handleAspectRatioToggle = useCallback((maintain: boolean) => {
    if (maintain && selectedImage) {
      const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight
      const newHeight = Math.round(resizeOptions.width / aspectRatio)
      setResizeOptions(prev => ({
        ...prev,
        maintainAspectRatio: maintain,
        height: newHeight
      }))
    } else {
      setResizeOptions(prev => ({
        ...prev,
        maintainAspectRatio: maintain
      }))
    }
  }, [selectedImage, resizeOptions.width])

  // Update width and maintain aspect ratio
  const handleWidthChange = useCallback((width: number) => {
    if (resizeOptions.maintainAspectRatio && selectedImage) {
      const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight
      const newHeight = Math.round(width / aspectRatio)
      setResizeOptions(prev => ({ ...prev, width, height: newHeight }))
    } else {
      setResizeOptions(prev => ({ ...prev, width }))
    }
  }, [resizeOptions.maintainAspectRatio, selectedImage])

  // Update height and maintain aspect ratio
  const handleHeightChange = useCallback((height: number) => {
    if (resizeOptions.maintainAspectRatio && selectedImage) {
      const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight
      const newWidth = Math.round(height * aspectRatio)
      setResizeOptions(prev => ({ ...prev, width: newWidth, height }))
    } else {
      setResizeOptions(prev => ({ ...prev, height }))
    }
  }, [resizeOptions.maintainAspectRatio, selectedImage])

  // Advanced multi-step resize for better quality
  const resizeImageHighQuality = useCallback(async (imageFile: ImageFile): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) {
          reject(new Error('Canvas not available'))
          return
        }
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        const { width: targetWidth, height: targetHeight, resizeMode } = resizeOptions
        const { originalWidth, originalHeight } = imageFile
        
        let canvasWidth = targetWidth
        let canvasHeight = targetHeight
        let sourceX = 0
        let sourceY = 0
        let sourceWidth = originalWidth
        let sourceHeight = originalHeight

        // Calculate dimensions based on resize mode
        if (resizeMode === 'fit') {
          const aspectRatio = originalWidth / originalHeight
          if (targetWidth / targetHeight > aspectRatio) {
            canvasWidth = Math.round(targetHeight * aspectRatio)
            canvasHeight = targetHeight
          } else {
            canvasWidth = targetWidth
            canvasHeight = Math.round(targetWidth / aspectRatio)
          }
        } else if (resizeMode === 'fill') {
          const aspectRatio = originalWidth / originalHeight
          const targetAspectRatio = targetWidth / targetHeight
          
          if (targetAspectRatio > aspectRatio) {
            // Target is wider, crop height from source
            sourceHeight = Math.round(originalWidth / targetAspectRatio)
            sourceY = Math.round((originalHeight - sourceHeight) / 2)
          } else {
            // Target is taller, crop width from source
            sourceWidth = Math.round(originalHeight * targetAspectRatio)
            sourceX = Math.round((originalWidth - sourceWidth) / 2)
          }
          canvasWidth = targetWidth
          canvasHeight = targetHeight
        } else if (resizeMode === 'exact') {
          if (resizeOptions.maintainAspectRatio) {
            const aspectRatio = originalWidth / originalHeight
            if (targetWidth / targetHeight > aspectRatio) {
              canvasWidth = Math.round(targetHeight * aspectRatio)
              canvasHeight = targetHeight
            } else {
              canvasWidth = targetWidth
              canvasHeight = Math.round(targetWidth / aspectRatio)
            }
          } else {
            canvasWidth = targetWidth
            canvasHeight = targetHeight
          }
        }
        // 'stretch' mode uses target dimensions directly

        // Calculate scaling ratio for quality optimizations
        const scaleRatio = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight)

        // Set final canvas size
        canvas.width = canvasWidth
        canvas.height = canvasHeight

        // Configure high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Use different algorithms based on scaling direction
        if (scaleRatio > 1) {
          // Upscaling - use bicubic-like interpolation
          ctx.imageSmoothingQuality = 'high'
        } else {
          // Downscaling - use high quality with proper filtering
          ctx.imageSmoothingQuality = 'high'
        }

        // Clear canvas with appropriate background
        if (resizeOptions.format === 'jpeg' || 
            (resizeOptions.format === 'original' && imageFile.file.type.includes('jpeg'))) {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        } else {
          // For PNG/WebP, clear to transparent
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        }

        // Draw the final resized image with high-quality scaling
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvasWidth, canvasHeight)

        // Apply subtle sharpening for downscaled images
        if (scaleRatio < 0.8) {
          const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
          const data = imageData.data
          
          // Apply subtle sharpening only to luminance to avoid color artifacts
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1] 
            const b = data[i + 2]
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b
            
            // Apply subtle sharpening only if not too bright/dark
            if (luminance > 30 && luminance < 225) {
              const factor = 0.05 // Very subtle enhancement
              data[i] = Math.min(255, Math.max(0, r + (r - luminance) * factor))
              data[i + 1] = Math.min(255, Math.max(0, g + (g - luminance) * factor))
              data[i + 2] = Math.min(255, Math.max(0, b + (b - luminance) * factor))
            }
          }
          
          ctx.putImageData(imageData, 0, 0)
        }

        // Determine optimal output format and quality
        let outputFormat = 'image/png'
        let quality = 1
        
        if (resizeOptions.format === 'jpeg') {
          outputFormat = 'image/jpeg'
          quality = resizeOptions.quality / 100
        } else if (resizeOptions.format === 'webp') {
          outputFormat = 'image/webp'
          quality = resizeOptions.quality / 100
        } else if (resizeOptions.format === 'original') {
          if (imageFile.file.type.includes('jpeg')) {
            outputFormat = 'image/jpeg'
            quality = resizeOptions.quality / 100
          } else if (imageFile.file.type.includes('webp')) {
            outputFormat = 'image/webp'
            quality = resizeOptions.quality / 100
          } else if (imageFile.file.type.includes('png')) {
            outputFormat = 'image/png'
            quality = 1 // PNG is lossless
          }
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ 
                blob, 
                width: canvasWidth, 
                height: canvasHeight 
              })
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          outputFormat,
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageFile.preview
    })
  }, [resizeOptions])

  // Resize all images
  const resizeImages = useCallback(async () => {
    if (images.length === 0) {
      setError('Please select images to resize')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setResizedResults([])

    // Clean up previous URLs
    resizedUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    resizedUrlsRef.current = []

    try {
      const results: { name: string; url: string; size: number; dimensions: string }[] = []

      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        
        try {
          const { blob, width, height } = await resizeImageHighQuality(image)
          
          // Generate filename
          const originalName = image.name.replace(/\.[^/.]+$/, '')
          const extension = resizeOptions.format === 'original' 
            ? image.name.split('.').pop() 
            : resizeOptions.format === 'jpeg' ? 'jpg' : resizeOptions.format
          
          const filename = `${resizeOptions.outputPrefix}_${originalName}_${width}x${height}.${extension}`
          
          const url = URL.createObjectURL(blob)
          resizedUrlsRef.current.push(url)
          
          results.push({
            name: filename,
            url,
            size: blob.size,
            dimensions: `${width} × ${height}`
          })
        } catch (error) {
          // Silently skip failed images
        }
        
        setProgress(Math.round(((i + 1) / images.length) * 100))
      }

      setResizedResults(results)
      
      if (results.length === 0) {
        setError('Failed to resize any images')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image resize failed'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [images, resizeImageHighQuality, resizeOptions])

  // Smart quality recommendations
  const getQualityRecommendation = useCallback(() => {
    if (!selectedImage) return null
    
    const { width, height } = resizeOptions
    const { originalWidth, originalHeight } = selectedImage
    const scaleRatio = Math.min(width / originalWidth, height / originalHeight)
    
    if (scaleRatio > 2) {
      return { quality: 95, reason: 'High quality recommended for upscaling' }
    } else if (scaleRatio < 0.3) {
      return { quality: 85, reason: 'Medium quality sufficient for heavy downscaling' }
    } else if (scaleRatio < 0.7) {
      return { quality: 90, reason: 'Good quality for moderate downscaling' }
    } else {
      return { quality: 92, reason: 'High quality for minimal scaling' }
    }
  }, [selectedImage, resizeOptions])

  // Smart format recommendations
  const getFormatRecommendation = useCallback(() => {
    if (!selectedImage) return null
    
    const { width, height } = resizeOptions
    const totalPixels = width * height
    const hasTransparency = selectedImage.file.type.includes('png') || selectedImage.file.type.includes('gif')
    
    if (hasTransparency) {
      return { format: 'png', reason: 'PNG recommended to preserve transparency' }
    } else if (totalPixels > 2000000) { // > 2MP
      return { format: 'webp', reason: 'WebP recommended for large images (better compression)' }
    } else if (selectedImage.file.type.includes('jpeg')) {
      return { format: 'jpeg', reason: 'JPEG recommended for photos' }
    } else {
      return { format: 'webp', reason: 'WebP recommended for best quality/size ratio' }
    }
  }, [selectedImage, resizeOptions])

  const qualityRec = getQualityRecommendation()
  const formatRec = getFormatRecommendation()

  // Estimate file size based on dimensions and format
  const estimateFileSize = useCallback((width: number, height: number): number => {
    const pixels = width * height
    const { format, quality } = resizeOptions
    
    if (format === 'png' || (format === 'original' && selectedImage?.file.type.includes('png'))) {
      // PNG: roughly 3-4 bytes per pixel (24-bit + alpha)
      return pixels * 3.5
    } else if (format === 'jpeg' || (format === 'original' && selectedImage?.file.type.includes('jpeg'))) {
      // JPEG: varies greatly with quality
      const baseSize = pixels * 0.5 // Base compression
      const qualityFactor = (quality / 100) * 2 // Quality impact
      return baseSize * qualityFactor
    } else if (format === 'webp') {
      // WebP: generally 25-35% smaller than JPEG
      const baseSize = pixels * 0.35
      const qualityFactor = (quality / 100) * 1.5
      return baseSize * qualityFactor
    }
    
    return pixels * 2 // Fallback estimate
  }, [resizeOptions, selectedImage])

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">Advanced Image Resizer</h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Resize images with precision, presets, and professional quality optimization
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Smart resizing modes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Social media presets</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Batch processing</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Upload & Image Management */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-4">🖼️</div>
                <p className="text-foreground font-medium mb-2 text-sm sm:text-base">
                  Drop images here or click to browse
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Supports JPG, PNG, WebP, GIF up to 50MB each
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
            </CardContent>
          </Card>

          {/* Image Gallery */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm sm:text-base">Images ({images.length})</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      images.forEach(img => URL.revokeObjectURL(img.preview))
                      setImages([])
                      setSelectedImage(null)
                      setResizedResults([])
                    }}
                    className="text-xs h-7"
                  >
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage?.id === image.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full aspect-square object-cover"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      
                      {/* Remove button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(image.id)
                        }}
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                      >
                        ×
                      </Button>
                      
                      {/* Image info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                        <div className="truncate font-medium">{image.name}</div>
                        <div className="text-white/80">
                          {image.originalWidth} × {image.originalHeight}
                        </div>
                      </div>
                      
                      {/* Selected indicator */}
                      {selectedImage?.id === image.id && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs text-primary-foreground">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resize Options Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {RESIZE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => applyPreset(preset)}
                    className="justify-start text-left h-auto p-3"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <span className="text-lg flex-shrink-0">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {preset.width} × {preset.height}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {preset.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resize Settings */}
          {selectedImage && (
            <Card>
              <CardHeader>
                <CardTitle>Resize Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Image Info with Live Preview */}
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-sm font-medium text-foreground mb-2">Selected Image</div>
                  <div className="text-xs text-muted-foreground truncate mb-2">{selectedImage.name}</div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-foreground">Original</div>
                      <div className="text-muted-foreground">
                        {selectedImage.originalWidth} × {selectedImage.originalHeight}
                      </div>
                      <div className="text-muted-foreground">
                        {formatFileSize(selectedImage.size)}
                      </div>
                    </div>
                    
                    {previewDimensions && (
                      <div>
                        <div className="font-medium text-primary">New Size</div>
                        <div className="text-primary">
                          {previewDimensions.width} × {previewDimensions.height}
                        </div>
                        <div className="text-primary">
                          ~{formatFileSize(estimateFileSize(previewDimensions.width, previewDimensions.height))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {previewDimensions && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Scale:</span>
                        <span className="text-foreground">
                          {Math.round((previewDimensions.width / selectedImage.originalWidth) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Pixels:</span>
                        <span className="text-foreground">
                          {(previewDimensions.width * previewDimensions.height / 1000000).toFixed(1)}MP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dimensions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="maintain-aspect"
                      checked={resizeOptions.maintainAspectRatio}
                      onChange={(e) => handleAspectRatioToggle(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="maintain-aspect" className="text-sm text-foreground">
                      Maintain aspect ratio
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Width</label>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        value={resizeOptions.width}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Height</label>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        value={resizeOptions.height}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Resize Mode */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Resize Mode</label>
                  <select
                    value={resizeOptions.resizeMode}
                    onChange={(e) => setResizeOptions(prev => ({ 
                      ...prev, 
                      resizeMode: e.target.value as ResizeOptions['resizeMode']
                    }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="fit">Fit (maintain proportions)</option>
                    <option value="fill">Fill (may crop)</option>
                    <option value="exact">Exact dimensions</option>
                    <option value="stretch">Stretch to fit</option>
                  </select>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Output Format</label>
                  <select
                    value={resizeOptions.format}
                    onChange={(e) => setResizeOptions(prev => ({ 
                      ...prev, 
                      format: e.target.value as ResizeOptions['format']
                    }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="original">Keep Original Format</option>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>

                {/* Smart Recommendations */}
                {(qualityRec || formatRec) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      💡 Smart Recommendations
                    </div>
                    {formatRec && (
                      <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                        <strong>Format:</strong> {formatRec.format.toUpperCase()} - {formatRec.reason}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResizeOptions(prev => ({ 
                            ...prev, 
                            format: formatRec.format as ResizeOptions['format']
                          }))}
                          className="ml-2 h-5 px-2 text-xs"
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                    {qualityRec && (
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Quality:</strong> {qualityRec.quality}% - {qualityRec.reason}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResizeOptions(prev => ({ 
                            ...prev, 
                            quality: qualityRec.quality
                          }))}
                          className="ml-2 h-5 px-2 text-xs"
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quality (for JPEG/WebP) */}
                {(resizeOptions.format === 'jpeg' || resizeOptions.format === 'webp' || 
                  (resizeOptions.format === 'original' && selectedImage.file.type.includes('jpeg'))) && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quality: {resizeOptions.quality}%
                      {qualityRec && resizeOptions.quality === qualityRec.quality && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Recommended</span>
                      )}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={resizeOptions.quality}
                      onChange={(e) => setResizeOptions(prev => ({ 
                        ...prev, 
                        quality: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Smaller file (10%)</span>
                      <span>Best quality (100%)</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResizeOptions(prev => ({ ...prev, quality: 75 }))}
                        className="text-xs h-6 px-2"
                      >
                        Web (75%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResizeOptions(prev => ({ ...prev, quality: 90 }))}
                        className="text-xs h-6 px-2"
                      >
                        High (90%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResizeOptions(prev => ({ ...prev, quality: 95 }))}
                        className="text-xs h-6 px-2"
                      >
                        Max (95%)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Output Prefix */}
                <div>
                  <label htmlFor="output-prefix" className="block text-sm font-medium text-foreground mb-2">
                    Output Filename Prefix
                  </label>
                  <Input
                    id="output-prefix"
                    type="text"
                    value={resizeOptions.outputPrefix}
                    onChange={(e) => setResizeOptions(prev => ({ 
                      ...prev, 
                      outputPrefix: e.target.value 
                    }))}
                    placeholder="resized"
                    className="text-sm"
                  />
                </div>

                {/* Quick Size Buttons */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Quick Sizes</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const scale = 0.5
                        handleWidthChange(Math.round(selectedImage.originalWidth * scale))
                      }}
                      className="text-xs h-7"
                    >
                      50% Size
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const scale = 0.25
                        handleWidthChange(Math.round(selectedImage.originalWidth * scale))
                      }}
                      className="text-xs h-7"
                    >
                      25% Size
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const scale = 2
                        handleWidthChange(Math.round(selectedImage.originalWidth * scale))
                      }}
                      className="text-xs h-7"
                    >
                      2× Size
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleWidthChange(selectedImage.originalWidth)
                      }}
                      className="text-xs h-7"
                    >
                      Original
                    </Button>
                  </div>
                </div>

                {/* Batch Options */}
                {images.length > 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Batch Options</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Apply current settings to all images
                          const totalEstimatedSize = images.reduce((total, _img) => {
                            const dims = previewDimensions || { width: resizeOptions.width, height: resizeOptions.height }
                            return total + estimateFileSize(dims.width, dims.height)
                          }, 0)
                          
                          if (totalEstimatedSize > 100 * 1024 * 1024) { // > 100MB
                            setError('Estimated total size too large. Consider reducing quality or dimensions.')
                          } else {
                            setError(null)
                          }
                        }}
                        className="text-xs h-7"
                      >
                        📊 Estimate Total
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Auto-optimize settings for batch
                          if (formatRec) {
                            setResizeOptions(prev => ({ 
                              ...prev, 
                              format: formatRec.format as ResizeOptions['format'],
                              quality: qualityRec?.quality || 85
                            }))
                          }
                        }}
                        className="text-xs h-7"
                      >
                        ⚡ Auto-Optimize
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resize Button */}
                <Button
                  onClick={resizeImages}
                  disabled={isProcessing || images.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? 'Resizing Images...' : `Resize ${images.length} Image${images.length !== 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processing images...</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Results */}
          {resizedResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resized Images ({resizedResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resizedResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          🖼️ {result.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {result.dimensions} • {formatFileSize(result.size)}
                        </p>
                      </div>
                      <a href={result.url} download={result.name}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Download
                        </Button>
                      </a>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resizedResults.forEach(result => {
                          const link = document.createElement('a')
                          link.href = result.url
                          link.download = result.name
                          link.click()
                        })
                      }}
                      className="w-full text-sm"
                    >
                      Download All Images
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• Smart resizing with multiple modes (fit, fill, exact, stretch)</p>
                <p>• Social media presets for popular platforms</p>
                <p>• Batch processing with quality optimization</p>
                <p>• Support for JPEG, PNG, WebP formats</p>
                <p>• All processing happens locally in your browser</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )

  // Format file size helper
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
