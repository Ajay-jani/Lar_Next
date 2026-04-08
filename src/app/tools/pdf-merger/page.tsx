import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFMergerPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-merger">
      <PDFClientTool toolId="pdf-merger" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Merger - Dev Utilities Hub',
  description: 'Combine multiple PDF files into a single document with advanced options. Drag & drop reordering, page selection, and custom settings.',
}
