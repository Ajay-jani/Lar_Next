'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ColorFormat {
  hex: string
  rgb: string
  hsl: string
  hsv: string
  cmyk: string
}

interface PaletteColor {
  id: string
  hex: string
  name?: string
  locked?: boolean
}



const COLOR_HARMONY_TYPES = {
  monochromatic: 'Monochromatic',
  analogous: 'Analogous',
  complementary: 'Complementary',
  triadic: 'Triadic',
  tetradic: 'Tetradic',
  splitComplementary: 'Split Complementary'
}

const POPULAR_PALETTES = [
  { name: 'Ocean Breeze', colors: ['#0077be', '#00a8cc', '#40e0d0', '#87ceeb', '#e0f6ff'] },
  { name: 'Sunset Glow', colors: ['#ff6b35', '#f7931e', '#ffd23f', '#06ffa5', '#b19cd9'] },
  { name: 'Forest Deep', colors: ['#2d5016', '#3e6b1f', '#4f7942', '#7ba05b', '#a8c686'] },
  { name: 'Royal Purple', colors: ['#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd'] },
  { name: 'Warm Earth', colors: ['#8b4513', '#cd853f', '#daa520', '#f4a460', '#ffe4b5'] },
  { name: 'Cool Mint', colors: ['#006a4e', '#40826d', '#5f9ea0', '#87ceeb', '#b0e0e6'] }
]

