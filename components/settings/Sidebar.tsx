'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Integrations', href: '/settings/integrations', enabled: true },
  { label: 'Campaign Defaults', href: '/settings/campaigns', enabled: false },
  { label: 'Team', href: '/settings/team', enabled: false },
  { label: 'Billing', href: '/settings/billing', enabled: false },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 flex-shrink-0 border-r border-border px-3 py-6">
      <nav aria-label="Settings navigation" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ label, href, enabled }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={enabled ? href : '#'}
              aria-disabled={!enabled}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={enabled ? undefined : -1}
              onClick={(e) => !enabled && e.preventDefault()}
              className={cn(
                'relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:h-4 before:-translate-y-1/2 before:w-0.5 before:rounded-full before:bg-primary'
                  : enabled
                    ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/40'
              )}
            >
              {label}
              {!enabled && (
                <span className="ml-auto text-[10px] text-muted-foreground/40">
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
