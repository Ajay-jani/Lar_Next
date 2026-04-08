import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  FILE_SHARE_MAX_DOWNLOADS,
  FILE_SHARE_STORE_DIRNAME,
} from './file-share-config'
import { logger } from './server-logger'

export interface FileData {
  id: string
  name: string
  size: number
  type: string
  path: string
  expiresAt: Date
  downloadCount: number
  maxDownloads: number
}

// Store metadata in a JSON file
const STORE_DIR = path.join(process.cwd(), FILE_SHARE_STORE_DIRNAME)
const STORE_FILE = path.join(STORE_DIR, '.file-store.json')
const STORE_LOCK_FILE = path.join(STORE_DIR, '.file-store.lock')
const LOCK_TIMEOUT_MS = 5000
const LOCK_RETRY_MS = 25
const STALE_LOCK_TIMEOUT_MS = 30 * 1000

// Ensure store directory exists
async function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    await mkdir(STORE_DIR, { recursive: true })
  }
}

type ClaimDownloadResult =
  | { status: 'ok'; file: FileData }
  | { status: 'missing' }
  | { status: 'expired'; file: FileData }
  | { status: 'limit'; file: FileData }

function normalizeStoredEntries(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object') {
    return {}
  }

  if (
    'files' in parsed &&
    parsed.files &&
    typeof parsed.files === 'object' &&
    !Array.isArray(parsed.files)
  ) {
    return parsed.files as Record<string, unknown>
  }

  return parsed as Record<string, unknown>
}

function toFileData(id: string, storedValue: unknown): FileData | null {
  if (!storedValue || typeof storedValue !== 'object') {
    return null
  }

  const value = storedValue as Record<string, unknown>

  if (typeof value.path === 'string') {
    return {
      id,
      name: typeof value.name === 'string' ? value.name : id,
      size: typeof value.size === 'number' ? value.size : 0,
      type: typeof value.type === 'string' ? value.type : 'application/octet-stream',
      path: value.path,
      expiresAt: new Date(value.expiresAt as string | number | Date),
      downloadCount: typeof value.downloadCount === 'number' ? value.downloadCount : 0,
      maxDownloads:
        typeof value.maxDownloads === 'number'
          ? value.maxDownloads
          : FILE_SHARE_MAX_DOWNLOADS,
    }
  }

  if (typeof value.filename === 'string') {
    const extension = path.extname(value.filename)

    return {
      id,
      name: value.filename,
      size: typeof value.size === 'number' ? value.size : 0,
      type: typeof value.type === 'string' ? value.type : 'application/octet-stream',
      path: path.join(STORE_DIR, `${id}${extension}`),
      expiresAt: new Date(value.expiresAt as string | number | Date),
      downloadCount: typeof value.downloads === 'number' ? value.downloads : 0,
      maxDownloads:
        typeof value.maxDownloads === 'number'
          ? value.maxDownloads
          : FILE_SHARE_MAX_DOWNLOADS,
    }
  }

  return null
}

async function loadStore(): Promise<Map<string, FileData>> {
  try {
    await ensureStoreDir()
    
    if (!existsSync(STORE_FILE)) {
      return new Map()
    }
    
    const data = await readFile(STORE_FILE, 'utf-8')
    const parsed = normalizeStoredEntries(JSON.parse(data))
    
    // Convert back to Map and restore Date objects
    const store = new Map<string, FileData>()
    for (const [id, fileData] of Object.entries(parsed)) {
      const normalized = toFileData(id, fileData)
      if (normalized) {
        store.set(id, normalized)
      }
    }
    
    return store
  } catch (error) {
    logger.error('Error loading file store:', error)
    return new Map()
  }
}

async function saveStore(store: Map<string, FileData>): Promise<void> {
  try {
    await ensureStoreDir()
    
    const obj = Object.fromEntries(store.entries())
    const tempFile = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tempFile, JSON.stringify(obj, null, 2))
    await rename(tempFile, STORE_FILE)
  } catch (error) {
    logger.error('Error saving file store:', error)
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function clearStaleLock(): Promise<void> {
  try {
    const lockStats = await stat(STORE_LOCK_FILE)
    if (Date.now() - lockStats.mtimeMs > STALE_LOCK_TIMEOUT_MS) {
      await unlink(STORE_LOCK_FILE)
    }
  } catch {
    // Ignore missing lock files and races during cleanup.
  }
}

async function withStoreLock<T>(callback: () => Promise<T>): Promise<T> {
  await ensureStoreDir()

  const start = Date.now()

  while (true) {
    try {
      const handle = await open(STORE_LOCK_FILE, 'wx')

      try {
        return await callback()
      } finally {
        await handle.close().catch(() => undefined)
        await unlink(STORE_LOCK_FILE).catch(() => undefined)
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code

      if (code !== 'EEXIST') {
        throw error
      }

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error('Timed out while waiting for the file store lock')
      }

      await clearStaleLock()
      await wait(LOCK_RETRY_MS)
    }
  }
}

// File store implementation
export const fileStore = {
  get: async (id: string): Promise<FileData | undefined> => {
    const store = await loadStore()
    return store.get(id)
  },
  
  set: async (id: string, data: FileData): Promise<void> => {
    await withStoreLock(async () => {
      const store = await loadStore()
      store.set(id, data)
      await saveStore(store)
    })
  },
  
  delete: async (id: string): Promise<boolean> => {
    return withStoreLock(async () => {
      const store = await loadStore()
      const deleted = store.delete(id)
      if (deleted) {
        await saveStore(store)
      }
      return deleted
    })
  },
  
  entries: async (): Promise<[string, FileData][]> => {
    const store = await loadStore()
    return Array.from(store.entries())
  },
  
  size: async (): Promise<number> => {
    const store = await loadStore()
    return store.size
  },
  
  clear: async (): Promise<void> => {
    await withStoreLock(async () => {
      await ensureStoreDir()
      if (existsSync(STORE_FILE)) {
        await unlink(STORE_FILE)
      }
    })
  },

  claimDownload: async (id: string): Promise<ClaimDownloadResult> => {
    return withStoreLock(async () => {
      const store = await loadStore()
      const fileData = store.get(id)

      if (!fileData) {
        return { status: 'missing' }
      }

      if (fileData.expiresAt < new Date()) {
        store.delete(id)
        await saveStore(store)
        return { status: 'expired', file: fileData }
      }

      if (!existsSync(fileData.path)) {
        store.delete(id)
        await saveStore(store)
        return { status: 'missing' }
      }

      if (fileData.downloadCount >= fileData.maxDownloads) {
        return { status: 'limit', file: fileData }
      }

      const updatedFile = {
        ...fileData,
        downloadCount: fileData.downloadCount + 1,
      }

      store.set(id, updatedFile)
      await saveStore(store)

      return { status: 'ok', file: updatedFile }
    })
  },
}

// Clean up expired files
export async function cleanupExpiredFiles(): Promise<void> {
  try {
    const expiredFiles = await withStoreLock(async () => {
      const now = new Date()
      const store = await loadStore()
      const expiredEntries: FileData[] = []

      for (const [id, fileData] of store.entries()) {
        if (fileData.expiresAt < now) {
          store.delete(id)
          expiredEntries.push(fileData)
        }
      }

      if (expiredEntries.length > 0) {
        await saveStore(store)
      }

      return expiredEntries
    })

    for (const fileData of expiredFiles) {
      try {
        if (existsSync(fileData.path)) {
          await unlink(fileData.path)
        }
      } catch {
        // The cleanup path should stay resilient even if a file is already gone.
      }
    }
  } catch (error) {
    logger.error('Error during cleanup:', error)
  }
}
