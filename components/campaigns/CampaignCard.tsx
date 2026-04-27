import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignStatus } from '@/types/campaign'

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400' },
  paused: { label: 'Paused', className: 'bg-amber-500/15 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-primary/15 text-primary' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground/60' },
}

interface CampaignCardProps {
  campaign: Campaign
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { label, className } = STATUS_CONFIG[campaign.status]
  const replyRate =
    campaign.emails_sent > 0
      ? Math.round((campaign.emails_replied / campaign.emails_sent) * 100)
      : 0

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
            {campaign.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {campaign.goal}
          </p>
        </div>
        <Badge className={cn('flex-shrink-0 text-xs font-medium', className)}>
          {label}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4">
        <Metric label="Sent" value={campaign.emails_sent} />
        <Metric label="Replied" value={campaign.emails_replied} />
        <Metric label="Reply rate" value={`${replyRate}%`} />
        <Metric label="Conversions" value={campaign.conversions} />
      </div>
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
