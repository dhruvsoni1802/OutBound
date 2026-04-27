'use client'

import { useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import type { AgentTone } from '@/types/campaign'
import type { ContactRow, CampaignType } from '@/lib/validation/campaign'
import { getCampaignTypeConfig } from '@/lib/campaignTypes/registry'
import { Step1_CampaignMeta } from './Step1_CampaignMeta'
import { Step1b_CampaignType } from './Step1b_CampaignType'
import { Step2_Persona } from './Step2_Persona'
import { Step2b_CampaignContext } from './Step2b_CampaignContext'
import { Step3_Sequence } from './Step3_Sequence'
import { Step4_Attachments } from './Step4_Attachments'
import { Step4_Contacts } from './Step4_Contacts'
import { Step6_Review } from './Step6_Review'

const STEPS = [
  'Campaign Info',
  'Campaign Type',
  'Agent Persona',
  'Campaign Context',
  'Sequence',
  'Attachments',
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
  campaignType: CampaignType | null
  contextFields: Record<string, unknown>
  attachments: File[]
}

type WizardAction =
  | { type: 'SET_CONFIG'; payload: Partial<WizardConfig> }
  | { type: 'SET_CONTACTS'; payload: ContactRow[] }
  | { type: 'SET_CAMPAIGN_TYPE'; payload: CampaignType }
  | { type: 'SET_CONTEXT_FIELDS'; payload: Record<string, unknown> }
  | { type: 'SET_ATTACHMENTS'; payload: File[] }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SKIP_TO'; payload: number }

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
    case 'SET_CAMPAIGN_TYPE':
      return { ...state, campaignType: action.payload, contextFields: {} }
    case 'SET_CONTEXT_FIELDS':
      return {
        ...state,
        contextFields: { ...state.contextFields, ...action.payload },
      }
    case 'SET_ATTACHMENTS':
      return { ...state, attachments: action.payload }
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, STEPS.length - 1) }
    case 'PREV':
      return { ...state, step: Math.max(state.step - 1, 0) }
    case 'SKIP_TO':
      return { ...state, step: action.payload }
    default:
      return state
  }
}

function isContextValid(
  type: CampaignType | null,
  fields: Record<string, unknown>
): boolean {
  if (!type) return false
  return getCampaignTypeConfig(type)?.validateContext(fields) ?? false
}

function canAdvance(state: WizardState): boolean {
  const { step, config, contacts, campaignType, contextFields } = state
  switch (step) {
    case 0:
      return config.name.trim().length >= 3 && config.goal.trim().length >= 10
    case 1:
      return campaignType !== null
    case 2:
      return (
        config.agentName.trim().length >= 2 &&
        config.agentCompany.trim().length >= 2 &&
        config.agentTone !== ''
      )
    case 3:
      return isContextValid(campaignType, contextFields)
    case 4:
      return true
    case 5:
      return true
    case 6:
      return contacts.length > 0
    default:
      return false
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function WizardShell() {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    config: initialConfig,
    contacts: [],
    campaignType: null,
    contextFields: {},
    attachments: [],
  })
  const [submitting, setSubmitting] = useState(false)

  const { step, config, contacts, campaignType, contextFields, attachments } = state

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const attachmentPayloads = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          contentType: file.type,
          data: await fileToBase64(file),
        }))
      )
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          contacts,
          campaign_type: campaignType ?? 'custom',
          context_fields: contextFields,
          attachments: attachmentPayloads,
        }),
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

  const isLastStep = step === STEPS.length - 1
  const advance = canAdvance(state)

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
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  i < step
                    ? 'var(--color-primary)'
                    : i === step
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                opacity: i < step ? 1 : i === step ? 1 : 0.4,
              }}
            />
            {i < step && (
              <Check
                className="mx-0.5 h-3 w-3 shrink-0 text-primary"
                strokeWidth={3}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        {step === 0 && (
          <Step1_CampaignMeta config={config} onChange={(p) => dispatch({ type: 'SET_CONFIG', payload: p })} />
        )}
        {step === 1 && (
          <Step1b_CampaignType
            value={campaignType}
            onChange={(t) => dispatch({ type: 'SET_CAMPAIGN_TYPE', payload: t })}
          />
        )}
        {step === 2 && (
          <Step2_Persona config={config} onChange={(p) => dispatch({ type: 'SET_CONFIG', payload: p })} />
        )}
        {step === 3 && campaignType && (
          <Step2b_CampaignContext
            campaignType={campaignType}
            value={contextFields}
            onChange={(p) => dispatch({ type: 'SET_CONTEXT_FIELDS', payload: p })}
          />
        )}
        {step === 4 && (
          <Step3_Sequence config={config} onChange={(p) => dispatch({ type: 'SET_CONFIG', payload: p })} />
        )}
        {step === 5 && campaignType && (
          <Step4_Attachments
            campaignType={campaignType}
            contextFields={contextFields}
            files={attachments}
            onChange={(f) => dispatch({ type: 'SET_ATTACHMENTS', payload: f })}
            onSkip={() => dispatch({ type: 'SKIP_TO', payload: 6 })}
          />
        )}
        {step === 6 && (
          <Step4_Contacts
            contacts={contacts}
            onChange={(c) => dispatch({ type: 'SET_CONTACTS', payload: c })}
          />
        )}
        {step === 7 && (
          <Step6_Review
            config={config}
            contacts={contacts}
            campaignType={campaignType}
            contextFields={contextFields}
            attachmentCount={attachments.length}
          />
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

        {!isLastStep ? (
          <button
            onClick={() => dispatch({ type: 'NEXT' })}
            disabled={!advance}
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
