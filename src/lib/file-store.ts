import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// File expires after 5 minutes
const FILE_EXPIRY_TIME = 5 * 60 * 1000 // 5 minutes in milliseconds

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
const STORE_DIR = path.join(process.cwd(), 'temp-uploads')
const STORE_FILE = path.join(STORE_DIR, '.file-store.json')

// Ensure store directory exists
async function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    await mkdir(STORE_DIR, { recursive: true })
  }
}

// Load store from filesystem
async function loadStore(): Promise<Map<string, FileData>> {
  try {
    await ensureStoreDir()
    
    if (!existsSync(STORE_FILE)) {
      return new Map()
    }
    
    const data = await readFile(STORE_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    
    // Convert back to Map and restore Date objects
    const store = new Map<string, FileData>()
    for (const [id, fileData] of Object.entries(parsed)) {
      const data = fileData as any
      store.set(id, {
        ...data,
        expiresAt: new Date(data.expiresAt)
      })
    }
    
    return store
  } catch (error) {
    console.error('Error loading file store:', error)
    return new Map()
  }
}

// Save store to filesystem
async function saveStore(store: Map<string, FileData>): Promise<void> {
  try {
    await ensureStoreDir()
    
    // Convert Map to object for JSON serialization
    const obj = Object.fromEntries(store.entries())
    await writeFile(STORE_FILE, JSON.stringify(obj, null, 2))
  } catch (error) {
    console.error('Error saving file store:', error)
  }
}

// File store implementation
export const fileStore = {
  get: async (id: string): Promise<FileData | undefined> => {
    const store = await loadStore()
    return store.get(id)
  },
  
  set: async (id: string, data: FileData): Promise<void> => {
    const store = await loadStore()
    store.set(id, data)
    await saveStore(store)
  },
  
  delete: async (id: string): Promise<boolean> => {
    const store = await loadStore()
    const deleted = store.delete(id)
    if (deleted) {
      await saveStore(store)
    }
    return deleted
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
    await ensureStoreDir()
    if (existsSync(STORE_FILE)) {
      await unlink(STORE_FILE)
    }
  }
}

// Clean up expired files
export async function cleanupExpiredFiles(): Promise<void> {
  try {
    const now = new Date()
    const entries = await fileStore.entries()
    
    for (const [id, fileData] of entries) {
      if (fileData.expiresAt < now) {
        // Remove from store
        await fileStore.delete(id)
        
        // Delete physical file
        try {
          if (existsSync(fileData.path)) {
            await unlink(fileData.path)
          }
        } catch (error) {
          // File might already be deleted, ignore error
          console.warn('Error deleting expired file:', fileData.path)
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}