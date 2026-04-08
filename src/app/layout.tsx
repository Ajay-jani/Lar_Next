import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Zap } from 'lucide-react';
import { featuredTools } from '@/lib/tool-catalog';
import './globals.css';

export const metadata: Metadata = {
  title: 'UtilityHub - Fast PDF, Image, Text, and Developer Tools',
  description: 'Free online tools for PDF workflows, image processing, text summarization, code debugging, and more. Fast, secure, and easy to use.',
  keywords: 'online tools, pdf tools, image compressor, pdf merger, text summarizer, code debugger, free tools',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="utility-hub-theme">
          <div className="min-h-screen bg-background">
            <SiteHeader />
            
            <main className="flex-1">{children}</main>
            
            <footer className="border-t bg-muted/30">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                        <Zap className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="font-bold text-lg">UtilityHub</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Fast online tools for PDF, image, text, and developer workflows. Everything is designed to help users finish practical tasks with less friction.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4 text-foreground">Popular Tools</h3>
                    <ul className="space-y-3 text-sm">
                      {featuredTools.slice(0, 4).map((tool) => (
                        <li key={tool.href}>
                          <Link href={tool.href} className="text-muted-foreground hover:text-primary transition-colors">
                            {tool.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4 text-foreground">Categories</h3>
                    <ul className="space-y-3 text-sm">
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Image Tools</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">PDF Tools</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Developer Tools</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Text Tools</Link></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4 text-foreground">Company</h3>
                    <ul className="space-y-3 text-sm">
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
                      <li><Link href="/tools" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-border/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    © 2026 UtilityHub. Built with Next.js and Tailwind CSS. All tools process data locally for your privacy.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
