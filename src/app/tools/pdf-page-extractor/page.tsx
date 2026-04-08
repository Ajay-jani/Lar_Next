import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFPageExtractorPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-page-extractor">
      <PDFClientTool toolId="pdf-page-extractor" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Page Extractor - UtilityHub',
  description: 'Extract selected pages from a PDF and export them into a clean new document.',
}
