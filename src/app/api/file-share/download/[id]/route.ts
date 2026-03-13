import { NextRequest, NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { fileStore } from '@/lib/file-store'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id
    
    // Debug: Log file store contents
    console.log('Download request for ID:', fileId)
    console.log('File store size:', await fileStore.size())
    const entries = await fileStore.entries()
    console.log('Available files:', entries.map(([id, data]) => ({ id, name: data.name })))
    
    // Get file metadata
    const fileData = await fileStore.get(fileId)
    
    if (!fileData) {
      console.log('File not found in store for ID:', fileId)
      return new NextResponse('File not found or expired', { status: 404 })
    }
    
    // Check if file has expired
    const now = new Date()
    if (fileData.expiresAt < now) {
      // Clean up expired file
      await fileStore.delete(fileId)
      if (existsSync(fileData.path)) {
        await unlink(fileData.path).catch(() => {})
      }
      return new NextResponse('File has expired', { status: 410 })
    }
    
    // Check download limit
    if (fileData.downloadCount >= fileData.maxDownloads) {
      return new NextResponse('Download limit exceeded', { status: 429 })
    }
    
    // Check if physical file exists
    if (!existsSync(fileData.path)) {
      await fileStore.delete(fileId)
      return new NextResponse('File not found', { status: 404 })
    }
    
    // Read file
    const fileBuffer = await readFile(fileData.path)
    
    // Increment download count
    fileData.downloadCount++
    await fileStore.set(fileId, fileData)
    
    // Determine content type
    const contentType = fileData.type || 'application/octet-stream'
    
    // Create response with appropriate headers
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileData.name}"`,
        'Content-Length': fileData.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Download error:', error)
    return new NextResponse('Download failed', { status: 500 })
  }
}

// Also handle HEAD requests for file info
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id
    const fileData = await fileStore.get(fileId)
    
    if (!fileData || fileData.expiresAt < new Date()) {
      return new NextResponse(null, { status: 404 })
    }
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': fileData.type || 'application/octet-stream',
        'Content-Length': fileData.size.toString(),
        'X-File-Name': fileData.name,
        'X-Downloads-Remaining': (fileData.maxDownloads - fileData.downloadCount).toString(),
        'X-Expires-At': fileData.expiresAt.toISOString()
      }
    })
    
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}