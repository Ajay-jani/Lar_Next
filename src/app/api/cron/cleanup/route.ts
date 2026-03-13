import { NextRequest, NextResponse } from 'next/server'
import { getFileCleanupCron } from '@/lib/file-cleanup-cron'

// GET - Get cron status and statistics
export async function GET() {
  try {
    const cron = getFileCleanupCron()
    const status = cron.getStatus()
    const stats = await cron.getStats()

    return NextResponse.json({
      success: true,
      status,
      stats,
      message: status.isRunning ? 'Cron job is running' : 'Cron job is stopped'
    })
  } catch (error) {
    console.error('Error getting cron status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get cron status' },
      { status: 500 }
    )
  }
}

// POST - Start/stop cron or trigger manual cleanup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const cron = getFileCleanupCron()

    switch (action) {
      case 'start':
        cron.start()
        return NextResponse.json({
          success: true,
          message: 'File cleanup cron started'
        })

      case 'stop':
        cron.stop()
        return NextResponse.json({
          success: true,
          message: 'File cleanup cron stopped'
        })

      case 'cleanup':
        await cron.runCleanup()
        const stats = await cron.getStats()
        return NextResponse.json({
          success: true,
          message: 'Manual cleanup completed',
          stats
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, or cleanup' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error handling cron action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process cron action' },
      { status: 500 }
    )
  }
}