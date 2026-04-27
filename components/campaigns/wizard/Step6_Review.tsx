'use client'

import {
  UserSearch,
  TrendingUp,
  DollarSign,
  Handshake,
  Settings2,
  Paperclip,
} from 'lucide-react'
import type { WizardConfig } from './WizardShell'
import type { ContactRow } from '@/lib/validation/campaign'
import type { CampaignType } from '@/lib/validation/campaign'

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  direct: 'Direct',
  consultative: 'Consultative',
}

const TYPE_META: Record<
  CampaignType,
  { label: string; Icon: React.ElementType }
> = {
  recruitment_outreach: { label: 'Job Application Outreach', Icon: UserSearch },
  sales_outreach: { label: 'Sales & Lead Generation', Icon: TrendingUp },
  investor_outreach: { label: 'Investor Outreach', Icon: DollarSign },
  partnership_outreach: { label: 'Partnership Development', Icon: Handshake },
  custom: { label: 'Custom', Icon: Settings2 },
}

interface Props {
  config: WizardConfig
  contacts: ContactRow[]
  campaignType: CampaignType | null
  contextFields: Record<string, unknown>
  attachmentCount: number
}

export function Step6_Review({
  config,
  contacts,
  campaignType,
  contextFields,
  attachmentCount,
}: Props) {
  const typeMeta = campaignType ? TYPE_META[campaignType] : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Review Campaign
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check everything looks right before creating your campaign.
        </p>
      </div>

      {/* Campaign type card */}
      {typeMeta && campaignType && (
        <ReviewCard title="Campaign Type">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <typeMeta.Icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {typeMeta.label}
            </p>
          </div>
        </ReviewCard>
      )}

      {/* Campaign meta */}
      <ReviewCard title="Campaign">
        <Row label="Name" value={config.name} />
        <Row label="Goal" value={config.goal} multiline />
      </ReviewCard>

      {/* Context */}
      {Object.keys(contextFields).length > 0 && (
        <ReviewCard title="Context">
          {campaignType === 'custom' ? (
            <div>
              <p className="text-xs text-muted-foreground">System prompt</p>
              <p className="mt-0.5 line-clamp-3 text-sm text-foreground">
                {typeof contextFields.custom_system_prompt === 'string'
                  ? contextFields.custom_system_prompt
                  : '—'}
              </p>
            </div>
          ) : (
            <ContextSummary type={campaignType} fields={contextFields} />
          )}
        </ReviewCard>
      )}

      {/* Agent persona */}
      <ReviewCard title="Agent">
        <Row label="Name" value={config.agentName} />
        <Row label="Company" value={config.agentCompany} />
        <Row label="Tone" value={TONE_LABELS[config.agentTone] ?? config.agentTone} />
      </ReviewCard>

      {/* Sequence */}
      <ReviewCard title="Sequence">
        <Row label="Max follow-ups" value={config.maxFollowups} />
        <Row
          label="Delay"
          value={
            config.followupDelayHours < 48
              ? `${config.followupDelayHours} hours`
              : `${config.followupDelayHours / 24} days`
          }
        />
        <Row label="Web search" value={config.webSearchEnabled ? 'On' : 'Off'} />
      </ReviewCard>

      {/* Attachments */}
      {attachmentCount > 0 && (
        <ReviewCard title="Attachments">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            {attachmentCount} file{attachmentCount > 1 ? 's' : ''} will be
            attached to the initial email
          </div>
        </ReviewCard>
      )}

      {/* Contacts */}
      <ReviewCard title="Contacts">
        <p className="mb-3 text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready to
          import
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Email', 'Company'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.slice(0, 3).map((c, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 text-foreground">
                    {c.firstName} {c.lastName ?? ''}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.email}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.company ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacts.length > 3 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            + {contacts.length - 3} more
          </p>
        )}
      </ReviewCard>

      <p className="text-center text-xs text-muted-foreground">
        Campaigns are created in draft status. No emails will be sent until you
        activate the campaign.
      </p>
    </div>
  )
}

function ReviewCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string
  value: string | number
  multiline?: boolean
}) {
  return (
    <div className="flex gap-3">
      <p className="w-28 shrink-0 text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm text-foreground ${multiline ? 'line-clamp-2' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function ContextSummary({
  type,
  fields,
}: {
  type: CampaignType | null
  fields: Record<string, unknown>
}) {
  function str(k: string) {
    return typeof fields[k] === 'string' ? (fields[k] as string) : '—'
  }
  function arr(k: string) {
    return Array.isArray(fields[k])
      ? (fields[k] as string[]).join(', ')
      : '—'
  }
  function bool(k: string, trueLabel: string) {
    return fields[k] === true ? (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
        {trueLabel}
      </span>
    ) : null
  }

  if (type === 'recruitment_outreach') {
    return (
      <>
        <Row label="Current role" value={str('current_role')} />
        <Row label="Degree" value={str('degree')} />
        <Row label="Skills" value={arr('skills')} multiline />
        {fields.resume_attached && (
          <div className="flex items-center gap-2">
            {bool('resume_attached', 'Resume attached')}
          </div>
        )}
      </>
    )
  }
  if (type === 'sales_outreach') {
    return (
      <>
        <Row label="Product" value={str('product_name')} />
        <Row label="Target role" value={str('target_role')} />
        <Row label="Benefits" value={arr('key_benefits')} multiline />
      </>
    )
  }
  if (type === 'investor_outreach') {
    return (
      <>
        <Row label="Stage" value={str('stage')} />
        <Row label="Traction" value={str('traction')} />
        {fields.deck_attached && (
          <div className="flex items-center gap-2">
            {bool('deck_attached', 'Deck attached')}
          </div>
        )}
      </>
    )
  }
  if (type === 'partnership_outreach') {
    return (
      <>
        <Row label="We offer" value={str('value_offered')} multiline />
        <Row label="We seek" value={str('value_sought')} multiline />
      </>
    )
  }
  return null
}
