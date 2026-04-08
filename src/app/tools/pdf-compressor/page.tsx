import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export const metadata = {
  title: 'PDF Compressor - Dev Utilities Hub',
  description: 'Compress PDF files while maintaining document quality. Free online PDF compression tool with multiple compression modes.',
}

export default function PDFCompressorPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-compressor">
      <PDFClientTool toolId="pdf-compressor" />
    </PDFToolPageLayout>
  )
}
