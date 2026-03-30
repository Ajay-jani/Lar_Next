import { PDFPageExtractor } from '@/components/tools/PDFPageExtractor'

export default function PDFPageExtractorPage() {
  return <PDFPageExtractor />
}

export const metadata = {
  title: 'PDF Page Extractor - UtilityHub',
  description: 'Extract selected pages from a PDF and export them into a clean new document.',
}
