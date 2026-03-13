import { ImageCompressor } from '@/components/tools/ImageCompressor'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Image Compressor - Reduce File Size Online | UtilityHub',
  description: 'Compress JPG, PNG, and WebP images without losing quality. Free online image compression tool with adjustable quality settings.',
  keywords: 'image compressor, compress images, reduce file size, JPG PNG WebP, online image optimizer'
}

export default function ImageCompressorPage() {
  return <ImageCompressor />
}