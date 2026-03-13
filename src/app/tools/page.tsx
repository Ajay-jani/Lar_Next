import React from 'react';
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { 
  Image, 
  FileImage, 
  RotateCcw, 
  FileText, 
  Merge, 
  Split, 
  QrCode,
  Code,
  Palette,
  FileEdit,
  Hash,
  Share2
} from 'lucide-react'

const tools = [
  {
    name: 'Image Compressor',
    description: 'Reduce image file size while maintaining quality',
    href: '/tools/image-compressor',
    status: 'ready',
    icon: Image,
    category: 'Image Tools'
  },
  {
    name: 'Image Converter',
    description: 'Convert images between formats and apply professional filters',
    href: '/tools/image-converter',
    status: 'ready',
    icon: FileImage,
    category: 'Image Tools'
  },
  {
    name: 'Image Resizer',
    description: 'Resize images with precision, presets, and professional quality optimization',
    href: '/tools/image-resizer',
    status: 'ready',
    icon: RotateCcw,
    category: 'Image Tools'
  },
  {
    name: 'PDF Compressor',
    description: 'Reduce PDF file size while maintaining quality',
    href: '/tools/pdf-compressor',
    status: 'ready',
    icon: FileText,
    category: 'PDF Tools'
  },
  {
    name: 'PDF Merger',
    description: 'Combine multiple PDF files with advanced options and page selection',
    href: '/tools/pdf-merger',
    status: 'ready',
    icon: Merge,
    category: 'PDF Tools'
  },
  {
    name: 'PDF Splitter',
    description: 'Split PDF files by pages, ranges, or file size with professional precision',
    href: '/tools/pdf-splitter',
    status: 'ready',
    icon: Split,
    category: 'PDF Tools'
  },
  {
    name: 'QR Code Generator',
    description: 'Generate beautiful, customizable QR codes with advanced styling',
    href: '/tools/qr-generator',
    status: 'ready',
    icon: QrCode,
    category: 'Utilities'
  },
  {
    name: 'Code Debugger',
    description: 'Debug and analyze your code',
    href: '/tools/code-debugger',
    status: 'coming-soon',
    icon: Code,
    category: 'Developer Tools'
  },
  {
    name: 'Color Palette',
    description: 'Create beautiful color harmonies and export them in multiple formats',
    href: '/tools/color-palette',
    status: 'ready',
    icon: Palette,
    category: 'Design Tools'
  },
  {
    name: 'Content Improver',
    description: 'AI-powered grammar correction, style improvement, and tone adjustment',
    href: '/tools/content-improver',
    status: 'ready',
    icon: FileEdit,
    category: 'Text Tools'
  },
  {
    name: 'File Share',
    description: 'Share files securely with temporary links that expire automatically',
    href: '/tools/file-share',
    status: 'ready',
    icon: Share2,
    category: 'Utilities'
  },
  {
    name: 'Hash Generator',
    description: 'Generate cryptographic hashes and encrypt/decrypt data with AES-256, MD5, SHA-256, SHA-512, HMAC',
    href: '/tools/hash-generator',
    status: 'ready',
    icon: Hash,
    category: 'Developer Tools'
  }
]

const categories = [...new Set(tools.map(tool => tool.category))]

export default function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="heading-lg mb-4 text-balance">Developer Tools</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
          Essential utilities for developers, designers, and content creators
        </p>
      </div>

      {categories.map((category) => {
        const categoryTools = tools.filter(tool => tool.category === category)
        
        return (
          <div key={category} className="mb-16">
            <h2 className="text-2xl font-semibold mb-8 text-foreground">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTools.map((tool) => {
                const IconComponent = tool.icon
                return (
                  <Link key={tool.href} href={tool.href} className="group">
                    <Card className="tool-card h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          {tool.status === 'ready' && (
                            <span className="status-ready">Ready</span>
                          )}
                          {tool.status === 'coming-soon' && (
                            <span className="status-coming-soon">Soon</span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}