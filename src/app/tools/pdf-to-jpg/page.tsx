import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFToJPGPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-to-jpg">
      <PDFClientTool toolId="pdf-to-jpg" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF to JPG - UtilityHub',
  description: 'Convert PDF pages into JPG images and download them as a ZIP directly in your browser.',
}
