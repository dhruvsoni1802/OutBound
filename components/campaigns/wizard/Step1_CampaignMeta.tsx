import type { WizardConfig } from './WizardShell'

interface Props {
  config: WizardConfig
  onChange: (payload: Partial<WizardConfig>) => void
}

export function Step1_CampaignMeta({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Campaign basics
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your campaign a name and describe what you want to achieve.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="campaign-name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Campaign name
          </label>
          <input
            id="campaign-name"
            type="text"
            value={config.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Q2 Series-A Investors Outreach"
            maxLength={80}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {config.name.length}/80 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="campaign-goal"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Campaign goal
          </label>
          <textarea
            id="campaign-goal"
            value={config.goal}
            onChange={(e) => onChange({ goal: e.target.value })}
            placeholder="Describe what you want the agent to accomplish. What action should contacts take? What outcome are you driving toward?"
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {config.goal.length}/500 characters
          </p>
        </div>
      </div>
    </div>
  )
}
