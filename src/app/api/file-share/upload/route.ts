import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileStore, cleanupExpiredFiles, type FileData } from '@/lib/file-store'

// Configuration
const UPLOAD_DIR = path.join(process.cwd(), 'temp-uploads')
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const EXPIRY_MINUTES = 5 // 5 minutes
const MAX_DOWNLOADS = 10 // Maximum downloads per file

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Clean up expired files first
    await cleanupExpiredFiles()
    
    // Ensure upload directory exists
    await ensureUploadDir()
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }
    
    // Generate unique ID and filename
    const fileId = uuidv4()
    const fileExtension = path.extname(file.name)
    const safeFileName = `${fileId}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, safeFileName)
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Calculate expiry time (5 minutes from now)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + EXPIRY_MINUTES)
    
    // Store file metadata
    const fileData: FileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      expiresAt,
      downloadCount: 0,
      maxDownloads: MAX_DOWNLOADS
    }
    
    await fileStore.set(fileId, fileData)
    
    // Debug: Log file store after setting
    console.log('File stored with ID:', fileId)
    console.log('File store size after upload:', await fileStore.size())
    
    // Generate download URL with correct port
    const protocol = request.nextUrl.protocol
    const host = request.headers.get('host') || request.nextUrl.host
    const baseUrl = `${protocol}//${host}`
    const downloadUrl = `${baseUrl}/api/file-share/download/${fileId}`
    
    console.log('Generated download URL:', downloadUrl)
    console.log('Request host:', host)
    console.log('Request origin:', request.nextUrl.origin)
    
    // Return success response
    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadUrl,
        expiresAt: expiresAt.toISOString(),
        downloadCount: 0,
        maxDownloads: MAX_DOWNLOADS
      }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}