import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFWatermarkPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-watermark">
      <PDFClientTool toolId="pdf-watermark" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Watermark - UtilityHub',
  description: 'Add text or image watermarks to PDF files directly in your browser.',
}
