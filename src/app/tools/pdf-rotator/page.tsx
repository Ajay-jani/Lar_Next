import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFRotatorPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-rotator">
      <PDFClientTool toolId="pdf-rotator" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Rotator - UtilityHub',
  description: 'Rotate all pages or selected page ranges in a PDF directly in your browser.',
}
