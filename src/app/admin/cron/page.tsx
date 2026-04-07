'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  FileText, 
  Trash2,
  Activity,
  Timer
} from 'lucide-react'
import {
  FILE_SHARE_CLEANUP_INTERVAL_MS,
  FILE_SHARE_EXPIRY_MS,
  formatDurationShort,
} from '@/lib/file-share-config'

interface CronStatus {
  isRunning: boolean
  interval: number
  expiryTime: number
}

interface CronStats {
  totalFiles: number
  expiredFiles: number
  validFiles: number
  nextCleanup: number
  lastRunAt: number | null
}

const TOKEN_STORAGE_KEY = 'utility-hub-cron-admin-token'

export default function CronAdminPage() {
  const [status, setStatus] = useState<CronStatus | null>(null)
  const [stats, setStats] = useState<CronStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    const token = adminToken.trim()

    if (!token) {
      setStatus(null)
      setStats(null)
      setAuthError('Enter the cron admin token to load cleanup status.')
      return
    }

    try {
      const response = await fetch('/api/cron/cleanup', {
        headers: {
          'x-admin-token': token,
        },
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setAuthError(null)
        setStatus(data.status)
        setStats(data.stats)
        return
      }

      setStatus(null)
      setStats(null)
      setAuthError(data.error || 'Failed to fetch cron status.')
    } catch (error) {
      setAuthError('Failed to fetch cron status.')
    }
  }, [adminToken])

  const handleAction = useCallback(async (action: string) => {
    const token = adminToken.trim()

    if (!token) {
      setAuthError('Enter the cron admin token before running admin actions.')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/cron/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setAuthError(null)
        setMessage(data.message)
        await fetchStatus() // Refresh status
      } else {
        setMessage(null)
        setAuthError(data.error || 'Failed to perform action.')
      }
    } catch (error) {
      setAuthError('Failed to perform action.')
    } finally {
      setLoading(false)
    }
  }, [adminToken, fetchStatus])

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (savedToken) {
      setAdminToken(savedToken)
    }
  }, [])

  useEffect(() => {
    if (!adminToken.trim()) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, adminToken.trim())
  }, [adminToken])

  useEffect(() => {
    if (!adminToken.trim()) {
      return
    }

    void fetchStatus()

    const interval = setInterval(() => {
      void fetchStatus()
    }, 10000)

    return () => clearInterval(interval)
  }, [adminToken, fetchStatus])

  const formatTime = (ms: number) => {
    return formatDurationShort(ms)
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            File Cleanup Cron Admin
          </h1>
          <p className="text-lg text-text-secondary">
            Monitor and control the automatic file cleanup system
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">
              Enter the `CRON_ADMIN_TOKEN` configured on the server to access cleanup controls.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="password"
                value={adminToken}
                onChange={(event) => {
                  setAdminToken(event.target.value)
                  setAuthError(null)
                  setMessage(null)
                }}
                placeholder="Enter admin token"
              />
              <Button
                onClick={() => void fetchStatus()}
                disabled={loading || !adminToken.trim()}
                className="sm:w-auto"
              >
                Load Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl dark:bg-green-900/20 dark:border-green-800">
            <p className="text-green-700 dark:text-green-300 font-medium">{message}</p>
          </div>
        )}

        {authError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-destructive font-medium">{authError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Cron Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Status:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${status?.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    {status?.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Check Interval:</span>
                <span className="font-medium">
                  {status ? formatTime(status.interval) : 'Loading...'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">File Expiry:</span>
                <span className="font-medium">
                  {status ? formatTime(status.expiryTime) : 'Loading...'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                File Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Total Files:</span>
                <span className="font-medium">{stats?.totalFiles || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Valid Files:</span>
                <span className="font-medium text-green-600">{stats?.validFiles || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Expired Files:</span>
                <span className="font-medium text-red-600">{stats?.expiredFiles || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => handleAction('start')}
                disabled={loading || status?.isRunning || !adminToken.trim()}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Cron
              </Button>

              <Button
                onClick={() => handleAction('stop')}
                disabled={loading || !status?.isRunning || !adminToken.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Cron
              </Button>

              <Button
                onClick={() => handleAction('cleanup')}
                disabled={loading || !adminToken.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Manual Cleanup
              </Button>

              <Button
                onClick={() => void fetchStatus()}
                disabled={loading || !adminToken.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Automatic Cleanup</h3>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Runs every {formatTime(FILE_SHARE_CLEANUP_INTERVAL_MS)}</li>
                  <li>• Deletes expired and orphaned files</li>
                  <li>• Removes orphaned files</li>
                  <li>• Keeps file metadata in sync</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">File Expiry Rules</h3>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Files expire after {formatTime(FILE_SHARE_EXPIRY_MS)}</li>
                  <li>• Maximum 10 downloads per file</li>
                  <li>• Automatic cleanup on expiry</li>
                  <li>• No manual intervention needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
