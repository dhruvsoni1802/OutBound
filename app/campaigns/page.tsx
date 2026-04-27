import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { CampaignStatsBar } from '@/components/campaigns/CampaignStatsBar'
import type { Campaign } from '@/types/campaign'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const list = (campaigns ?? []) as Campaign[]

  const totalSent = list.reduce((s, c) => s + c.emails_sent, 0)
  const totalReplied = list.reduce((s, c) => s + c.emails_replied, 0)
  const totalConversions = list.reduce((s, c) => s + c.conversions, 0)
  const overallRate =
    totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your autonomous outreach campaigns
          </p>
        </div>
        <Link href="/campaigns/new" className={buttonVariants()}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {list.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            All time
          </p>
          <CampaignStatsBar
            stats={[
              { label: 'Campaigns', value: list.length },
              { label: 'Emails sent', value: totalSent },
              { label: 'Replies', value: totalReplied },
              { label: 'Reply rate', value: `${overallRate}%` },
              { label: 'Conversions', value: totalConversions },
            ]}
          />
        </div>
      )}

      <div className="mt-8">
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Plus className="h-6 w-6 text-primary" />
      </div>
      <h2 className="font-semibold text-foreground">No campaigns yet</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Create your first campaign to start autonomous email outreach.
      </p>
      <Link href="/campaigns/new" className={buttonVariants({ className: 'mt-6' })}>
        Create campaign
      </Link>
    </div>
  )
}
