// Application startup initialization
import { startFileCleanupCron } from './file-cleanup-cron'

let isInitialized = false

export function initializeApp() {
  if (isInitialized) {
    return
  }

  console.log('🚀 Initializing application...')

  // Start the file cleanup cron job
  startFileCleanupCron()

  isInitialized = true
  console.log('✅ Application initialized successfully')
}

// Auto-initialize in server environment
if (typeof window === 'undefined') {
  initializeApp()
}