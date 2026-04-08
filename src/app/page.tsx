import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Zap, Shield, Rocket } from 'lucide-react';
import { featuredTools } from '@/lib/tool-catalog';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-gradient py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="container mx-auto text-center relative">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="heading-xl mb-6 text-balance">
              Fast Online Utilities
              <span className="text-primary block">Built for Real Tasks</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed text-balance">
              Free, fast, and secure tools for PDF workflows, image processing, text summaries,
              and developer tasks. Everything is designed to feel immediate and privacy-first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tools">
                <Button size="lg" className="btn-gradient group">
                  Explore All Tools
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4 text-balance">Why Choose Our Tools?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
              Built with modern web technologies for the best user experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group animate-slide-up">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                All tools process data locally in your browser for instant results with zero latency
              </p>
            </div>
            <div className="text-center group animate-slide-up">
              <div className="w-16 h-16 mx-auto mb-6 bg-success/10 rounded-2xl flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Shield className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your files never leave your device. Complete privacy guaranteed with client-side processing
              </p>
            </div>
            <div className="text-center group animate-slide-up">
              <div className="w-16 h-16 mx-auto mb-6 bg-warning/10 rounded-2xl flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                <Rocket className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Always Free</h3>
              <p className="text-muted-foreground leading-relaxed">
                No registration, no limits, no hidden fees. Just powerful tools when you need them
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4 text-balance">Featured Utilities</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
              Start with the fastest workflows and the newest tools we just completed
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredTools.map((tool) => {
              const IconComponent = tool.icon

              return (
                <Link key={tool.href} href={tool.href} className="group">
                  <Card className="tool-card h-full animate-fade-in">
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
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
                        <CardTitle className="text-xl">{tool.name}</CardTitle>
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
                      <p className="text-muted-foreground leading-relaxed">
                        {tool.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tool.highlights.slice(0, 2).map((highlight) => (
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
          
          <div className="text-center mt-12">
            <Link href="/tools">
              <Button variant="outline" size="lg" className="group">
                View All Tools
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
