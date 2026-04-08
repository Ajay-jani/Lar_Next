import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFSplitterPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-splitter">
      <PDFClientTool toolId="pdf-splitter" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Splitter - Dev Utilities Hub',
  description: 'Split PDF files by pages, ranges, or file size with professional precision. Advanced PDF splitting tool with multiple methods and custom options.',
}
