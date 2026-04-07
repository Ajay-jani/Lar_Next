import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toolsByCategory } from '@/lib/tool-catalog'

export default function ToolsPage() {
  const totalTools = toolsByCategory.reduce((count, category) => count + category.tools.length, 0)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="heading-lg mb-4 text-balance">
          Fast Utilities for Real Work
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto text-balance">
          {totalTools}+ browser-based utilities for PDF, image, text, design, and developer workflows. Built to help people finish tasks quickly without sending files away.
        </p>
      </div>

      {toolsByCategory.map(category => (
        <section key={category.id} className="mb-16 animate-slide-up">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-semibold text-foreground">{category.label}</h2>
            <span className="text-sm text-muted-foreground">{category.tools.length} tools</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.tools.map(tool => {
              const IconComponent = tool.icon

              return (
                <Link key={tool.href} href={tool.href} className="group">
                  <Card className="tool-card h-full animate-fade-in">
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <span className="rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-medium text-info">
                            {tool.speedLabel}
                          </span>
                          <span className={tool.status === 'new' ? 'status-new' : 'status-ready'}>
                            {tool.status === 'new' ? 'New' : 'Ready'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{tool.categoryLabel}</p>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {tool.highlights.map(highlight => (
                          <span
                            key={highlight}
                            className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
