import type { WizardConfig } from './WizardShell'
import type { ContactRow } from '@/lib/validation/campaign'

interface Props {
  config: WizardConfig
  contacts: ContactRow[]
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="divide-y divide-border rounded-lg border border-border bg-background px-4">
        {children}
      </div>
    </div>
  )
}

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  direct: 'Direct',
  consultative: 'Consultative',
}

export function Step5_Review({ config, contacts }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Review & launch
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Double-check your settings before creating the campaign.
        </p>
      </div>

      <Section title="Campaign">
        <Row label="Name" value={config.name} />
        <Row label="Goal" value={<span className="max-w-xs text-right">{config.goal}</span>} />
      </Section>

      <Section title="Agent persona">
        <Row label="Name" value={config.agentName} />
        <Row label="Company" value={config.agentCompany} />
        <Row label="Tone" value={TONE_LABELS[config.agentTone] ?? config.agentTone} />
      </Section>

      <Section title="Sequence">
        <Row label="Max follow-ups" value={config.maxFollowups} />
        <Row
          label="Delay between follow-ups"
          value={
            config.followupDelayHours < 48
              ? `${config.followupDelayHours} hours`
              : `${config.followupDelayHours / 24} days`
          }
        />
        <Row
          label="Web search enrichment"
          value={config.webSearchEnabled ? 'Enabled' : 'Disabled'}
        />
      </Section>

      <Section title="Contacts">
        <Row label="Total contacts" value={contacts.length} />
      </Section>

      <p className="text-xs text-muted-foreground">
        The campaign will be created as a <strong>draft</strong>. Activation is
        coming in the next release.
      </p>
    </div>
  )
}
