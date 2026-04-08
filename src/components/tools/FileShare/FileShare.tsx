'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AnimatedUploadProgressCard } from '@/components/tools/shared/AnimatedUploadProgressCard'
import {
  FILE_SHARE_EXPIRY_MS,
  FILE_SHARE_MAX_FILE_SIZE,
  formatBytes,
  formatDurationShort,
} from '@/lib/file-share-config'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  expiresAt: string
  downloadCount: number
  maxDownloads: number
}

interface UploadResponse {
  success: boolean
  file?: UploadedFile
  error?: string
}

export function FileShare() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('Waiting for a file')
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

  // Calculate time remaining
  const updateTimeRemaining = useCallback(() => {
    if (!uploadedFile) return
    
    const now = new Date().getTime()
    const expiry = new Date(uploadedFile.expiresAt).getTime()
    const remaining = expiry - now
    
    if (remaining <= 0) {
      setTimeRemaining('Expired')
      setUploadedFile(null)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
    
    setTimeRemaining(
      hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : formatDurationShort(remaining)
    )
  }, [uploadedFile])

  // Start countdown timer
  React.useEffect(() => {
    if (uploadedFile) {
      updateTimeRemaining()
      intervalRef.current = setInterval(updateTimeRemaining, 1000)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [uploadedFile, updateTimeRemaining])

  const copyToClipboard = useCallback(async (url?: string, successMessage = 'Link copied') => {
    const value = url || uploadedFile?.url

    if (!value) return false

    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(successMessage)
      return true
    } catch (err) {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = value
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopyStatus(successMessage)
        return true
      } catch {
        setCopyStatus('Link ready to copy')
        return false
      }
    }
  }, [uploadedFile])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    if (file.size > FILE_SHARE_MAX_FILE_SIZE) {
      setError(`File size must be less than ${formatBytes(FILE_SHARE_MAX_FILE_SIZE)}`)
      return
    }
    
    setIsUploading(true)
    setUploadProgress(3)
    setUploadStatus('Securing your file for upload...')
    setUploadingFileName(file.name)
    setError(null)
    setCopyStatus(null)

    try {
      const result: UploadResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        xhr.open('POST', '/api/file-share/upload')

        xhr.upload.onprogress = event => {
          if (!event.lengthComputable) {
            return
          }

          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(Math.min(progress, 96))
          setUploadStatus(
            progress < 45
              ? 'Sending encrypted file data...'
              : progress < 90
                ? 'Almost there. Building the share link...'
                : 'Finishing the secure upload handoff...'
          )
        }

        xhr.onerror = () => reject(new Error('Network error. Please try again.'))
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || '{}') as UploadResponse

            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed)
              return
            }

            reject(new Error(parsed.error || 'Upload failed'))
          } catch (_error) {
            reject(new Error('Upload completed, but the server response was invalid.'))
          }
        }

        xhr.send(formData)
      })

      if (result.success && result.file) {
        setUploadProgress(100)
        setUploadStatus('Share link ready. Adding the final shine...')
        await wait(240)
        setUploadedFile(result.file)
        setCopyStatus('Preparing link...')
        void copyToClipboard(result.file.url, 'Link copied automatically')
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  // Reset upload
  const resetUpload = () => {
    setUploadedFile(null)
    setError(null)
    setCopyStatus(null)
    setUploadProgress(0)
    setUploadStatus('Waiting for a file')
    setUploadingFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
          Temporary File Share
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Share files securely with temporary links that expire automatically
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">
              {formatDurationShort(FILE_SHARE_EXPIRY_MS)} expiry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">
              {formatBytes(FILE_SHARE_MAX_FILE_SIZE)} max size
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Secure & temporary</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            {!uploadedFile ? (
              <div className="space-y-4">
                {isUploading ? (
                  <AnimatedUploadProgressCard
                    progress={uploadProgress}
                    fileName={uploadingFileName || 'Uploading file'}
                    title="Uploading your file"
                    status={uploadStatus}
                    caption="Hang tight. We are shipping your file, creating the temporary link, and getting it ready to share."
                  />
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-4">
                      <div className="text-4xl">📁</div>
                      <div>
                        <p className="text-lg font-medium">
                          {dragActive ? 'Drop file here' : 'Drag & drop your file'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or click to browse
                        </p>
                      </div>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="mt-4"
                      >
                        {isUploading ? 'Uploading...' : 'Choose File'}
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />

                <div className="text-xs text-muted-foreground text-center">
                  Maximum file size: {formatBytes(FILE_SHARE_MAX_FILE_SIZE)} • Files expire after{' '}
                  {formatDurationShort(FILE_SHARE_EXPIRY_MS)}
                </div>
              </div>
            ) : (
              /* Upload Success */
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="text-lg font-medium text-success">Upload Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your file is ready to share and the link is ready to paste
                  </p>
                </div>

                {copyStatus && (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                    {copyStatus}
                  </div>
                )}
                
                <Button
                  onClick={resetUpload}
                  variant="outline"
                  className="w-full"
                >
                  Upload Another File
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Info & Share Section */}
        <Card>
          <CardHeader>
            <CardTitle>Share Link</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedFile ? (
              <div className="space-y-4">
                {/* File Info */}
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{uploadedFile.name}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Size: {formatBytes(uploadedFile.size)}</p>
                        <p>Type: {uploadedFile.type || 'Unknown'}</p>
                        <p>Downloads: {uploadedFile.downloadCount}/{uploadedFile.maxDownloads}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expiry Timer */}
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-warning">⏰</span>
                    <span className="font-medium text-sm">Time Remaining</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-warning">
                    {timeRemaining}
                  </p>
                </div>

                {/* Share Link */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Share Link:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={uploadedFile.url}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-muted/20 font-mono"
                    />
                    <Button
                      onClick={() => void copyToClipboard()}
                      size="sm"
                      className="shrink-0"
                    >
                      📋 Copy
                    </Button>
                  </div>
                </div>

                {/* Download Link */}
                <Button
                  onClick={() => window.open(uploadedFile.url, '_blank')}
                  className="w-full"
                  variant="outline"
                >
                  🔗 Open Download Link
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-4">🔗</div>
                <p>Upload a file to generate a share link</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">📤</div>
              <h4 className="font-medium mb-1">1. Upload</h4>
              <p className="text-muted-foreground">
                Drag & drop or select your file (max {formatBytes(FILE_SHARE_MAX_FILE_SIZE)})
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔗</div>
              <h4 className="font-medium mb-1">2. Share</h4>
              <p className="text-muted-foreground">
                Get a unique, temporary link to share
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⏰</div>
              <h4 className="font-medium mb-1">3. Expires</h4>
              <p className="text-muted-foreground">
                Files automatically delete after {formatDurationShort(FILE_SHARE_EXPIRY_MS)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