export function ColorPalette() {
  const [baseColor, setBaseColor] = useState('#3b82f6')
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>([])
  const [harmonyType, setHarmonyType] = useState<keyof typeof COLOR_HARMONY_TYPES>('complementary')
  const [paletteSize, setPaletteSize] = useState(5)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [colorFormats, setColorFormats] = useState<ColorFormat | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportFormat, setExportFormat] = useState<'css' | 'json' | 'scss' | 'tailwind'>('css')
  const [paletteName, setPaletteName] = useState('My Palette')
  
  // Refs for cleanup
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Color conversion utilities
  const hexToRgb = useCallback((hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0]
  }, [])

  const rgbToHsl = useCallback((r: number, g: number, b: number): [number, number, number] => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
  }, [])

  const hslToHex = useCallback((h: number, s: number, l: number): string => {
    h /= 360
    s /= 100
    l /= 100

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }, [])

  const rgbToCmyk = useCallback((r: number, g: number, b: number): [number, number, number, number] => {
    r /= 255
    g /= 255
    b /= 255

    const k = 1 - Math.max(r, Math.max(g, b))
    const c = k === 1 ? 0 : (1 - r - k) / (1 - k)
    const m = k === 1 ? 0 : (1 - g - k) / (1 - k)
    const y = k === 1 ? 0 : (1 - b - k) / (1 - k)

    return [
      Math.round(c * 100),
      Math.round(m * 100),
      Math.round(y * 100),
      Math.round(k * 100)
    ]
  }, [])

  const getColorFormats = useCallback((hex: string): ColorFormat => {
    const [r, g, b] = hexToRgb(hex)
    const [h, s, l] = rgbToHsl(r, g, b)
    const [c, m, y, k] = rgbToCmyk(r, g, b)

    return {
      hex: hex.toUpperCase(),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`,
      hsv: `hsv(${h}, ${s}%, ${Math.round((2 - s/100) * l/2 * 100)}%)`,
      cmyk: `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`
    }
  }, [hexToRgb, rgbToHsl, rgbToCmyk])

  // Color harmony generation
  const generateHarmony = useCallback((baseHex: string, type: keyof typeof COLOR_HARMONY_TYPES, count: number): string[] => {
    const [r, g, b] = hexToRgb(baseHex)
    const [h, s, l] = rgbToHsl(r, g, b)
    const colors: string[] = [baseHex]

    switch (type) {
      case 'monochromatic':
        for (let i = 1; i < count; i++) {
          const newL = Math.max(10, Math.min(90, l + (i * 15) - 30))
          colors.push(hslToHex(h, s, newL))
        }
        break

      case 'analogous':
        for (let i = 1; i < count; i++) {
          const newH = (h + (i * 30)) % 360
          colors.push(hslToHex(newH, s, l))
        }
        break

      case 'complementary':
        colors.push(hslToHex((h + 180) % 360, s, l))
        for (let i = 2; i < count; i++) {
          const newH = (h + (i * 60)) % 360
          colors.push(hslToHex(newH, Math.max(20, s - 20), l))
        }
        break

      case 'triadic':
        colors.push(hslToHex((h + 120) % 360, s, l))
        colors.push(hslToHex((h + 240) % 360, s, l))
        for (let i = 3; i < count; i++) {
          const newH = (h + (i * 72)) % 360
          colors.push(hslToHex(newH, Math.max(20, s - 10), l))
        }
        break

      case 'tetradic':
        colors.push(hslToHex((h + 90) % 360, s, l))
        colors.push(hslToHex((h + 180) % 360, s, l))
        colors.push(hslToHex((h + 270) % 360, s, l))
        for (let i = 4; i < count; i++) {
          const newH = (h + (i * 45)) % 360
          colors.push(hslToHex(newH, Math.max(20, s - 15), l))
        }
        break

      case 'splitComplementary':
        colors.push(hslToHex((h + 150) % 360, s, l))
        colors.push(hslToHex((h + 210) % 360, s, l))
        for (let i = 3; i < count; i++) {
          const newH = (h + (i * 60)) % 360
          colors.push(hslToHex(newH, Math.max(20, s - 10), l))
        }
        break
    }

    return colors.slice(0, count)
  }, [hexToRgb, rgbToHsl, hslToHex])

  // Generate palette
  const generatePalette = useCallback(async () => {
    setIsGenerating(true)
    
    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const colors = generateHarmony(baseColor, harmonyType, paletteSize)
      const paletteColors: PaletteColor[] = colors.map((color, index) => ({
        id: `color-${index}`,
        hex: color,
        name: index === 0 ? 'Base Color' : `Color ${index + 1}`,
        locked: false
      }))

      setPaletteColors(paletteColors)
    } catch (error) {
      // Palette generation failed, continue silently
    } finally {
      setIsGenerating(false)
    }
  }, [baseColor, harmonyType, paletteSize, generateHarmony])

  // Auto-generate on settings change
  useEffect(() => {
    generatePalette()
  }, [generatePalette])

  // Handle color selection
  const handleColorSelect = useCallback((hex: string) => {
    setSelectedColor(hex)
    setColorFormats(getColorFormats(hex))
  }, [getColorFormats])

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }, [])

  // Export palette
  const exportPalette = useCallback(() => {
    const colors = paletteColors.map(c => c.hex)
    let content = ''

    switch (exportFormat) {
      case 'css':
        content = `:root {\n${colors.map((color, i) => `  --color-${i + 1}: ${color};`).join('\n')}\n}`
        break
      case 'scss':
        content = colors.map((color, i) => `$color-${i + 1}: ${color};`).join('\n')
        break
      case 'json':
        content = JSON.stringify({
          name: paletteName,
          colors: colors.map((color, i) => ({
            name: `color-${i + 1}`,
            ...getColorFormats(color)
          }))
        }, null, 2)
        break
      case 'tailwind':
        content = `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n${colors.map((color, i) => `          ${i + 1}: '${color}',`).join('\n')}\n        }\n      }\n    }\n  }\n}`
        break
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${paletteName.toLowerCase().replace(/\s+/g, '-')}.${exportFormat === 'json' ? 'json' : exportFormat === 'tailwind' ? 'js' : exportFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [paletteColors, exportFormat, paletteName, getColorFormats])

  // Load popular palette
  const loadPopularPalette = useCallback((palette: typeof POPULAR_PALETTES[0]) => {
    const colors: PaletteColor[] = palette.colors.map((color, index) => ({
      id: `color-${index}`,
      hex: color,
      name: `${palette.name} ${index + 1}`,
      locked: false
    }))
    setPaletteColors(colors)
    setBaseColor(palette.colors[0])
    setPaletteName(palette.name)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Color Palette Generator</h1>
        <p className="text-muted-foreground text-lg">
          Create beautiful color harmonies and export them in multiple formats
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Color harmonies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Multiple formats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Export ready</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Base Color */}
          <Card>
            <CardHeader>
              <CardTitle>Base Color</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="base-color" className="block text-sm font-medium text-foreground mb-2">
                  Choose Base Color
                </label>
                <div className="flex gap-3">
                  <input
                    id="base-color"
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-16 h-12 border border-border rounded-lg cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Harmony Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Harmony Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="harmony-type" className="block text-sm font-medium text-foreground mb-2">
                  Color Harmony
                </label>
                <select
                  id="harmony-type"
                  value={harmonyType}
                  onChange={(e) => setHarmonyType(e.target.value as keyof typeof COLOR_HARMONY_TYPES)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.entries(COLOR_HARMONY_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="palette-size" className="block text-sm font-medium text-foreground mb-2">
                  Palette Size: {paletteSize} colors
                </label>
                <Input
                  id="palette-size"
                  type="range"
                  min="3"
                  max="10"
                  value={paletteSize}
                  onChange={(e) => setPaletteSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Popular Palettes */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Palettes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {POPULAR_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    onClick={() => loadPopularPalette(palette)}
                    className="w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {palette.colors.slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{palette.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="palette-name" className="block text-sm font-medium text-foreground mb-2">
                  Palette Name
                </label>
                <Input
                  id="palette-name"
                  type="text"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  placeholder="My Palette"
                />
              </div>

              <div>
                <label htmlFor="export-format" className="block text-sm font-medium text-foreground mb-2">
                  Export Format
                </label>
                <select
                  id="export-format"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="css">CSS Variables</option>
                  <option value="scss">SCSS Variables</option>
                  <option value="json">JSON</option>
                  <option value="tailwind">Tailwind Config</option>
                </select>
              </div>

              <Button 
                onClick={exportPalette}
                disabled={paletteColors.length === 0}
                className="w-full"
              >
                Export Palette
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Palette Display */}
        <div className="xl:col-span-2 space-y-6">
          {/* Generated Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Generated Palette
                <Button
                  onClick={generatePalette}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                >
                  {isGenerating ? 'Generating...' : 'Regenerate'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paletteColors.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {paletteColors.map((color) => (
                      <div
                        key={color.id}
                        className="group cursor-pointer"
                        onClick={() => handleColorSelect(color.hex)}
                      >
                        <div
                          className="w-full h-24 rounded-lg border-2 border-border group-hover:border-primary transition-colors mb-2"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">{color.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Palette Preview Bar */}
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    {paletteColors.map((color) => (
                      <div
                        key={`bar-${color.id}`}
                        className="flex-1 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => handleColorSelect(color.hex)}
                        title={`${color.name}: ${color.hex}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-6xl mb-4">🎨</div>
                  <p>Your color palette will appear here</p>
                  <p className="text-sm mt-2">Choose a base color and harmony type to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Color Details */}
          {selectedColor && colorFormats && (
            <Card>
              <CardHeader>
                <CardTitle>Color Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div
                      className="w-full h-32 rounded-lg border border-border mb-4"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Selected Color</h3>
                      <p className="text-2xl font-mono text-foreground">{selectedColor}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Color Formats</h4>
                    {Object.entries(colorFormats).map(([format, value]) => (
                      <div key={format} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm font-medium text-foreground uppercase">{format}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-muted-foreground">{value}</code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(value)}
                            className="h-6 px-2 text-xs"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Hidden canvas for any future image generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}