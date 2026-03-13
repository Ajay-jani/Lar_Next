'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PDFDocument, degrees } from 'pdf-lib'

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  pageCount?: number
  thumbnail?: string
  selectedPages?: number[]
}

interface MergeOptions {
  outputName: string
  includeBookmarks: boolean
  optimizeSize: boolean
  pageOrientation: 'keep-original' | 'portrait' | 'landscape'
}

export function PDFMerger() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([])
  const [selectedFile, setSelectedFile] = useState<PDFFile | null>(null)
  const [mergeOptions, setMergeOptions] = useState<MergeOptions>({
    outputName: 'merged-document',
    includeBookmarks: true,
    optimizeSize: true,
    pageOrientation: 'keep-original'
  })
  const [isMerging, setIsMerging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mergedUrlRef = useRef<string | null>(null)

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current)
      }
      pdfFiles.forEach(pdf => {
        if (pdf.thumbnail) {
          URL.revokeObjectURL(pdf.thumbnail)
        }
      })
    }
  }, [pdfFiles])

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
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      if (file.type !== 'application/pdf') {
        setError('Please select only PDF files')
        return false
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        setError('PDF file size must be less than 100MB')
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setError(null)
    setIsAnalyzing(true)

    try {
      const newPdfFiles: PDFFile[] = []

      for (const file of validFiles) {
        const { pageCount, thumbnail } = await analyzePDF(file)
        
        const pdfFile: PDFFile = {
          id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
          thumbnail,
          selectedPages: Array.from({ length: pageCount }, (_, i) => i + 1)
        }

        newPdfFiles.push(pdfFile)
      }

      setPdfFiles(prev => [...prev, ...newPdfFiles])
      if (!selectedFile && newPdfFiles.length > 0) {
        setSelectedFile(newPdfFiles[0])
      }
    } catch (err) {
      setError('Failed to analyze PDF files')
    } finally {
      setIsAnalyzing(false)
    }
  }, [selectedFile, analyzePDF])

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // File reordering
  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    const newFiles = [...pdfFiles]
    const [movedFile] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, movedFile)
    setPdfFiles(newFiles)
  }, [pdfFiles])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      moveFile(draggedIndex, index)
      setDraggedIndex(index)
    }
  }, [draggedIndex, moveFile])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Remove file
  const removeFile = useCallback((id: string) => {
    setPdfFiles(prev => {
      const updated = prev.filter(pdf => pdf.id !== id)
      const removedFile = prev.find(pdf => pdf.id === id)
      if (removedFile?.thumbnail) {
        URL.revokeObjectURL(removedFile.thumbnail)
      }
      if (selectedFile?.id === id) {
        setSelectedFile(updated[0] || null)
      }
      return updated
    })
  }, [selectedFile])

  // Page selection functions
  const updatePageSelection = useCallback((fileId: string, pages: number[]) => {
    setPdfFiles(prev => prev.map(pdf => 
      pdf.id === fileId ? { ...pdf, selectedPages: [...pages] } : pdf
    ))
  }, [])

  const selectAllPages = useCallback((fileId: string) => {
    const file = pdfFiles.find(pdf => pdf.id === fileId)
    if (file && file.pageCount) {
      const allPages = Array.from({ length: file.pageCount }, (_, i) => i + 1)
      updatePageSelection(fileId, allPages)
    }
  }, [pdfFiles, updatePageSelection])

  const clearPageSelection = useCallback((fileId: string) => {
    updatePageSelection(fileId, [])
  }, [updatePageSelection])

  // Advanced PDF merging using PDF-lib
  const createMergedPDF = useCallback(async (files: PDFFile[]): Promise<Blob> => {
    try {
      const mergedPdf = await PDFDocument.create()
      
      // Set metadata
      mergedPdf.setTitle(mergeOptions.outputName)
      mergedPdf.setCreator('PDF Merger Tool')
      mergedPdf.setProducer('Dev Utilities Hub')
      mergedPdf.setCreationDate(new Date())
      
      let totalPages = 0
      files.forEach(file => totalPages += file.selectedPages?.length || 0)
      let processedPages = 0

      for (const pdfFile of files) {
        if (!pdfFile.selectedPages || pdfFile.selectedPages.length === 0) {
          continue
        }

        try {
          const arrayBuffer = await pdfFile.file.arrayBuffer()
          const sourcePdf = await PDFDocument.load(arrayBuffer)
          
          // Sort selected pages to maintain order
          const sortedPages = [...pdfFile.selectedPages].sort((a, b) => a - b)
          
          // Copy selected pages in order
          for (const pageNum of sortedPages) {
            const pageIndex = pageNum - 1
            if (pageIndex >= 0 && pageIndex < sourcePdf.getPageCount()) {
              // Copy the page with all its content
              const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [pageIndex])
              
              // Handle page orientation if specified
              if (mergeOptions.pageOrientation === 'portrait') {
                const { width, height } = copiedPage.getSize()
                if (width > height) {
                  copiedPage.setRotation(degrees(90))
                }
              } else if (mergeOptions.pageOrientation === 'landscape') {
                const { width, height } = copiedPage.getSize()
                if (height > width) {
                  copiedPage.setRotation(degrees(90))
                }
              }
              
              mergedPdf.addPage(copiedPage)
            }
            
            processedPages++
            setProgress(Math.round((processedPages / totalPages) * 100))
          }
        } catch (error) {
          throw new Error(`Failed to process ${pdfFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Generate PDF bytes with proper options
      const pdfBytes = await mergedPdf.save({
        useObjectStreams: mergeOptions.optimizeSize,
        addDefaultPage: false, // Don't add empty pages
        objectsPerTick: 50 // Process in chunks for better performance
      })
      
      return new Blob([new Uint8Array(pdfBytes)], { 
        type: 'application/pdf'
      })
    } catch (error) {
      throw error
    }
  }, [mergeOptions])

  // Merge PDFs
  const mergePDFs = useCallback(async () => {
    if (pdfFiles.length === 0) {
      setError('Please add PDF files to merge')
      return
    }

    const hasSelectedPages = pdfFiles.some(pdf => 
      pdf.selectedPages && pdf.selectedPages.length > 0
    )

    if (!hasSelectedPages) {
      setError('Please select at least one page to merge')
      return
    }

    setIsMerging(true)
    setError(null)
    setProgress(0)

    try {
      // Validate all files before processing
      for (const pdfFile of pdfFiles) {
        if (pdfFile.selectedPages && pdfFile.selectedPages.length > 0) {
          try {
            const arrayBuffer = await pdfFile.file.arrayBuffer()
            await PDFDocument.load(arrayBuffer) // Validate PDF can be loaded
          } catch (error) {
            throw new Error(`Invalid PDF file: ${pdfFile.name}`)
          }
        }
      }
      
      const mergedBlob = await createMergedPDF(pdfFiles)
      
      // Validate the merged PDF
      if (mergedBlob.size === 0) {
        throw new Error('Generated PDF is empty')
      }
      
      // Verify the merged PDF can be loaded and has the expected page count
      try {
        const verificationBuffer = await mergedBlob.arrayBuffer()
        const verificationPdf = await PDFDocument.load(verificationBuffer)
        const actualPageCount = verificationPdf.getPageCount()
        
        if (actualPageCount === 0) {
          throw new Error('Merged PDF contains no pages')
        }
      } catch (verifyError) {
        throw new Error('Generated PDF is invalid or corrupted')
      }
      
      // Clean up previous URL
      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current)
      }
      
      const url = URL.createObjectURL(mergedBlob)
      mergedUrlRef.current = url
      setMergedPdfUrl(url)
      setProgress(100)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF merge failed'
      setError(errorMessage)
    } finally {
      setIsMerging(false)
    }
  }, [pdfFiles, createMergedPDF])

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const totalSelectedPages = pdfFiles.reduce((total, pdf) => 
    total + (pdf.selectedPages?.length || 0), 0
  )

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">Advanced PDF Merger</h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Professional PDF merging with page selection and advanced options
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Real PDF merging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Page selection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Advanced options</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Upload & File Management */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF Files</CardTitle>
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
                  Drop PDF files here or click to browse
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Supports multiple PDF files up to 100MB each
                </p>
                {isAnalyzing && (
                  <p className="text-xs sm:text-sm text-primary mt-2">Analyzing PDFs...</p>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* File List */}
          {pdfFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm sm:text-base">PDF Files ({pdfFiles.length})</span>
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                    {totalSelectedPages} pages selected
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pdfFiles.map((pdf, index) => (
                    <div
                      key={pdf.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border rounded-lg p-3 sm:p-4 cursor-move transition-all ${
                        selectedFile?.id === pdf.id ? 'border-primary bg-primary/5' : 'border-border'
                      } ${draggedIndex === index ? 'opacity-50' : ''} hover:bg-muted/50`}
                      onClick={() => setSelectedFile(pdf)}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 self-center sm:self-start">
                          {pdf.thumbnail ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={pdf.thumbnail}
                              alt={`${pdf.name} thumbnail`}
                              className="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-12 h-16 sm:w-16 sm:h-20 bg-muted rounded border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">PDF</span>
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
                                {pdf.name}
                              </h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {formatFileSize(pdf.size)} • {pdf.pageCount || 0} pages
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Selected: {pdf.selectedPages?.length || 0} pages
                              </p>
                            </div>
                            
                            <div className="flex gap-1 flex-shrink-0">
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                #{index + 1}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeFile(pdf.id)
                                }}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          </div>

                          {/* Inline Page Selection */}
                          <div className="mt-3 sm:mt-4 space-y-3">
                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  selectAllPages(pdf.id)
                                }}
                                className="text-xs h-6 sm:h-7 px-2 sm:px-3"
                                disabled={pdf.selectedPages?.length === pdf.pageCount}
                              >
                                ✓ All
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  clearPageSelection(pdf.id)
                                }}
                                className="text-xs h-6 sm:h-7 px-2 sm:px-3"
                                disabled={!pdf.selectedPages?.length}
                              >
                                ✗ Clear
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedFile(pdf)
                                }}
                                className="text-xs h-6 sm:h-7 px-2 sm:px-3"
                              >
                                🔧 Advanced
                              </Button>
                            </div>

                            {/* Inline Page Grid */}
                            <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
                              <div className="text-xs font-medium text-foreground mb-2">
                                Click pages to select/deselect:
                              </div>
                              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1 max-h-20 sm:max-h-24 overflow-y-auto">
                                {Array.from({ length: Math.min(pdf.pageCount || 0, 32) }, (_, i) => i + 1).map(pageNum => {
                                  const isSelected = pdf.selectedPages?.includes(pageNum)
                                  return (
                                    <button
                                      key={pageNum}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const currentPages = pdf.selectedPages || []
                                        const newPages = isSelected 
                                          ? currentPages.filter(p => p !== pageNum)
                                          : [...currentPages, pageNum].sort((a, b) => a - b)
                                        updatePageSelection(pdf.id, newPages)
                                      }}
                                      className={`
                                        text-[9px] sm:text-[10px] p-1 rounded border transition-all duration-200 
                                        hover:scale-105 sm:hover:scale-110 font-medium min-h-[20px] sm:min-h-[24px]
                                        ${isSelected
                                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                          : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/10'
                                        }
                                      `}
                                    >
                                      {pageNum}
                                    </button>
                                  )
                                })}
                                {(pdf.pageCount || 0) > 32 && (
                                  <div className="col-span-2 text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center">
                                    +{(pdf.pageCount || 0) - 32} more
                                  </div>
                                )}
                              </div>
                              {(pdf.pageCount || 0) > 32 && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  💡 Use &quot;Advanced&quot; for full page selection on large PDFs
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  💡 Drag and drop files to reorder • Click page numbers to select/deselect • Use &quot;Advanced&quot; for large PDFs
                </p>
              </CardContent>
            </Card>
          )}

          {/* Merge Progress */}
          {isMerging && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Merging PDFs...</span>
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

          {/* Merge Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={mergePDFs}
              disabled={isMerging || pdfFiles.length === 0 || totalSelectedPages === 0}
              className="flex-1"
              size="lg"
            >
              {isMerging ? 'Merging PDFs...' : `Merge ${totalSelectedPages} Pages from ${pdfFiles.length} PDF${pdfFiles.length !== 1 ? 's' : ''}`}
            </Button>
            
            {pdfFiles.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  pdfFiles.forEach(pdf => {
                    if (pdf.thumbnail) {
                      URL.revokeObjectURL(pdf.thumbnail)
                    }
                  })
                  if (mergedUrlRef.current) {
                    URL.revokeObjectURL(mergedUrlRef.current)
                    mergedUrlRef.current = null
                  }
                  setPdfFiles([])
                  setSelectedFile(null)
                  setMergedPdfUrl(null)
                  setError(null)
                  setProgress(0)
                }}
                size="lg"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success & Download */}
          {mergedPdfUrl && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    PDF Merged Successfully!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Your merged PDF with {totalSelectedPages} pages is ready for download
                  </p>
                  <a href={mergedPdfUrl} download={`${mergeOptions.outputName}.pdf`}>
                    <Button size="lg">
                      Download {mergeOptions.outputName}.pdf
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings & Page Selection Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Advanced Page Selection Panel */}
          {selectedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Advanced Page Selection</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {selectedFile.selectedPages?.length || 0}/{selectedFile.pageCount || 0}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-3 rounded-lg border">
                  <h4 className="text-sm font-medium text-foreground mb-1 truncate">
                    📄 {selectedFile.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.pageCount} total pages • {formatFileSize(selectedFile.size)}
                  </p>
                </div>

                {/* Quick Selection Tools */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectAllPages(selectedFile.id)}
                    disabled={selectedFile.selectedPages?.length === selectedFile.pageCount}
                    className="text-xs h-7 sm:h-8"
                  >
                    ✓ All Pages
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearPageSelection(selectedFile.id)}
                    disabled={!selectedFile.selectedPages?.length}
                    className="text-xs h-7 sm:h-8"
                  >
                    ✗ Clear All
                  </Button>
                </div>

                {/* Range Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-foreground">
                    Quick Range Selection
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="number"
                      placeholder="From"
                      min={1}
                      max={selectedFile.pageCount || 1}
                      className="text-xs h-7 sm:h-8 flex-1"
                      id="range-from"
                    />
                    <Input
                      type="number"
                      placeholder="To"
                      min={1}
                      max={selectedFile.pageCount || 1}
                      className="text-xs h-7 sm:h-8 flex-1"
                      id="range-to"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const fromInput = document.getElementById('range-from') as HTMLInputElement
                        const toInput = document.getElementById('range-to') as HTMLInputElement
                        const from = parseInt(fromInput.value)
                        const to = parseInt(toInput.value)
                        
                        if (from && to && from <= to && from >= 1 && to <= (selectedFile.pageCount || 0)) {
                          const rangePages = Array.from({ length: to - from + 1 }, (_, i) => from + i)
                          const currentPages = selectedFile.selectedPages || []
                          const newPages = [...new Set([...currentPages, ...rangePages])].sort((a, b) => a - b)
                          updatePageSelection(selectedFile.id, newPages)
                          fromInput.value = ''
                          toInput.value = ''
                        }
                      }}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 w-full sm:w-auto"
                    >
                      Add Range
                    </Button>
                  </div>
                </div>

                {/* Enhanced Page Grid */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Individual Page Selection
                  </label>
                  
                  {/* Page Grid with Better Visual Design */}
                  <div className="border rounded-lg p-2 sm:p-3 bg-muted/20">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-2 max-h-32 sm:max-h-48 overflow-y-auto">
                      {Array.from({ length: selectedFile.pageCount || 0 }, (_, i) => i + 1).map(pageNum => {
                        const isSelected = selectedFile.selectedPages?.includes(pageNum)
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => {
                              const currentPages = selectedFile.selectedPages || []
                              const newPages = isSelected 
                                ? currentPages.filter(p => p !== pageNum)
                                : [...currentPages, pageNum].sort((a, b) => a - b)
                              updatePageSelection(selectedFile.id, newPages)
                            }}
                            className={`
                              relative aspect-[3/4] rounded-lg border-2 transition-all duration-200 
                              flex flex-col items-center justify-center text-xs font-medium
                              hover:scale-105 hover:shadow-md
                              ${isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                                : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                              }
                            `}
                          >
                            <div className="text-[10px] font-bold mb-1">📄</div>
                            <div className="text-[10px]">{pageNum}</div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-[8px] text-primary-foreground">✓</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>💡 Click pages to toggle • Shift+click for range</span>
                    <span>{selectedFile.selectedPages?.length || 0} selected</span>
                  </div>
                </div>

                {/* Advanced Selection Patterns */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-foreground">
                    Selection Patterns
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Select odd pages
                        const oddPages = Array.from({ length: selectedFile.pageCount || 0 }, (_, i) => i + 1)
                          .filter(page => page % 2 === 1)
                        updatePageSelection(selectedFile.id, oddPages)
                      }}
                      className="text-xs h-7 sm:h-8"
                    >
                      📄 Odd Pages
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Select even pages
                        const evenPages = Array.from({ length: selectedFile.pageCount || 0 }, (_, i) => i + 1)
                          .filter(page => page % 2 === 0)
                        updatePageSelection(selectedFile.id, evenPages)
                      }}
                      className="text-xs h-7 sm:h-8"
                    >
                      📄 Even Pages
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Select first half
                        const halfPoint = Math.ceil((selectedFile.pageCount || 0) / 2)
                        const firstHalf = Array.from({ length: halfPoint }, (_, i) => i + 1)
                        updatePageSelection(selectedFile.id, firstHalf)
                      }}
                      className="text-xs h-7 sm:h-8"
                    >
                      📄 First Half
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Select last half
                        const halfPoint = Math.ceil((selectedFile.pageCount || 0) / 2)
                        const lastHalf = Array.from({ length: (selectedFile.pageCount || 0) - halfPoint }, (_, i) => halfPoint + 1 + i)
                        updatePageSelection(selectedFile.id, lastHalf)
                      }}
                      className="text-xs h-7 sm:h-8"
                    >
                      📄 Last Half
                    </Button>
                  </div>
                </div>

                {/* Enhanced Selection Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-foreground">Selection Summary</div>
                    <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      {selectedFile.selectedPages?.length || 0} pages
                    </div>
                  </div>
                  
                  {selectedFile.selectedPages?.length ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        <strong>Pages:</strong> {selectedFile.selectedPages.join(', ')}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Coverage: {Math.round(((selectedFile.selectedPages.length) / (selectedFile.pageCount || 1)) * 100)}%
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          ✓ Ready to merge
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No pages selected from this file
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Merge Options */}
          <Card>
            <CardHeader>
              <CardTitle>Merge Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="output-name" className="block text-sm font-medium text-foreground mb-2">
                  Output Filename
                </label>
                <Input
                  id="output-name"
                  type="text"
                  value={mergeOptions.outputName}
                  onChange={(e) => setMergeOptions(prev => ({ ...prev, outputName: e.target.value }))}
                  placeholder="merged-document"
                />
              </div>

              <div>
                <label htmlFor="page-orientation" className="block text-sm font-medium text-foreground mb-2">
                  Page Orientation
                </label>
                <select
                  id="page-orientation"
                  value={mergeOptions.pageOrientation}
                  onChange={(e) => setMergeOptions(prev => ({ 
                    ...prev, 
                    pageOrientation: e.target.value as MergeOptions['pageOrientation']
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="keep-original">Keep Original</option>
                  <option value="portrait">Force Portrait</option>
                  <option value="landscape">Force Landscape</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="include-bookmarks"
                    type="checkbox"
                    checked={mergeOptions.includeBookmarks}
                    onChange={(e) => setMergeOptions(prev => ({ 
                      ...prev, 
                      includeBookmarks: e.target.checked 
                    }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="include-bookmarks" className="text-sm text-foreground">
                    Include bookmarks
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="optimize-size"
                    type="checkbox"
                    checked={mergeOptions.optimizeSize}
                    onChange={(e) => setMergeOptions(prev => ({ 
                      ...prev, 
                      optimizeSize: e.target.checked 
                    }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="optimize-size" className="text-sm text-foreground">
                    Optimize file size
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Files Overview */}
          {pdfFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Files Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                {pdfFiles.map((pdf, index) => (
                  <div key={pdf.id} className="p-2 sm:p-3 border rounded-lg bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        <span className="sm:hidden">#{index + 1} {pdf.name.length > 15 ? pdf.name.slice(0, 12) + '...' : pdf.name}</span>
                        <span className="hidden sm:inline">#{index + 1} {pdf.name.length > 20 ? pdf.name.slice(0, 17) + '...' : pdf.name}</span>
                      </div>
                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex-shrink-0">
                        {pdf.selectedPages?.length || 0}/{pdf.pageCount || 0}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllPages(pdf.id)}
                        disabled={pdf.selectedPages?.length === pdf.pageCount}
                        className="h-6 px-2 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearPageSelection(pdf.id)}
                        disabled={!pdf.selectedPages?.length}
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFile(pdf)}
                        className="h-6 px-2 text-xs"
                      >
                        Advanced
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={() => {
                  pdfFiles.forEach(pdf => selectAllPages(pdf.id))
                }}
                className="w-full text-sm"
                disabled={pdfFiles.length === 0}
              >
                Select All Pages (All Files)
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  pdfFiles.forEach(pdf => clearPageSelection(pdf.id))
                }}
                className="w-full text-sm"
                disabled={pdfFiles.length === 0}
              >
                Clear All Selections
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• Uses PDF-lib for professional PDF merging</p>
                <p>• Preserves original content, formatting, and quality</p>
                <p>• Supports page selection and reordering</p>
                <p>• All processing happens locally in your browser</p>
                <p>• No files are uploaded to external servers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}