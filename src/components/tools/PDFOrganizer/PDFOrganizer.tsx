'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Files,
  GripVertical,
  Plus,
  RefreshCcw,
  RotateCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize } from '@/lib/page-ranges'
import { isPdfFile, PDF_FILE_ACCEPT } from '@/lib/pdf-files'
import {
  appendBlankPage,
  createOrganizerPages,
  insertBlankPage,
  nudgeOrganizerPage,
  moveOrganizerPage,
  removeOrganizerPage,
  rotateOrganizerPage,
  type OrganizerPageItem,
} from '@/lib/pdf-organizer-state'
import { loadPdfLib, loadPdfOrganizerExport } from '@/lib/pdf-runtime'

interface SourceFileInfo {
  id: string
  file: File
  name: string
  size: number
  pageCount: number
}

interface OrganizerResult {
  fileName: string
  pageCount: number
  size: number
  url: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024

const sourceStyles = [
  {
    badge: 'border-info/30 bg-info/10 text-info',
    panel: 'border-info/20 bg-info/5',
    preview: 'border-info/20 bg-info/10',
  },
  {
    badge: 'border-success/30 bg-success/10 text-success',
    panel: 'border-success/20 bg-success/5',
    preview: 'border-success/20 bg-success/10',
  },
  {
    badge: 'border-warning/30 bg-warning/10 text-warning',
    panel: 'border-warning/20 bg-warning/5',
    preview: 'border-warning/20 bg-warning/10',
  },
  {
    badge: 'border-primary/30 bg-primary/10 text-primary',
    panel: 'border-primary/20 bg-primary/5',
    preview: 'border-primary/20 bg-primary/10',
  },
]

function createSourceId(file: File) {
  return `${file.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function PDFOrganizer() {
  const [sourceFiles, setSourceFiles] = useState<SourceFileInfo[]>([])
  const [pages, setPages] = useState<OrganizerPageItem[]>([])
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrganizerResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const blankPageCount = useMemo(
    () => pages.filter(page => page.kind === 'blank').length,
    [pages]
  )

  const totalUploadSize = useMemo(
    () => sourceFiles.reduce((sum, sourceFile) => sum + sourceFile.size, 0),
    [sourceFiles]
  )

  const hasPages = pages.length > 0

  const clearResult = useCallback(() => {
    setResult(currentResult => {
      if (currentResult?.url) {
        URL.revokeObjectURL(currentResult.url)
      }

      return null
    })
  }, [])

  const updatePages = useCallback((updater: (_currentPages: OrganizerPageItem[]) => OrganizerPageItem[]) => {
    clearResult()
    setError(null)
    setPages(currentPages => updater(currentPages))
  }, [clearResult])

  const analyzePdf = useCallback(async (file: File) => {
    const { PDFDocument } = await loadPdfLib()
    const arrayBuffer = await file.arrayBuffer()
    const pdfDocument = await PDFDocument.load(arrayBuffer)

    return pdfDocument.getPageCount()
  }, [])

  const handleFileSelect = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return
    }

    setIsAnalyzing(true)
    clearResult()
    setError(null)

    try {
      const selectedFiles = Array.from(fileList)
      const nextSourceFiles: SourceFileInfo[] = []

      for (const file of selectedFiles) {
        if (!isPdfFile(file)) {
          throw new Error(`"${file.name}" is not a PDF file.`)
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" is larger than the 100MB in-browser limit.`)
        }

        const pageCount = await analyzePdf(file)

        nextSourceFiles.push({
          id: createSourceId(file),
          file,
          name: file.name,
          size: file.size,
          pageCount,
        })
      }

      setSourceFiles(currentFiles => [...currentFiles, ...nextSourceFiles])
      setPages(currentPages => [
        ...currentPages,
        ...createOrganizerPages(nextSourceFiles.map(sourceFile => ({
          id: sourceFile.id,
          name: sourceFile.name,
          pageCount: sourceFile.pageCount,
        }))),
      ])
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Unable to read one of the selected PDF files.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [analyzePdf, clearResult])

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileSelect(event.target.files)
    event.target.value = ''
  }

  const resetToUploadOrder = useCallback(() => {
    updatePages(() => createOrganizerPages(sourceFiles.map(sourceFile => ({
      id: sourceFile.id,
      name: sourceFile.name,
      pageCount: sourceFile.pageCount,
    }))))
  }, [sourceFiles, updatePages])

  const clearAll = useCallback(() => {
    clearResult()
    setError(null)
    setSourceFiles([])
    setPages([])
    setDraggedPageId(null)
    setDropTargetId(null)
  }, [clearResult])

  const handleDropOnCard = useCallback((targetPageId: string) => {
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDropTargetId(null)
      return
    }

    updatePages(currentPages => {
      const fromIndex = currentPages.findIndex(page => page.id === draggedPageId)
      const toIndex = currentPages.findIndex(page => page.id === targetPageId)

      if (fromIndex === -1 || toIndex === -1) {
        return currentPages
      }

      return moveOrganizerPage(currentPages, fromIndex, toIndex)
    })

    setDraggedPageId(null)
    setDropTargetId(null)
  }, [draggedPageId, updatePages])

  const handleOrganizePdf = useCallback(async () => {
    if (pages.length === 0) {
      setError('Upload at least one PDF page before exporting the organized file.')
      return
    }

    setIsProcessing(true)
    setError(null)
    clearResult()

    try {
      const { exportOrganizedPdf } = await loadPdfOrganizerExport()
      const sourceDocuments = await Promise.all(sourceFiles.map(async sourceFile => ({
        id: sourceFile.id,
        bytes: await sourceFile.file.arrayBuffer(),
      })))

      const fileName = sourceFiles.length === 1
        ? createPdfDownloadName(sourceFiles[0].name, 'organized')
        : 'organized-document.pdf'

      const pdfBytes = await exportOrganizedPdf(sourceDocuments, pages, {
        title: fileName.replace(/\.pdf$/i, ''),
      })
      const safeBytes = Uint8Array.from(pdfBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setResult({
        fileName,
        pageCount: pages.length,
        size: blob.size,
        url,
      })
    } catch (organizeError) {
      setError(organizeError instanceof Error ? organizeError.message : 'Unable to organize the selected PDF pages.')
    } finally {
      setIsProcessing(false)
    }
  }, [clearResult, pages, sourceFiles])

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-lg">PDF Organizer</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Sort, rotate, delete, and combine PDF pages in one iLovePDF-style workflow, then export the arranged document without leaving your browser.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload PDFs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PDF_FILE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleInputChange}
                />
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="block text-lg font-medium text-foreground">
                  {sourceFiles.length === 0 ? 'Choose one or more PDF files' : 'Add more PDF files'}
                </span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  Up to 100MB per file. Pages stay local and are processed in your browser.
                </span>
              </label>

              {sourceFiles.length > 0 && (
                <div className="space-y-3">
                  {sourceFiles.map((sourceFile, index) => {
                    const style = sourceStyles[index % sourceStyles.length]

                    return (
                      <div key={sourceFile.id} className={`rounded-2xl border p-4 ${style.panel}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-medium text-foreground">{sourceFile.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {sourceFile.pageCount} pages · {formatFileSize(sourceFile.size)}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style.badge}`}>
                            Source {index + 1}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">PDFs loaded</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{sourceFiles.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Pages in output</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{pages.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Blank pages</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{blankPageCount}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                Reorder pages with drag and drop, insert blank separators, rotate individual pages, or trim pages out before exporting.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updatePages(currentPages => appendBlankPage(currentPages))}
                  disabled={!hasPages}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add Blank Page
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToUploadOrder}
                  disabled={sourceFiles.length === 0}
                  leftIcon={<RefreshCcw className="h-4 w-4" />}
                >
                  Reset Order
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearAll}
                  disabled={!hasPages && sourceFiles.length === 0}
                >
                  Clear All
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Current upload size</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatFileSize(totalUploadSize)} across {sourceFiles.length || 0} PDF{sourceFiles.length === 1 ? '' : 's'}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleOrganizePdf}
                isLoading={isProcessing}
                disabled={!hasPages || isAnalyzing}
                className="w-full"
              >
                Organize PDF
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Arrange Pages</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag pages into a new order or use the page controls for precise edits.
                </p>
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
                {pages.length} page{pages.length === 1 ? '' : 's'} ready
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {!hasPages ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Files className="h-6 w-6" />
                </span>
                <p className="text-lg font-medium text-foreground">No pages loaded yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload one or more PDFs to start sorting pages like the Organize PDF workflow on iLovePDF.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pages.map((page, index) => {
                  const sourceIndex = sourceFiles.findIndex(sourceFile => sourceFile.id === page.sourceFileId)
                  const style = sourceStyles[(sourceIndex >= 0 ? sourceIndex : 0) % sourceStyles.length]
                  const isLandscape = page.rotation === 90 || page.rotation === 270
                  const isBlankPage = page.kind === 'blank'

                  return (
                    <article
                      key={page.id}
                      draggable
                      onDragStart={() => setDraggedPageId(page.id)}
                      onDragEnd={() => {
                        setDraggedPageId(null)
                        setDropTargetId(null)
                      }}
                      onDragOver={event => {
                        event.preventDefault()
                        setDropTargetId(page.id)
                      }}
                      onDrop={event => {
                        event.preventDefault()
                        handleDropOnCard(page.id)
                      }}
                      className={`rounded-3xl border bg-background p-4 shadow-sm transition-all ${
                        draggedPageId === page.id ? 'scale-[0.98] opacity-70' : ''
                      } ${
                        dropTargetId === page.id ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                            {index + 1}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            Drag
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {page.rotation !== 0 && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              {page.rotation}°
                            </span>
                          )}
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${isBlankPage ? 'border-border bg-muted text-muted-foreground' : style.badge}`}>
                            {isBlankPage ? 'Blank Page' : `Page ${page.sourcePageNumber}`}
                          </span>
                        </div>
                      </div>

                      <div className={`mt-4 rounded-3xl border p-4 ${isBlankPage ? 'border-border bg-muted/20' : style.panel}`}>
                        <div
                          className={`mx-auto flex items-center justify-center rounded-2xl border-2 border-dashed ${
                            isBlankPage ? 'border-border bg-background/80' : style.preview
                          } ${isLandscape ? 'aspect-[4/3] max-w-[220px]' : 'aspect-[3/4] max-w-[180px]'}`}
                        >
                          <div className="space-y-2 text-center">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {isBlankPage ? 'Inserted' : 'Source'}
                            </p>
                            <p className="text-2xl font-semibold text-foreground">
                              {isBlankPage ? 'Blank' : page.sourcePageNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isBlankPage ? 'Separator / spacer' : page.sourceFileName}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updatePages(currentPages => insertBlankPage(currentPages, page.id, 'before'))}
                          leftIcon={<Plus className="h-4 w-4" />}
                        >
                          Before
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updatePages(currentPages => insertBlankPage(currentPages, page.id, 'after'))}
                          leftIcon={<Plus className="h-4 w-4" />}
                        >
                          After
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePages(currentPages => nudgeOrganizerPage(currentPages, page.id, 'left'))}
                          disabled={index === 0}
                          leftIcon={<ChevronLeft className="h-4 w-4" />}
                        >
                          Left
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePages(currentPages => nudgeOrganizerPage(currentPages, page.id, 'right'))}
                          disabled={index === pages.length - 1}
                          rightIcon={<ChevronRight className="h-4 w-4" />}
                        >
                          Right
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => updatePages(currentPages => rotateOrganizerPage(currentPages, page.id))}
                          leftIcon={<RotateCw className="h-4 w-4" />}
                        >
                          Rotate
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => updatePages(currentPages => removeOrganizerPage(currentPages, page.id))}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Organized PDF Ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{result.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.pageCount} page{result.pageCount === 1 ? '' : 's'} · {formatFileSize(result.size)}
                </p>
              </div>
              <a href={result.url} download={result.fileName} className="w-full md:w-auto">
                <Button type="button">Download PDF</Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
