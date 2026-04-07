// File cleanup cron job system
import {
  FILE_SHARE_CLEANUP_INTERVAL_MS,
  FILE_SHARE_EXPIRY_MS,
} from './file-share-config'
import { cleanupOldFiles } from './file-cleanup'
import { cleanupExpiredFiles, fileStore } from './file-store'

class FileCleanupCron {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private lastRunAt: number | null = null
  private activeCleanup: Promise<void> | null = null

  private async cleanupExpiredFiles(): Promise<void> {
    if (this.activeCleanup) {
      return this.activeCleanup
    }

    this.activeCleanup = (async () => {
      try {
        await cleanupExpiredFiles()
        await cleanupOldFiles()
        this.lastRunAt = Date.now()
      } catch (error) {
        console.error('Error during file cleanup:', error)
      } finally {
        this.activeCleanup = null
      }
    })()

    return this.activeCleanup
  }

  public start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // Run cleanup immediately
    void this.cleanupExpiredFiles()

    // Set up recurring cleanup
    this.intervalId = setInterval(() => {
      void this.cleanupExpiredFiles()
    }, FILE_SHARE_CLEANUP_INTERVAL_MS)
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  public getStatus(): { isRunning: boolean; interval: number; expiryTime: number } {
    return {
      isRunning: this.isRunning,
      interval: FILE_SHARE_CLEANUP_INTERVAL_MS,
      expiryTime: FILE_SHARE_EXPIRY_MS
    }
  }

  // Manual cleanup trigger
  public async runCleanup(): Promise<void> {
    await this.cleanupExpiredFiles()
  }

  // Get cleanup statistics
  public async getStats(): Promise<{
    totalFiles: number
    expiredFiles: number
    validFiles: number
    nextCleanup: number
    lastRunAt: number | null
  }> {
    const entries = await fileStore.entries()
    const now = new Date()
    let expiredCount = 0
    let validCount = 0

    for (const [, fileRecord] of entries) {
      if (fileRecord.expiresAt < now) {
        expiredCount++
      } else {
        validCount++
      }
    }
    return {
      totalFiles: entries.length,
      expiredFiles: expiredCount,
      validFiles: validCount,
      nextCleanup: this.intervalId ? FILE_SHARE_CLEANUP_INTERVAL_MS : 0,
      lastRunAt: this.lastRunAt,
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
