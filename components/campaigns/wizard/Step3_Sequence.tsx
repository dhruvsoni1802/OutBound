import { cn } from '@/lib/utils'
import type { WizardConfig } from './WizardShell'

interface Props {
  config: WizardConfig
  onChange: (payload: Partial<WizardConfig>) => void
}

const FOLLOWUP_OPTIONS = [1, 2, 3, 4, 5, 7, 10]
const DELAY_OPTIONS = [
  { label: '24 h', value: 24 },
  { label: '48 h', value: 48 },
  { label: '72 h', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
]

export function Step3_Sequence({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Email sequence
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how many follow-ups to send and how long to wait between them.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          Max follow-ups
        </p>
        <div className="flex flex-wrap gap-2">
          {FOLLOWUP_OPTIONS.map((n) => {
            const selected = config.maxFollowups === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ maxFollowups: n })}
                className={cn(
                  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Agent sends initial email + up to {config.maxFollowups} follow-up
          {config.maxFollowups !== 1 ? 's' : ''}.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          Delay between follow-ups
        </p>
        <div className="flex flex-wrap gap-2">
          {DELAY_OPTIONS.map(({ label, value }) => {
            const selected = config.followupDelayHours === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ followupDelayHours: value })}
                className={cn(
                  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Web search enrichment
          </p>
          <p className="text-xs text-muted-foreground">
            Agent researches each contact before writing emails
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.webSearchEnabled}
          onClick={() =>
            onChange({ webSearchEnabled: !config.webSearchEnabled })
          }
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
            config.webSearchEnabled ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
              config.webSearchEnabled ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  )
}
