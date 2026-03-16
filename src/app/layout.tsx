import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Zap, Menu } from 'lucide-react';
import './globals.css';

// Initialize the application (including cron jobs)
import '@/lib/startup';

export const metadata: Metadata = {
  title: 'UtilityHub - 50+ Essential Online Tools',
  description: 'Free online tools for image compression, PDF processing, text editing, code debugging, and more. Fast, secure, and easy to use.',
  keywords: 'online tools, image compressor, PDF merger, text tools, developer utilities, free tools',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider defaultTheme="system" storageKey="utility-hub-theme">
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full glass border-b">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link href="/" className="flex items-center space-x-3 group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 group-hover:scale-105 transition-transform">
                        <Zap className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        UtilityHub
                      </span>
                    </Link>
                  </div>
                  
                  <nav className="hidden md:flex items-center space-x-8">
                    <Link 
                      href="/" 
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      Home
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </Link>
                    <Link 
                      href="/tools" 
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      All Tools
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </Link>
                    <ThemeToggle />
                  </nav>

                  <div className="flex md:hidden items-center space-x-2">
                    <ThemeToggle />
                    <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                      <Menu className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </header>
            
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
                      Free online tools for everyday tasks. Fast, secure, and easy to use. Built for developers, by developers.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4 text-foreground">Popular Tools</h3>
                    <ul className="space-y-3 text-sm">
                      <li><Link href="/tools/image-compressor" className="text-muted-foreground hover:text-primary transition-colors">Image Compressor</Link></li>
                      <li><Link href="/tools/pdf-merger" className="text-muted-foreground hover:text-primary transition-colors">PDF Merger</Link></li>
                      <li><Link href="/tools/code-debugger" className="text-muted-foreground hover:text-primary transition-colors">Code Debugger</Link></li>
                      <li><Link href="/tools/color-palette" className="text-muted-foreground hover:text-primary transition-colors">Color Palette</Link></li>
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
                    © 2024 UtilityHub. Built with Next.js and Tailwind CSS. All tools process data locally for your privacy.
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