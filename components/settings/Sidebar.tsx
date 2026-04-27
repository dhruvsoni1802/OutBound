'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Integrations', href: '/settings/integrations', enabled: true },
  { label: 'Campaign Defaults', href: '/settings/campaigns', enabled: false },
  { label: 'Team', href: '/settings/team', enabled: false },
  { label: 'Billing', href: '/settings/billing', enabled: false },
]

interface SidebarProps {
  userEmail: string
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-border bg-card px-4 py-8">
      {/* Logo */}
      <div className="mb-8 px-2">
        <Image src="/logo.svg" alt="Embra" width={80} height={22} priority />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Settings navigation">
        {navItems.map(({ label, href, enabled }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={enabled ? href : '#'}
              aria-disabled={!enabled}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={enabled ? undefined : -1}
              className={cn(
                'relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : enabled
                    ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/40',
                isActive && 'before:absolute before:left-0 before:top-1/2 before:h-4 before:-translate-y-1/2 before:w-0.5 before:rounded-full before:bg-primary'
              )}
              onClick={(e) => !enabled && e.preventDefault()}
            >
              {label}
              {!enabled && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground/40">
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-3 truncate px-3 text-xs text-muted-foreground">
          {userEmail}
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
