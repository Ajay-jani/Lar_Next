import { NextResponse } from 'next/server'
import { fileStore } from '@/lib/file-store'
import { getUploadStats } from '@/lib/file-cleanup'

export async function GET() {
  try {
    // Get file store stats
    const activeFiles = await fileStore.size()
    let totalDownloads = 0
    let expiredFiles = 0
    const now = new Date()
    
    const entries = await fileStore.entries()
    for (const [, fileData] of entries) {
      totalDownloads += fileData.downloadCount
      if (fileData.expiresAt < now) {
        expiredFiles++
      }
    }
    
    // Get filesystem stats
    const fsStats = await getUploadStats()
    
    return NextResponse.json({
      success: true,
      stats: {
        activeFiles,
        totalDownloads,
        expiredFiles,
        filesystemStats: {
          totalFiles: fsStats.totalFiles,
          totalSize: fsStats.totalSize,
          oldestFile: fsStats.oldestFile
        }
      }
    })
    
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}