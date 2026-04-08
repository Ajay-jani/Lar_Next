import { NextRequest, NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { fileStore } from '@/lib/file-store'
import { logger } from '@/lib/server-logger'

type DownloadRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: DownloadRouteContext
) {
  try {
    const { id: fileId } = await params

    const result = await fileStore.claimDownload(fileId)

    if (result.status === 'missing') {
      return new NextResponse('File not found or expired', { status: 404 })
    }

    if (result.status === 'expired') {
      if (existsSync(result.file.path)) {
        await unlink(result.file.path).catch(() => undefined)
      }

      return new NextResponse('File has expired', { status: 410 })
    }

    if (result.status === 'limit') {
      return new NextResponse('Download limit exceeded', { status: 429 })
    }

    const fileData = result.file
    
    // Read file
    const fileBuffer = await readFile(fileData.path)

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
    logger.error('Download error:', error)
    return new NextResponse('Download failed', { status: 500 })
  }
}

// Also handle HEAD requests for file info
export async function HEAD(
  _request: NextRequest,
  { params }: DownloadRouteContext
) {
  try {
    const { id: fileId } = await params
    const fileData = await fileStore.get(fileId)
    
    if (!fileData || fileData.expiresAt < new Date()) {
      return new NextResponse(null, { status: 404 })
    }

    if (!existsSync(fileData.path)) {
      await fileStore.delete(fileId)
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
    
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
