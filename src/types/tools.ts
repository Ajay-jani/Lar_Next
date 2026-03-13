import { LucideIcon } from 'lucide-react'

export interface Tool {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: LucideIcon
  route: string
  features: string[]
  isNew?: boolean
  isPremium?: boolean
  isFeatured?: boolean
  tags: string[]
}

export type ToolCategory = 
  | 'image' 
  | 'pdf' 
  | 'document' 
  | 'developer' 
  | 'design' 
  | 'text'

export interface ToolCategoryInfo {
  id: ToolCategory
  name: string
  description: string
  icon: LucideIcon
  color: string
  tools: Tool[]
}

export interface ProcessingOptions {
  quality?: number
  format?: string
  maxSize?: number
  [key: string]: any
}

export interface ProcessingResult {
  success: boolean
  data?: Blob | string | any
  error?: string
  metadata?: {
    originalSize?: number
    newSize?: number
    compressionRatio?: number
    processingTime?: number
  }
}

export interface FileUploadState {
  files: File[]
  isUploading: boolean
  progress: number
  error: string | null
}

export interface ToolPageProps {
  params: {
    toolId: string
  }
}