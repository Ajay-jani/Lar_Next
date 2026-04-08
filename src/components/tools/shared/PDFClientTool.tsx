'use client'

import dynamic from 'next/dynamic'

import { ToolPageLoader } from './ToolPageLoader'

const pdfClientTools = {
  'jpg-to-pdf': dynamic(() => import('@/components/tools/JPGToPDF').then(module => module.JPGToPDF), {
    ssr: false,
    loading: () => <ToolPageLoader title="JPG to PDF" description="Loading the PDF workspace..." />,
  }),
  'pdf-compressor': dynamic(() => import('@/components/tools/PDFCompressor').then(module => module.PDFCompressor), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Compressor" description="Loading the PDF workspace..." />,
  }),
  'pdf-merger': dynamic(() => import('@/components/tools/PDFMerger').then(module => module.PDFMerger), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Merger" description="Loading the PDF workspace..." />,
  }),
  'pdf-organizer': dynamic(() => import('@/components/tools/PDFOrganizer').then(module => module.PDFOrganizer), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Organizer" description="Loading the PDF workspace..." />,
  }),
  'pdf-page-extractor': dynamic(() => import('@/components/tools/PDFPageExtractor').then(module => module.PDFPageExtractor), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Page Extractor" description="Loading the PDF workspace..." />,
  }),
  'pdf-page-numberer': dynamic(() => import('@/components/tools/PDFPageNumberer').then(module => module.PDFPageNumberer), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Page Numberer" description="Loading the PDF workspace..." />,
  }),
  'pdf-rotator': dynamic(() => import('@/components/tools/PDFRotator').then(module => module.PDFRotator), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Rotator" description="Loading the PDF workspace..." />,
  }),
  'pdf-signer': dynamic(() => import('@/components/tools/PDFSigner').then(module => module.PDFSigner), {
    ssr: false,
    loading: () => <ToolPageLoader title="Sign PDF" description="Loading the PDF workspace..." />,
  }),
  'pdf-splitter': dynamic(() => import('@/components/tools/PDFSplitter').then(module => module.PDFSplitter), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Splitter" description="Loading the PDF workspace..." />,
  }),
  'pdf-to-jpg': dynamic(() => import('@/components/tools/PDFToJPG').then(module => module.PDFToJPG), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF to JPG" description="Loading the PDF workspace..." />,
  }),
  'pdf-watermark': dynamic(() => import('@/components/tools/PDFWatermark').then(module => module.PDFWatermark), {
    ssr: false,
    loading: () => <ToolPageLoader title="PDF Watermark" description="Loading the PDF workspace..." />,
  }),
} as const

export type PDFClientToolId = keyof typeof pdfClientTools

export function PDFClientTool({ toolId }: { toolId: PDFClientToolId }) {
  const ToolComponent = pdfClientTools[toolId]

  return <ToolComponent />
}
