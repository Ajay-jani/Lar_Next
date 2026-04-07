import { readdir, unlink, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  FILE_SHARE_CLEANUP_INTERVAL_MS,
  FILE_SHARE_EXPIRY_MS,
  FILE_SHARE_STORE_DIRNAME,
} from './file-share-config'

const UPLOAD_DIR = path.join(process.cwd(), FILE_SHARE_STORE_DIRNAME)
const MAX_FILE_AGE = FILE_SHARE_EXPIRY_MS

function shouldIgnoreFile(fileName: string): boolean {
  return fileName.startsWith('.')
}

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
      if (shouldIgnoreFile(file)) {
        continue
      }

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
  setInterval(cleanupOldFiles, FILE_SHARE_CLEANUP_INTERVAL_MS)
  
  console.log(
    `File cleanup started - running every ${FILE_SHARE_CLEANUP_INTERVAL_MS / 1000 / 60} minutes`
  )
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
      if (shouldIgnoreFile(file)) {
        continue
      }

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
      totalFiles: files.filter((file) => !shouldIgnoreFile(file)).length,
      totalSize,
      oldestFile
    }
  } catch (error) {
    console.error('Error getting upload stats:', error)
    return { totalFiles: 0, totalSize: 0, oldestFile: null }
  }
}
