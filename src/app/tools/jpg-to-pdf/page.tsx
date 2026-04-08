import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function JPGToPDFPage() {
  return (
    <PDFToolPageLayout currentToolId="jpg-to-pdf">
      <PDFClientTool toolId="jpg-to-pdf" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'JPG to PDF - UtilityHub',
  description: 'Convert JPG and PNG images into a PDF directly in your browser.',
}
