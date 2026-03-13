// File cleanup cron job system
import fs from 'fs/promises'
import path from 'path'

interface FileRecord {
  id: string
  filename: string
  uploadTime: number
  expiresAt: number
  downloads: number
  maxDownloads: number
}

interface FileStore {
  files: Record<string, FileRecord>
}

const TEMP_UPLOADS_DIR = path.join(process.cwd(), 'temp-uploads')
const FILE_STORE_PATH = path.join(TEMP_UPLOADS_DIR, '.file-store.json')
const CLEANUP_INTERVAL = 60 * 1000 // Run every minute
const FILE_EXPIRY_TIME = 5 * 60 * 1000 // 5 minutes in milliseconds

class FileCleanupCron {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(TEMP_UPLOADS_DIR)
    } catch {
      await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true })
    }
  }

  private async loadFileStore(): Promise<FileStore> {
    try {
      const data = await fs.readFile(FILE_STORE_PATH, 'utf-8')
      return JSON.parse(data)
    } catch {
      return { files: {} }
    }
  }

  private async saveFileStore(store: FileStore): Promise<void> {
    await fs.writeFile(FILE_STORE_PATH, JSON.stringify(store, null, 2))
  }

  private async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath)
      console.log(`✅ Deleted expired file: ${filePath}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error)
      return false
    }
  }

  private async cleanupExpiredFiles(): Promise<void> {
    try {
      const store = await this.loadFileStore()
      
      // Check if store has files property
      if (!store || !store.files) {
        console.log('📁 No files to cleanup (empty store)')
        return
      }

      const now = Date.now()
      const expiredFiles: string[] = []
      const updatedFiles: Record<string, FileRecord> = {}

      // Check each file for expiration
      for (const [fileId, fileRecord] of Object.entries(store.files)) {
        const isExpired = now > fileRecord.expiresAt
        const filePath = path.join(TEMP_UPLOADS_DIR, `${fileId}.${fileRecord.filename.split('.').pop()}`)

        if (isExpired) {
          // File has expired, mark for deletion
          expiredFiles.push(fileId)
          await this.deleteFile(filePath)
        } else {
          // File is still valid, keep it
          updatedFiles[fileId] = fileRecord
        }
      }

      // Update the file store if any files were removed
      if (expiredFiles.length > 0) {
        await this.saveFileStore({ files: updatedFiles })
        console.log(`🧹 Cleanup completed: ${expiredFiles.length} expired files removed`)
      }

      // Also clean up any orphaned files (files without records)
      await this.cleanupOrphanedFiles(Object.keys(updatedFiles))

    } catch (error) {
      console.error('❌ Error during file cleanup:', error)
    }
  }

  private async cleanupOrphanedFiles(validFileIds: string[]): Promise<void> {
    try {
      const files = await fs.readdir(TEMP_UPLOADS_DIR)
      const orphanedFiles: string[] = []

      for (const file of files) {
        // Skip the file store and hidden files
        if (file.startsWith('.') || file === '.file-store.json') {
          continue
        }

        // Extract file ID from filename (assuming format: id.extension)
        const fileId = file.split('.')[0]
        
        if (!validFileIds.includes(fileId)) {
          orphanedFiles.push(file)
          const filePath = path.join(TEMP_UPLOADS_DIR, file)
          await this.deleteFile(filePath)
        }
      }

      if (orphanedFiles.length > 0) {
        console.log(`🧹 Removed ${orphanedFiles.length} orphaned files`)
      }
    } catch (error) {
      console.error('❌ Error cleaning orphaned files:', error)
    }
  }

  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ File cleanup cron is already running')
      return
    }

    console.log('🚀 Starting file cleanup cron job (5-minute expiry, 1-minute intervals)')
    this.isRunning = true

    // Run cleanup immediately
    this.cleanupExpiredFiles()

    // Set up recurring cleanup
    this.intervalId = setInterval(() => {
      this.cleanupExpiredFiles()
    }, CLEANUP_INTERVAL)
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('🛑 File cleanup cron job stopped')
  }

  public getStatus(): { isRunning: boolean; interval: number; expiryTime: number } {
    return {
      isRunning: this.isRunning,
      interval: CLEANUP_INTERVAL,
      expiryTime: FILE_EXPIRY_TIME
    }
  }

  // Manual cleanup trigger
  public async runCleanup(): Promise<void> {
    console.log('🧹 Running manual file cleanup...')
    await this.cleanupExpiredFiles()
  }

  // Get cleanup statistics
  public async getStats(): Promise<{
    totalFiles: number
    expiredFiles: number
    validFiles: number
    nextCleanup: number
  }> {
    const store = await this.loadFileStore()
    const now = Date.now()
    let expiredCount = 0
    let validCount = 0

    // Check if store has files property
    if (store && store.files) {
      for (const fileRecord of Object.values(store.files)) {
        if (now > fileRecord.expiresAt) {
          expiredCount++
        } else {
          validCount++
        }
      }
    }

    return {
      totalFiles: store?.files ? Object.keys(store.files).length : 0,
      expiredFiles: expiredCount,
      validFiles: validCount,
      nextCleanup: this.intervalId ? CLEANUP_INTERVAL : 0
    }
  }
}

// Singleton instance
let cleanupCron: FileCleanupCron | null = null

export function getFileCleanupCron(): FileCleanupCron {
  if (!cleanupCron) {
    cleanupCron = new FileCleanupCron()
  }
  return cleanupCron
}

export function startFileCleanupCron(): void {
  const cron = getFileCleanupCron()
  cron.start()
}

export function stopFileCleanupCron(): void {
  const cron = getFileCleanupCron()
  cron.stop()
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  startFileCleanupCron()
}