import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getRelatedTools, type ToolCatalogItem } from '@/lib/tool-catalog'

interface PDFToolPageLayoutProps {
  currentToolId: ToolCatalogItem['id']
  children: ReactNode
}

export function PDFToolPageLayout({ currentToolId, children }: PDFToolPageLayoutProps) {
  const relatedTools = getRelatedTools(currentToolId, 'pdf')

  return (
    <>
      {children}

      {relatedTools.length > 0 ? (
        <section className="container mx-auto max-w-6xl px-4 pb-16 pt-4">
          <div className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Related Tools</p>
            <h2 className="text-2xl font-semibold text-foreground">More PDF workflows</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Move into another PDF task right away. Bulk-ready services keep the same banner so
              users can spot batch workflows quickly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {relatedTools.map(tool => {
              const IconComponent = tool.icon

              return (
                <Link key={tool.href} href={tool.href} className="group">
                  <Card className="tool-card h-full animate-fade-in">
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
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
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {tool.categoryLabel}
                        </p>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {tool.bannerLabel ? (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {tool.bannerLabel}
                          </span>
                        </div>
                      ) : null}

                      <p className="leading-relaxed text-muted-foreground">{tool.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {tool.highlights.slice(0, 2).map(highlight => (
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
      ) : null}
    </>
  )
}
