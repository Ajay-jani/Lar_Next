'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, FileImage, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createPdfDownloadName, formatFileSize } from '@/lib/page-ranges'
import { loadJpgToPdfModule } from '@/lib/pdf-runtime'
import type {
  PdfImageFit,
  PdfPageOrientation,
  PdfPageSizePreset,
} from '@/lib/jpg-to-pdf'

interface SourceImage {
  id: string
  file: File
  previewUrl: string
  mimeType: 'image/jpeg' | 'image/png'
}

interface ConversionResult {
  fileName: string
  pageCount: number
  size: number
  url: string
}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024

export function JPGToPDF() {
  const [images, setImages] = useState<SourceImage[]>([])
  const [pageSize, setPageSize] = useState<PdfPageSizePreset>('a4')
  const [orientation, setOrientation] = useState<PdfPageOrientation>('auto')
  const [imageFit, setImageFit] = useState<PdfImageFit>('contain')
  const [margin, setMargin] = useState(24)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConversionResult | null>(null)

  useEffect(() => {
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.previewUrl))

      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [images, result])

  const totalImageSize = useMemo(
    () => images.reduce((sum, image) => sum + image.file.size, 0),
    [images]
  )

  const clearResult = () => {
    setResult(currentResult => {
      if (currentResult?.url) {
        URL.revokeObjectURL(currentResult.url)
      }

      return null
    })
  }

  const handleImageSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return
    }

    setError(null)
    clearResult()

    try {
      const nextImages = Array.from(fileList).map(file => {
        const mimeType = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
          ? 'image/png'
          : file.type === 'image/jpeg' || file.type === 'image/jpg' || /\.(jpe?g)$/i.test(file.name)
            ? 'image/jpeg'
            : null

        if (!mimeType) {
          throw new Error(`"${file.name}" is not a JPG or PNG image.`)
        }

        if (file.size > MAX_IMAGE_SIZE) {
          throw new Error(`"${file.name}" is larger than the 25MB image limit.`)
        }

        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          mimeType,
        } satisfies SourceImage
      })

      setImages(currentImages => [...currentImages, ...nextImages])
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Unable to read the selected image files.')
    }
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages(currentImages => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= currentImages.length) {
        return currentImages
      }

      const nextImages = [...currentImages]
      const [image] = nextImages.splice(index, 1)
      nextImages.splice(targetIndex, 0, image)
      return nextImages
    })

    clearResult()
    setError(null)
  }

  const removeImage = (id: string) => {
    clearResult()
    setError(null)
    setImages(currentImages => {
      const imageToRemove = currentImages.find(image => image.id === id)

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      return currentImages.filter(image => image.id !== id)
    })
  }

  const handleCreatePdf = async () => {
    if (images.length === 0) {
      setError('Add at least one JPG or PNG image before creating the PDF.')
      return
    }

    setIsProcessing(true)
    setError(null)
    clearResult()

    try {
      const { convertImagesToPdf } = await loadJpgToPdfModule()
      const pdfBytes = await convertImagesToPdf(
        await Promise.all(images.map(async image => ({
          name: image.file.name,
          bytes: await image.file.arrayBuffer(),
          mimeType: image.mimeType,
        }))),
        {
          pageSize,
          orientation,
          margin,
          imageFit,
          title: images.length === 1
            ? createPdfDownloadName(images[0].file.name, 'image-pdf').replace(/\.pdf$/i, '')
            : 'Images PDF',
        }
      )

      const safeBytes = Uint8Array.from(pdfBytes)
      const blob = new Blob([safeBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setResult({
        fileName: images.length === 1
          ? createPdfDownloadName(images[0].file.name, 'image-pdf')
          : 'images-to-pdf.pdf',
        pageCount: images.length,
        size: blob.size,
        url,
      })
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Unable to create the PDF from the selected images.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-lg">JPG to PDF</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Convert JPG or PNG images into a single PDF with iLovePDF-style controls for page size, orientation, fit, margin, and image order.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center transition-colors hover:border-primary/40">
                <input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={event => handleImageSelect(event.target.files)}
                />
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="block text-lg font-medium text-foreground">
                  {images.length === 0 ? 'Choose JPG or PNG images' : 'Add more images'}
                </span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  Images are arranged into one PDF document, one image per page.
                </span>
              </label>

              {images.length > 0 && (
                <div className="space-y-3">
                  {images.map((image, index) => (
                    <div key={image.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <Image
                          src={image.previewUrl}
                          alt={image.file.name}
                          width={80}
                          height={96}
                          unoptimized
                          className="h-24 w-20 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{image.file.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Page {index + 1} · {image.mimeType === 'image/png' ? 'PNG' : 'JPG'} · {formatFileSize(image.file.size)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveImage(index, 'up')}
                              disabled={index === 0}
                              leftIcon={<ChevronUp className="h-4 w-4" />}
                            >
                              Up
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveImage(index, 'down')}
                              disabled={index === images.length - 1}
                              leftIcon={<ChevronDown className="h-4 w-4" />}
                            >
                              Down
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(image.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">PDF Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page size</label>
                  <select
                    value={pageSize}
                    onChange={event => setPageSize(event.target.value as PdfPageSizePreset)}
                    className="form-input"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="fit-image">Fit to image</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Orientation</label>
                  <select
                    value={orientation}
                    onChange={event => setOrientation(event.target.value as PdfPageOrientation)}
                    className="form-input"
                  >
                    <option value="auto">Auto</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Image fit</label>
                  <select
                    value={imageFit}
                    onChange={event => setImageFit(event.target.value as PdfImageFit)}
                    className="form-input"
                  >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Margin</label>
                  <input
                    type="number"
                    min={0}
                    max={96}
                    value={margin}
                    onChange={event => setMargin(Number.parseInt(event.target.value || '24', 10))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                {images.length} image{images.length === 1 ? '' : 's'} selected · {formatFileSize(totalImageSize)} total · exported as one PDF
              </div>

              <Button
                type="button"
                onClick={handleCreatePdf}
                isLoading={isProcessing}
                disabled={images.length === 0}
                className="w-full"
                leftIcon={<FileImage className="h-4 w-4" />}
              >
                Create PDF
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">PDF Ready</CardTitle>
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
