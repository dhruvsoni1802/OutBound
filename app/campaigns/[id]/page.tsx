import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ActivateCampaignButton } from '@/components/campaigns/ActivateCampaignButton'
import { ContactsPollingTable } from '@/components/campaigns/ContactsPollingTable'
import { getCampaignDetail } from '@/lib/server/queries/campaigns'
import type { CampaignStatus } from '@/types/campaign'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400' },
  paused: { label: 'Paused', className: 'bg-amber-500/15 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-primary/15 text-primary' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground/60' },
}

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  direct: 'Direct',
  consultative: 'Consultative',
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const detail = await getCampaignDetail(id, user!.id)
  if (!detail) notFound()

  const { campaign: c, contacts: contactList } = detail

  const { label, className } = STATUS_CONFIG[c.status]
  const agentIsActive =
    c.status === 'active' && contactList.some((ct) => ct.status !== 'pending')
  const replyRate =
    c.emails_sent > 0
      ? Math.round((c.emails_replied / c.emails_sent) * 100)
      : 0

  return (
    <div className="animate-fade-in space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href="/campaigns"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All campaigns
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-foreground">
                {c.name}
              </h1>
              <Badge className={cn('text-xs font-medium', className)}>
                {label}
              </Badge>
              {c.status === 'active' && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span
                    className={`inline-block h-2 w-2 rounded-full bg-emerald-400 ${agentIsActive ? 'animate-pulse' : 'opacity-50'}`}
                  />
                  {agentIsActive ? 'Agent running' : 'Agent queued'}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {c.goal}
            </p>
          </div>

          <ActivateCampaignButton campaignId={c.id} initialStatus={c.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Emails sent', value: c.emails_sent },
          { label: 'Replies', value: c.emails_replied },
          { label: 'Reply rate', value: `${replyRate}%` },
          { label: 'Conversions', value: c.conversions },
        ].map(({ label: l, value }) => (
          <div
            key={l}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      {/* Config summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Configuration
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <ConfigRow label="Agent name" value={c.agent_name} />
          <ConfigRow label="Company" value={c.agent_company} />
          <ConfigRow label="Tone" value={TONE_LABELS[c.agent_tone] ?? c.agent_tone} />
          <ConfigRow label="Max follow-ups" value={c.max_followups} />
          <ConfigRow
            label="Follow-up delay"
            value={
              c.followup_delay_hours < 48
                ? `${c.followup_delay_hours} hours`
                : `${c.followup_delay_hours / 24} days`
            }
          />
          <ConfigRow
            label="Web search"
            value={c.web_search_enabled ? 'Enabled' : 'Disabled'}
          />
        </div>
      </div>

      {/* Contacts table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Contacts{' '}
            <span className="ml-1 text-muted-foreground">
              ({contactList.length})
            </span>
          </h2>
        </div>

        <ContactsPollingTable
          campaignId={c.id}
          campaignStatus={c.status}
          initialContacts={contactList}
        />
      </div>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  )
}
