import { readdir, unlink, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'temp-uploads')
const CLEANUP_INTERVAL = 15 * 60 * 1000 // 15 minutes
const MAX_FILE_AGE = 60 * 60 * 1000 // 1 hour

/**
 * Clean up old files from the upload directory
 * This runs independently of the file store to catch any orphaned files
 */
export async function cleanupOldFiles(): Promise<void> {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      return
    }

    const files = await readdir(UPLOAD_DIR)
    const now = Date.now()

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file)
      
      try {
        const stats = await stat(filePath)
        const fileAge = now - stats.mtime.getTime()
        
        // Delete files older than MAX_FILE_AGE
        if (fileAge > MAX_FILE_AGE) {
          await unlink(filePath)
          console.log(`Cleaned up old file: ${file}`)
        }
      } catch (error) {
        // File might have been deleted already, continue
        console.warn(`Error processing file ${file}:`, error)
      }
    }
  } catch (error) {
    console.error('Error during file cleanup:', error)
  }
}

/**
 * Start the automatic cleanup process
 * Call this when your application starts
 */
export function startFileCleanup(): void {
  // Run cleanup immediately
  cleanupOldFiles()
  
  // Set up periodic cleanup
  setInterval(cleanupOldFiles, CLEANUP_INTERVAL)
  
  console.log(`File cleanup started - running every ${CLEANUP_INTERVAL / 1000 / 60} minutes`)
}

/**
 * Get upload directory statistics
 */
export async function getUploadStats(): Promise<{
  totalFiles: number
  totalSize: number
  oldestFile: Date | null
}> {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      return { totalFiles: 0, totalSize: 0, oldestFile: null }
    }

    const files = await readdir(UPLOAD_DIR)
    let totalSize = 0
    let oldestFile: Date | null = null

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file)
      
      try {
        const stats = await stat(filePath)
        totalSize += stats.size
        
        if (!oldestFile || stats.mtime < oldestFile) {
          oldestFile = stats.mtime
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return {
      totalFiles: files.length,
      totalSize,
      oldestFile
    }
  } catch (error) {
    console.error('Error getting upload stats:', error)
    return { totalFiles: 0, totalSize: 0, oldestFile: null }
  }
}