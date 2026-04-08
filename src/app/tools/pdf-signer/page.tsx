import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFSignerPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-signer">
      <PDFClientTool toolId="pdf-signer" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'Sign PDF - UtilityHub',
  description: 'Add typed, drawn, or uploaded signatures to PDF files directly in your browser.',
}
