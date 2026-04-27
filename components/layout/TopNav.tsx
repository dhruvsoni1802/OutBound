'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Campaigns', href: '/campaigns', match: '/campaigns' },
  { label: 'Settings', href: '/settings/integrations', match: '/settings' },
] as const

interface TopNavProps {
  userEmail: string
}

export function TopNav({ userEmail }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initial = userEmail[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-6">
      {/* Logo */}
      <Link href="/campaigns" className="mr-8 flex-shrink-0">
        <Image src="/logo.svg" alt="OutBound" width={96} height={22} priority />
      </Link>

      {/* Nav links */}
      <nav className="flex flex-1 items-center gap-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ label, href, match }) => {
          const isActive = pathname.startsWith(match)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="User menu"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {initial}
          </span>
          <span className="hidden max-w-[160px] truncate sm:block">{userEmail}</span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-xl"
            >
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <button
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
