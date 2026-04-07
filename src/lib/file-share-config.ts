export const FILE_SHARE_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const FILE_SHARE_EXPIRY_MINUTES = 60
export const FILE_SHARE_EXPIRY_MS = FILE_SHARE_EXPIRY_MINUTES * 60 * 1000
export const FILE_SHARE_MAX_DOWNLOADS = 10
export const FILE_SHARE_CLEANUP_INTERVAL_MS = 60 * 1000
export const FILE_SHARE_STORE_DIRNAME = 'temp-uploads'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const units = ['Bytes', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${parseFloat((bytes / Math.pow(1024, exponent)).toFixed(2))} ${units[exponent]}`
}

export function formatDurationShort(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  return `${seconds}s`
}
