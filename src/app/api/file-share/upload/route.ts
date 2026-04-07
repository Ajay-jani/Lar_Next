import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileStore, cleanupExpiredFiles, type FileData } from '@/lib/file-store'
import {
  FILE_SHARE_EXPIRY_MINUTES,
  FILE_SHARE_MAX_DOWNLOADS,
  FILE_SHARE_MAX_FILE_SIZE,
  FILE_SHARE_STORE_DIRNAME,
} from '@/lib/file-share-config'

const UPLOAD_DIR = path.join(process.cwd(), FILE_SHARE_STORE_DIRNAME)

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
    const file = formData.get('file')
    
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file size
    if (file.size > FILE_SHARE_MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the allowed limit' },
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
    
    // Calculate expiry time from the shared configuration.
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + FILE_SHARE_EXPIRY_MINUTES)
    
    // Store file metadata
    const fileData: FileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      expiresAt,
      downloadCount: 0,
      maxDownloads: FILE_SHARE_MAX_DOWNLOADS
    }
    
    await fileStore.set(fileId, fileData)
    const downloadUrl = new URL(
      `/api/file-share/download/${fileId}`,
      request.nextUrl.origin
    ).toString()
    
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
        maxDownloads: FILE_SHARE_MAX_DOWNLOADS
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
