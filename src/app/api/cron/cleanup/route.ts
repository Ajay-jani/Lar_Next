import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getFileCleanupCron } from '@/lib/file-cleanup-cron'

function getAuthorizationError(request: NextRequest): NextResponse | null {
  const expectedToken = process.env.CRON_ADMIN_TOKEN?.trim()

  if (!expectedToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_ADMIN_TOKEN is not configured on the server.',
      },
      { status: 503 }
    )
  }

  const providedToken = request.headers.get('x-admin-token')?.trim()

  if (!providedToken) {
    return NextResponse.json(
      { success: false, error: 'Missing admin token.' },
      { status: 401 }
    )
  }

  const matches =
    providedToken.length === expectedToken.length &&
    timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))

  if (!matches) {
    return NextResponse.json(
      { success: false, error: 'Invalid admin token.' },
      { status: 401 }
    )
  }

  return null
}

// GET - Get cron status and statistics
export async function GET(request: NextRequest) {
  try {
    const authError = getAuthorizationError(request)
    if (authError) {
      return authError
    }

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
    const authError = getAuthorizationError(request)
    if (authError) {
      return authError
    }

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
