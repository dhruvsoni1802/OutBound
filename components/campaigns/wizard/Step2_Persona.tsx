import { cn } from '@/lib/utils'
import type { AgentTone } from '@/types/campaign'
import type { WizardConfig } from './WizardShell'

const TONES: { value: AgentTone; label: string; description: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal, polished, corporate-appropriate',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm, approachable, conversational',
  },
  {
    value: 'direct',
    label: 'Direct',
    description: 'Concise, to-the-point, no fluff',
  },
  {
    value: 'consultative',
    label: 'Consultative',
    description: 'Thoughtful, advisory, insight-led',
  },
]

interface Props {
  config: WizardConfig
  onChange: (payload: Partial<WizardConfig>) => void
}

export function Step2_Persona({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Agent persona
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The agent will introduce itself using these details in every email.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="agent-name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Agent name
          </label>
          <input
            id="agent-name"
            type="text"
            value={config.agentName}
            onChange={(e) => onChange({ agentName: e.target.value })}
            placeholder="e.g. Alex Chen"
            maxLength={50}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="agent-company"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Company
          </label>
          <input
            id="agent-company"
            type="text"
            value={config.agentCompany}
            onChange={(e) => onChange({ agentCompany: e.target.value })}
            placeholder="e.g. Acme Corp"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Agent tone</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TONES.map(({ value, label, description }) => {
            const selected = config.agentTone === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ agentTone: value })}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors duration-150',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-accent'
                )}
              >
                <p
                  className={cn(
                    'text-sm font-medium',
                    selected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
