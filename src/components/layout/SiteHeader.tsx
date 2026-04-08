'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Zap } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/Button'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/tools', label: 'All Tools' },
]

function getNavItemClassName(isActive: boolean) {
  return isActive
    ? 'text-sm font-medium text-foreground'
    : 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
}

export function SiteHeader() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <Link href="/" className="group flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 transition-transform group-hover:scale-105">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-xl font-bold text-transparent">
              UtilityHub
            </span>
          </Link>

          <nav className="hidden items-center space-x-8 md:flex">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`${getNavItemClassName(isActive(item.href))} group relative`}>
                {item.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${
                    isActive(item.href) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 px-0"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-site-nav"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setIsMobileMenuOpen(currentValue => !currentValue)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <nav id="mobile-site-nav" className="border-t border-border/60 pb-4 pt-3 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-3 ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/30 text-foreground hover:bg-muted/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  )
}
