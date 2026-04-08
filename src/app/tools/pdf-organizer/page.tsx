import { PDFToolPageLayout } from '@/components/tools/PDFToolPageLayout'
import { PDFClientTool } from '@/components/tools/shared/PDFClientTool'

export default function PDFOrganizerPage() {
  return (
    <PDFToolPageLayout currentToolId="pdf-organizer">
      <PDFClientTool toolId="pdf-organizer" />
    </PDFToolPageLayout>
  )
}

export const metadata = {
  title: 'PDF Organizer - UtilityHub',
  description: 'Sort, rotate, delete, and combine PDF pages directly in your browser.',
}
