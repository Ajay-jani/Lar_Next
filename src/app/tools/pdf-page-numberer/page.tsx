import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFPageNumbererPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-page-numberer">
      <PDFClientTool toolId="pdf-page-numberer" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Page Numberer - UtilityHub',
  description: 'Add page numbers to PDFs with custom positions, ranges, and numbering options.',
}
