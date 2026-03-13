import { PDFCompressor } from '@/components/tools/PDFCompressor'

export const metadata = {
  title: 'PDF Compressor - Dev Utilities Hub',
  description: 'Compress PDF files while maintaining document quality. Free online PDF compression tool with multiple compression modes.',
}

export default function PDFCompressorPage() {
  return <PDFCompressor />
}