'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PDFDocument } from 'pdf-lib'

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  pageCount?: number
  thumbnail?: string
}

interface SplitRange {
  id: string
  name: string
  startPage: number
  endPage: number
  selected: boolean
}

interface SplitOptions {
  method: 'pages' | 'ranges' | 'size'
  pagesPerSplit: number
  customRanges: SplitRange[]
  maxSizeKB: number
  outputPrefix: string
}

export function PDFSplitter() {
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null)
  const [splitOptions, setSplitOptions] = useState<SplitOptions>({
    method: 'pages',
    pagesPerSplit: 1,
    customRanges: [],
    maxSizeKB: 1024,
    outputPrefix: 'split'
  })
  const [isSplitting, setIsSplitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splitResults, setSplitResults] = useState<{ name: string; url: string; pages: number }[]>([])
  const [progress, setProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const splitUrlsRef = useRef<string[]>([])

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      splitUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      if (pdfFile?.thumbnail) {
        URL.revokeObjectURL(pdfFile.thumbnail)
      }
    }
  }, [pdfFile])

  // Analyze PDF file to get page count and generate thumbnail
  const analyzePDF = useCallback(async (file: File): Promise<{ pageCount: number; thumbnail: string }> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pageCount = pdfDoc.getPageCount()
      
      // Generate simple thumbnail
      const canvas = document.createElement('canvas')
      canvas.width = 120
      canvas.height = 160
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Draw PDF thumbnail placeholder
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(0, 0, 120, 160)
        ctx.strokeStyle = '#dee2e6'
        ctx.strokeRect(0, 0, 120, 160)
        
        // Draw PDF info
        ctx.fillStyle = '#dc3545'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('PDF', 60, 50)
        
        ctx.fillStyle = '#6c757d'
        ctx.font = '12px Arial'
        ctx.fillText(`${pageCount} pages`, 60, 80)
        
        ctx.font = '10px Arial'
        const fileName = file.name.length > 15 ? file.name.slice(0, 12) + '...' : file.name
        ctx.fillText(fileName, 60, 100)
      }
      
      return {
        pageCount,
        thumbnail: canvas.toDataURL()
      }
    } catch (error) {
      return {
        pageCount: 1,
        thumbnail: ''
      }
    }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      setError('PDF file size must be less than 100MB')
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setSplitResults([])

    try {
      const { pageCount, thumbnail } = await analyzePDF(file)
      
      const pdfFileData: PDFFile = {
        id: `pdf-${Date.now()}`,
        file,
        name: file.name,
        size: file.size,
        pageCount,
        thumbnail
      }

      setPdfFile(pdfFileData)
      
      // Generate default ranges for range splitting
      const defaultRanges: SplitRange[] = []
      for (let i = 1; i <= pageCount; i++) {
        defaultRanges.push({
          id: `range-${i}`,
          name: `Page ${i}`,
          startPage: i,
          endPage: i,
          selected: false
        })
      }
      
      setSplitOptions(prev => ({
        ...prev,
        customRanges: defaultRanges
      }))
    } catch (err) {
      setError('Failed to analyze PDF file')
    } finally {
      setIsAnalyzing(false)
    }
  }, [analyzePDF])

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Split PDF functionality
  const splitPDF = useCallback(async () => {
    if (!pdfFile) {
      setError('Please select a PDF file to split')
      return
    }

    setIsSplitting(true)
    setError(null)
    setProgress(0)
    setSplitResults([])

    // Clean up previous URLs
    splitUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    splitUrlsRef.current = []

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)
      const totalPages = sourcePdf.getPageCount()
      const results: { name: string; url: string; pages: number }[] = []

      if (splitOptions.method === 'pages') {
        // Split by pages per file
        const pagesPerSplit = splitOptions.pagesPerSplit
        const totalSplits = Math.ceil(totalPages / pagesPerSplit)

        for (let i = 0; i < totalSplits; i++) {
          const startPage = i * pagesPerSplit
          const endPage = Math.min(startPage + pagesPerSplit - 1, totalPages - 1)
          
          const newPdf = await PDFDocument.create()
          const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx)
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
          
          copiedPages.forEach(page => newPdf.addPage(page))
          
          const pdfBytes = await newPdf.save()
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          
          splitUrlsRef.current.push(url)
          results.push({
            name: `${splitOptions.outputPrefix}_${String(i + 1).padStart(3, '0')}.pdf`,
            url,
            pages: endPage - startPage + 1
          })
          
          setProgress(Math.round(((i + 1) / totalSplits) * 100))
        }
      } else if (splitOptions.method === 'ranges') {
        // Split by custom ranges
        const selectedRanges = splitOptions.customRanges.filter(range => range.selected)
        
        if (selectedRanges.length === 0) {
          throw new Error('Please select at least one range to split')
        }

        for (let i = 0; i < selectedRanges.length; i++) {
          const range = selectedRanges[i]
          const newPdf = await PDFDocument.create()
          
          const pageIndices = Array.from(
            { length: range.endPage - range.startPage + 1 }, 
            (_, idx) => range.startPage - 1 + idx
          )
          
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
          copiedPages.forEach(page => newPdf.addPage(page))
          
          const pdfBytes = await newPdf.save()
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          
          splitUrlsRef.current.push(url)
          results.push({
            name: `${splitOptions.outputPrefix}_${range.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            url,
            pages: range.endPage - range.startPage + 1
          })
          
          setProgress(Math.round(((i + 1) / selectedRanges.length) * 100))
        }
      } else if (splitOptions.method === 'size') {
        // Split by file size (approximate)
        const targetSizeBytes = splitOptions.maxSizeKB * 1024
        const avgBytesPerPage = pdfFile.size / totalPages
        const estimatedPagesPerSplit = Math.max(1, Math.floor(targetSizeBytes / avgBytesPerPage))
        
        let currentPage = 0
        let splitIndex = 0
        
        while (currentPage < totalPages) {
          const endPage = Math.min(currentPage + estimatedPagesPerSplit - 1, totalPages - 1)
          
          const newPdf = await PDFDocument.create()
          const pageIndices = Array.from({ length: endPage - currentPage + 1 }, (_, idx) => currentPage + idx)
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
          
          copiedPages.forEach(page => newPdf.addPage(page))
          
          const pdfBytes = await newPdf.save()
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          
          splitUrlsRef.current.push(url)
          results.push({
            name: `${splitOptions.outputPrefix}_${String(splitIndex + 1).padStart(3, '0')}.pdf`,
            url,
            pages: endPage - currentPage + 1
          })
          
          currentPage = endPage + 1
          splitIndex++
          setProgress(Math.round((currentPage / totalPages) * 100))
        }
      }

      setSplitResults(results)
      setProgress(100)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF split failed'
      setError(errorMessage)
    } finally {
      setIsSplitting(false)
    }
  }, [pdfFile, splitOptions])

  // Add/remove custom range
  const addCustomRange = useCallback(() => {
    if (!pdfFile) return
    
    const newRange: SplitRange = {
      id: `range-${Date.now()}`,
      name: `Range ${splitOptions.customRanges.length + 1}`,
      startPage: 1,
      endPage: Math.min(5, pdfFile.pageCount || 1),
      selected: true
    }
    
    setSplitOptions(prev => ({
      ...prev,
      customRanges: [...prev.customRanges, newRange]
    }))
  }, [pdfFile, splitOptions.customRanges.length])

  const updateCustomRange = useCallback((id: string, updates: Partial<SplitRange>) => {
    setSplitOptions(prev => ({
      ...prev,
      customRanges: prev.customRanges.map(range => 
        range.id === id ? { ...range, ...updates } : range
      )
    }))
  }, [])

  const removeCustomRange = useCallback((id: string) => {
    setSplitOptions(prev => ({
      ...prev,
      customRanges: prev.customRanges.filter(range => range.id !== id)
    }))
  }, [])

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">Advanced PDF Splitter</h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Split PDF files by pages, ranges, or file size with professional precision
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Multiple split methods</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Custom ranges</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Size-based splitting</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Upload & Split Management */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF File</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-4">📄</div>
                <p className="text-foreground font-medium mb-2 text-sm sm:text-base">
                  Drop PDF file here or click to browse
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Supports PDF files up to 100MB
                </p>
                {isAnalyzing && (
                  <p className="text-xs sm:text-sm text-primary mt-2">Analyzing PDF...</p>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* File Info */}
          {pdfFile && (
            <Card>
              <CardHeader>
                <CardTitle>PDF File Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/20">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 self-center sm:self-start">
                    {pdfFile.thumbnail ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={pdfFile.thumbnail}
                        alt={`${pdfFile.name} thumbnail`}
                        className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">PDF</span>
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0 w-full">
                    <h4 className="font-medium text-foreground truncate text-sm sm:text-base mb-2">
                      📄 {pdfFile.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Pages:</span> {pdfFile.pageCount}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(pdfFile.size)}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pdfFile.thumbnail) {
                          URL.revokeObjectURL(pdfFile.thumbnail)
                        }
                        setPdfFile(null)
                        setSplitResults([])
                        setError(null)
                      }}
                      className="mt-3 text-xs h-7"
                    >
                      Remove File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Split Options Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Split Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Split Method
                </label>
                <select
                  value={splitOptions.method}
                  onChange={(e) => setSplitOptions(prev => ({ 
                    ...prev, 
                    method: e.target.value as SplitOptions['method']
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="pages">Split by Pages</option>
                  <option value="ranges">Split by Custom Ranges</option>
                  <option value="size">Split by File Size</option>
                </select>
              </div>

              {splitOptions.method === 'pages' && (
                <div>
                  <label htmlFor="pages-per-split" className="block text-sm font-medium text-foreground mb-2">
                    Pages per Split
                  </label>
                  <Input
                    id="pages-per-split"
                    type="number"
                    min={1}
                    max={pdfFile?.pageCount || 1}
                    value={splitOptions.pagesPerSplit}
                    onChange={(e) => setSplitOptions(prev => ({ 
                      ...prev, 
                      pagesPerSplit: parseInt(e.target.value) || 1 
                    }))}
                    className="text-sm"
                  />
                </div>
              )}

              {splitOptions.method === 'size' && (
                <div>
                  <label htmlFor="max-size" className="block text-sm font-medium text-foreground mb-2">
                    Max Size per File (KB)
                  </label>
                  <Input
                    id="max-size"
                    type="number"
                    min={100}
                    value={splitOptions.maxSizeKB}
                    onChange={(e) => setSplitOptions(prev => ({ 
                      ...prev, 
                      maxSizeKB: parseInt(e.target.value) || 1024 
                    }))}
                    className="text-sm"
                  />
                </div>
              )}

              <div>
                <label htmlFor="output-prefix" className="block text-sm font-medium text-foreground mb-2">
                  Output File Prefix
                </label>
                <Input
                  id="output-prefix"
                  type="text"
                  value={splitOptions.outputPrefix}
                  onChange={(e) => setSplitOptions(prev => ({ 
                    ...prev, 
                    outputPrefix: e.target.value 
                  }))}
                  placeholder="split"
                  className="text-sm"
                />
              </div>

              {/* Quick Presets */}
              {pdfFile && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSplitOptions(prev => ({ 
                        ...prev, 
                        method: 'pages', 
                        pagesPerSplit: 1 
                      }))}
                      className="text-xs h-8"
                    >
                      📄 Single Pages
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSplitOptions(prev => ({ 
                        ...prev, 
                        method: 'pages', 
                        pagesPerSplit: Math.ceil((pdfFile.pageCount || 1) / 2)
                      }))}
                      className="text-xs h-8"
                    >
                      📄 Two Parts
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSplitOptions(prev => ({ 
                        ...prev, 
                        method: 'pages', 
                        pagesPerSplit: 5 
                      }))}
                      className="text-xs h-8"
                    >
                      📄 5 Pages Each
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSplitOptions(prev => ({ 
                        ...prev, 
                        method: 'size', 
                        maxSizeKB: 1024 
                      }))}
                      className="text-xs h-8"
                    >
                      📄 1MB Max
                    </Button>
                  </div>
                </div>
              )}

              {/* Split Button */}
              <Button
                onClick={splitPDF}
                disabled={isSplitting || !pdfFile}
                className="w-full"
                size="lg"
              >
                {isSplitting ? 'Splitting PDF...' : 'Split PDF'}
              </Button>
            </CardContent>
          </Card>

          {/* Custom Ranges (when method is ranges) */}
          {splitOptions.method === 'ranges' && pdfFile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Custom Ranges</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomRange}
                    className="text-xs h-7"
                  >
                    + Add Range
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {splitOptions.customRanges.map((range) => (
                  <div key={range.id} className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={range.selected}
                        onChange={(e) => updateCustomRange(range.id, { selected: e.target.checked })}
                        className="rounded"
                      />
                      <Input
                        value={range.name}
                        onChange={(e) => updateCustomRange(range.id, { name: e.target.value })}
                        className="text-xs h-7 flex-1"
                        placeholder="Range name"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeCustomRange(range.id)}
                        className="h-7 w-7 p-0"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">From Page</label>
                        <Input
                          type="number"
                          min={1}
                          max={pdfFile.pageCount}
                          value={range.startPage}
                          onChange={(e) => updateCustomRange(range.id, { 
                            startPage: Math.max(1, Math.min(parseInt(e.target.value) || 1, pdfFile.pageCount || 1))
                          })}
                          className="text-xs h-7"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">To Page</label>
                        <Input
                          type="number"
                          min={range.startPage}
                          max={pdfFile.pageCount}
                          value={range.endPage}
                          onChange={(e) => updateCustomRange(range.id, { 
                            endPage: Math.max(range.startPage, Math.min(parseInt(e.target.value) || range.startPage, pdfFile.pageCount || 1))
                          })}
                          className="text-xs h-7"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Pages: {range.endPage - range.startPage + 1}
                    </div>
                  </div>
                ))}
                
                {splitOptions.customRanges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No custom ranges defined</p>
                    <p className="text-xs mt-1">Click &quot;Add Range&quot; to create split ranges</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Split Progress */}
          {isSplitting && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Splitting PDF...</span>
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

          {/* Split Results */}
          {splitResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Split Results ({splitResults.length} files)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {splitResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          📄 {result.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {result.pages} page{result.pages !== 1 ? 's' : ''}
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
                        splitResults.forEach(result => {
                          const link = document.createElement('a')
                          link.href = result.url
                          link.download = result.name
                          link.click()
                        })
                      }}
                      className="w-full text-sm"
                    >
                      Download All Files
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
                <p>• Split PDFs by pages, custom ranges, or file size</p>
                <p>• Preserves original content, formatting, and quality</p>
                <p>• Multiple output formats and naming options</p>
                <p>• All processing happens locally in your browser</p>
                <p>• No files are uploaded to external servers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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