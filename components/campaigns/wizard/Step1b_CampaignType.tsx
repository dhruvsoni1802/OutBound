'use client'

import {
  UserSearch,
  TrendingUp,
  DollarSign,
  Handshake,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignType } from '@/lib/validation/campaign'
import { getAllCampaignTypes } from '@/lib/campaignTypes/registry'

const ICON_MAP: Record<string, React.ElementType> = {
  UserSearch,
  TrendingUp,
  DollarSign,
  Handshake,
  Settings2,
}

interface Props {
  value: CampaignType | null
  onChange: (type: CampaignType) => void
}

export function Step1b_CampaignType({ value, onChange }: Props) {
  const options = getAllCampaignTypes()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Campaign Type
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the type of outreach. This shapes the agent&apos;s strategy
          and email tone.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ type, label, description, iconName }) => {
          const Icon = ICON_MAP[iconName] ?? Settings2
          const selected = value === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150',
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  selected
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
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
              </div>
            </button>
          )
        })}
      </div>

      {value === 'custom' && (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          You&apos;ll write the agent&apos;s full instructions in the next
          step.
        </p>
      )}
    </div>
  )
}
