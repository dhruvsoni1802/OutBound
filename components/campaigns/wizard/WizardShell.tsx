'use client'

import { useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AgentTone } from '@/types/campaign'
import type { ContactRow } from '@/lib/validation/campaign'
import { Step1_CampaignMeta } from './Step1_CampaignMeta'
import { Step2_Persona } from './Step2_Persona'
import { Step3_Sequence } from './Step3_Sequence'
import { Step4_Contacts } from './Step4_Contacts'
import { Step5_Review } from './Step5_Review'

const STEPS = [
  'Campaign Info',
  'Agent Persona',
  'Sequence',
  'Contacts',
  'Review',
]

export interface WizardConfig {
  name: string
  goal: string
  agentName: string
  agentCompany: string
  agentTone: AgentTone | ''
  maxFollowups: number
  followupDelayHours: number
  webSearchEnabled: boolean
}

interface WizardState {
  step: number
  config: WizardConfig
  contacts: ContactRow[]
}

type WizardAction =
  | { type: 'SET_CONFIG'; payload: Partial<WizardConfig> }
  | { type: 'SET_CONTACTS'; payload: ContactRow[] }
  | { type: 'NEXT' }
  | { type: 'PREV' }

const initialConfig: WizardConfig = {
  name: '',
  goal: '',
  agentName: '',
  agentCompany: '',
  agentTone: '',
  maxFollowups: 3,
  followupDelayHours: 48,
  webSearchEnabled: true,
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } }
    case 'SET_CONTACTS':
      return { ...state, contacts: action.payload }
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, STEPS.length - 1) }
    case 'PREV':
      return { ...state, step: Math.max(state.step - 1, 0) }
    default:
      return state
  }
}

function canAdvance(step: number, config: WizardConfig, contacts: ContactRow[]) {
  switch (step) {
    case 0:
      return config.name.trim().length >= 3 && config.goal.trim().length >= 10
    case 1:
      return (
        config.agentName.trim().length >= 2 &&
        config.agentCompany.trim().length >= 2 &&
        config.agentTone !== ''
      )
    case 2:
      return true
    case 3:
      return contacts.length > 0
    default:
      return false
  }
}

export function WizardShell() {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    config: initialConfig,
    contacts: [],
  })
  const [submitting, setSubmitting] = useState(false)

  const { step, config, contacts } = state

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, contacts }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create campaign')
        return
      }
      toast.success('Campaign created!')
      router.push(`/campaigns/${json.id}`)
    } catch {
      toast.error('Unexpected error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const setConfig = (payload: Partial<WizardConfig>) =>
    dispatch({ type: 'SET_CONFIG', payload })
  const setContacts = (payload: ContactRow[]) =>
    dispatch({ type: 'SET_CONTACTS', payload })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          New Campaign
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                i <= step
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        {step === 0 && (
          <Step1_CampaignMeta config={config} onChange={setConfig} />
        )}
        {step === 1 && (
          <Step2_Persona config={config} onChange={setConfig} />
        )}
        {step === 2 && (
          <Step3_Sequence config={config} onChange={setConfig} />
        )}
        {step === 3 && (
          <Step4_Contacts contacts={contacts} onChange={setContacts} />
        )}
        {step === 4 && (
          <Step5_Review config={config} contacts={contacts} />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => dispatch({ type: 'PREV' })}
          disabled={step === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => dispatch({ type: 'NEXT' })}
            disabled={!canAdvance(step, config, contacts)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create Campaign'}
          </button>
        )}
      </div>
    </div>
  )
}
