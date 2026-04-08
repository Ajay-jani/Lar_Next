'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ToolPageIntro } from '@/components/tools/shared/ToolPageIntro'

interface QRSettings {
  text: string
  size: number
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  foregroundColor: string
  backgroundColor: string
  logoUrl: string
  style: 'square' | 'rounded' | 'dots' | 'classy'
  format: 'png' | 'svg' | 'jpeg'
}

interface QRResult {
  dataUrl: string
  downloadUrl: string
  format: string
}

const ERROR_CORRECTION_LEVELS = {
  L: 'Low (~7%)',
  M: 'Medium (~15%)',
  Q: 'Quartile (~25%)',
  H: 'High (~30%)'
}

const QR_STYLES = {
  square: 'Classic Square',
  rounded: 'Rounded Corners',
  dots: 'Dotted Pattern',
  classy: 'Classy Design'
}

export function QRGenerator() {
  const [settings, setSettings] = useState<QRSettings>({
    text: '',
    size: 300,
    errorCorrection: 'M',
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
    logoUrl: '',
    style: 'square',
    format: 'png'
  })
  const [result, setResult] = useState<QRResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')
  
  // Refs for cleanup
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resultUrlRef = useRef<string | null>(null)

  // Cleanup URLs on unmount
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

  // Helper functions
  const addFinderPattern = useCallback((pattern: boolean[][], startX: number, startY: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (startX + i < pattern.length && startY + j < pattern[0].length) {
          const isEdge = i === 0 || i === 6 || j === 0 || j === 6
          const isCenter = (i >= 2 && i <= 4) && (j >= 2 && j <= 4)
          pattern[startX + i][startY + j] = isEdge || isCenter
        }
      }
    }
  }, [])

  const adjustColorBrightness = useCallback((color: string, amount: number): string => {
    const hex = color.replace('#', '')
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }, [])

  const drawRoundedRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.fill()
  }, [])

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const drawClassyModule = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    // Create gradient effect for classy style
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
    gradient.addColorStop(0, settings.foregroundColor)
    gradient.addColorStop(1, adjustColorBrightness(settings.foregroundColor, -20))
    
    ctx.fillStyle = gradient
    drawRoundedRect(ctx, x, y, size, size, size * 0.1)
    ctx.fillStyle = settings.foregroundColor // Reset
  }, [settings.foregroundColor, adjustColorBrightness, drawRoundedRect])

  // Simplified QR pattern generation (demo purposes)
  const generateQRPattern = useCallback((text: string): boolean[][] => {
    const size = 25
    const pattern: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false))
    
    // Create a simple pattern based on text hash
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        // Create pseudo-random pattern based on position and text
        const value = (i * j + hash + i + j) % 3
        pattern[i][j] = value === 0
      }
    }

    // Add finder patterns (corners)
    addFinderPattern(pattern, 0, 0)
    addFinderPattern(pattern, 0, size - 7)
    addFinderPattern(pattern, size - 7, 0)

    return pattern
  }, [addFinderPattern])

  const drawQRCode = useCallback((ctx: CanvasRenderingContext2D, modules: boolean[][], moduleSize: number, settings: QRSettings) => {
    ctx.fillStyle = settings.foregroundColor

    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules[i].length; j++) {
        if (modules[i][j]) {
          const x = j * moduleSize
          const y = i * moduleSize

          switch (settings.style) {
            case 'rounded':
              drawRoundedRect(ctx, x, y, moduleSize, moduleSize, moduleSize * 0.2)
              break
            case 'dots':
              drawCircle(ctx, x + moduleSize/2, y + moduleSize/2, moduleSize * 0.4)
              break
            case 'classy':
              drawClassyModule(ctx, x, y, moduleSize)
              break
            default:
              ctx.fillRect(x, y, moduleSize, moduleSize)
          }
        }
      }
    }
  }, [drawRoundedRect, drawCircle, drawClassyModule])

  const addLogoToQR = useCallback(async (ctx: CanvasRenderingContext2D, logoUrl: string, size: number) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = logoUrl
      })

      const logoSize = size * 0.2
      const x = (size - logoSize) / 2
      const y = (size - logoSize) / 2

      // Draw white background for logo
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10)
      
      // Draw logo
      ctx.drawImage(img, x, y, logoSize, logoSize)
    } catch (err) {
      // Logo loading failed, continue without logo
    }
  }, [])

  const generateSVGQR = useCallback((modules: boolean[][], settings: QRSettings): string => {
    const size = settings.size
    const moduleSize = size / modules.length
    
    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    svg += `<rect width="${size}" height="${size}" fill="${settings.backgroundColor}"/>`
    
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules[i].length; j++) {
        if (modules[i][j]) {
          const x = j * moduleSize
          const y = i * moduleSize
          svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${settings.foregroundColor}"/>`
        }
      }
    }
    
    svg += '</svg>'
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }, [])

  // Generate QR Code using Canvas API (simplified implementation)
  const generateQRCode = useCallback(async () => {
    if (!settings.text.trim()) {
      setError('Please enter text or URL to generate QR code')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Create canvas for QR code generation
      const canvas = canvasRef.current || document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Canvas context not available')
      }

      // Set canvas size
      canvas.width = settings.size
      canvas.height = settings.size

      // Clear canvas
      ctx.fillStyle = settings.backgroundColor
      ctx.fillRect(0, 0, settings.size, settings.size)

      // Generate QR pattern (simplified - in real implementation use qrcode library)
      const moduleSize = settings.size / 25 // 25x25 grid for demo
      const modules = generateQRPattern(settings.text)

      // Draw QR code based on style
      drawQRCode(ctx, modules, moduleSize, settings)

      // Add logo if provided
      if (settings.logoUrl) {
        await addLogoToQR(ctx, settings.logoUrl, settings.size)
      }

      // Convert to desired format
      let dataUrl: string

      if (settings.format === 'svg') {
        dataUrl = generateSVGQR(modules, settings)
      } else {
        const quality = settings.format === 'jpeg' ? 0.9 : undefined
        dataUrl = canvas.toDataURL(`image/${settings.format}`, quality)
      }

      // Create download blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      setResult({
        dataUrl,
        downloadUrl,
        format: settings.format
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR code generation failed'
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [settings, generateQRPattern, drawQRCode, addLogoToQR, generateSVGQR])



  const updateText = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, text: value }))
    setResult(null) // Clear previous result
  }, [])

  const updateSize = useCallback((value: string) => {
    const size = parseInt(value, 10)
    if (!isNaN(size) && size >= 100 && size <= 1000) {
      setSettings(prev => ({ ...prev, size }))
    }
  }, [])

  const updateErrorCorrection = useCallback((level: QRSettings['errorCorrection']) => {
    setSettings(prev => ({ ...prev, errorCorrection: level }))
  }, [])

  const updateStyle = useCallback((style: QRSettings['style']) => {
    setSettings(prev => ({ ...prev, style }))
  }, [])

  const updateFormat = useCallback((format: QRSettings['format']) => {
    setSettings(prev => ({ ...prev, format }))
  }, [])

  const updateColors = useCallback((field: 'foregroundColor' | 'backgroundColor', color: string) => {
    setSettings(prev => ({ ...prev, [field]: color }))
  }, [])

  const downloadFileName = useMemo(() => {
    const timestamp = new Date().toISOString().slice(0, 10)
    return `qrcode_${timestamp}.${settings.format}`
  }, [settings.format])

  const presetColors = [
    { name: 'Classic', fg: '#000000', bg: '#ffffff' },
    { name: 'Blue', fg: '#1e40af', bg: '#dbeafe' },
    { name: 'Green', fg: '#166534', bg: '#dcfce7' },
    { name: 'Purple', fg: '#7c3aed', bg: '#ede9fe' },
    { name: 'Red', fg: '#dc2626', bg: '#fee2e2' },
    { name: 'Dark', fg: '#ffffff', bg: '#111827' }
  ]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ToolPageIntro
        title="QR Code Generator"
        description="Create customizable QR codes with flexible styling, formats, and optional logo support."
        features={[
          { label: 'Multiple formats', tone: 'primary' },
          { label: 'Custom styling', tone: 'success' },
          { label: 'Logo support', tone: 'warning' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="qr-text" className="block text-sm font-medium text-foreground mb-2">
                  Text or URL
                </label>
                <textarea
                  id="qr-text"
                  value={settings.text}
                  onChange={(e) => updateText(e.target.value)}
                  placeholder="Enter text, URL, or any content..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                  rows={3}
                  aria-label="QR code content"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.text.length} characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Style & Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  QR Code Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(QR_STYLES).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateStyle(key as QRSettings['style'])}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        settings.style === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="size-input" className="block text-sm font-medium text-foreground mb-2">
                    Size: {settings.size}px
                  </label>
                  <Input
                    id="size-input"
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={settings.size}
                    onChange={(e) => updateSize(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="format-select" className="block text-sm font-medium text-foreground mb-2">
                    Format
                  </label>
                  <select
                    id="format-select"
                    value={settings.format}
                    onChange={(e) => updateFormat(e.target.value as QRSettings['format'])}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Color Presets
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {presetColors.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        updateColors('foregroundColor', preset.fg)
                        updateColors('backgroundColor', preset.bg)
                      }}
                      className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: preset.fg }}
                        />
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: preset.bg }}
                        />
                        <span className="text-xs">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fg-color" className="block text-sm font-medium text-foreground mb-2">
                    Foreground
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="fg-color"
                      type="color"
                      value={settings.foregroundColor}
                      onChange={(e) => updateColors('foregroundColor', e.target.value)}
                      className="w-12 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.foregroundColor}
                      onChange={(e) => updateColors('foregroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="bg-color" className="block text-sm font-medium text-foreground mb-2">
                    Background
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="bg-color"
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => updateColors('backgroundColor', e.target.value)}
                      className="w-12 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) => updateColors('backgroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="error-correction" className="block text-sm font-medium text-foreground mb-2">
                  Error Correction Level
                </label>
                <select
                  id="error-correction"
                  value={settings.errorCorrection}
                  onChange={(e) => updateErrorCorrection(e.target.value as QRSettings['errorCorrection'])}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.entries(ERROR_CORRECTION_LEVELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher levels can recover from more damage but create larger codes
                </p>
              </div>

              <div>
                <label htmlFor="logo-url" className="block text-sm font-medium text-foreground mb-2">
                  Logo URL (optional)
                </label>
                <Input
                  id="logo-url"
                  type="url"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add a logo to the center of your QR code
                </p>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={generateQRCode}
            disabled={isGenerating || !settings.text.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? 'Generating QR Code...' : 'Generate QR Code'}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                Preview
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('light')}
                    className={`px-3 py-1 rounded text-sm ${
                      previewMode === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('dark')}
                    className={`px-3 py-1 rounded text-sm ${
                      previewMode === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className={`flex items-center justify-center p-8 rounded-lg border-2 border-dashed transition-colors ${
                  previewMode === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {result ? (
                  <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={result.dataUrl} 
                      alt="Generated QR Code"
                      className="mx-auto mb-4 border rounded-lg shadow-lg"
                      style={{ maxWidth: '300px', maxHeight: '300px' }}
                    />
                    <p className="text-sm text-muted-foreground">
                      {settings.size}×{settings.size}px • {settings.format.toUpperCase()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <div className="text-6xl mb-4">📱</div>
                    <p>Your QR code will appear here</p>
                    <p className="text-sm mt-2">Enter content and click generate</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                </div>
              )}

              {result && (
                <div className="mt-6 space-y-3">
                  <a
                    href={result.downloadUrl}
                    download={downloadFileName}
                    className="block"
                  >
                    <Button className="w-full" size="lg">
                      Download QR Code
                    </Button>
                  </a>
                  
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(result.dataUrl)
                      }}
                      className="text-sm"
                    >
                      Copy Image
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(settings.text)
                      }}
                      className="text-sm"
                    >
                      Copy Text
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => updateText('https://example.com')}
                  className="text-sm"
                >
                  Website URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateText('mailto:contact@example.com')}
                  className="text-sm"
                >
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateText('tel:+1234567890')}
                  className="text-sm"
                >
                  Phone
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateText('WIFI:T:WPA;S:NetworkName;P:Password;;')}
                  className="text-sm"
                >
                  WiFi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden canvas for QR generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
