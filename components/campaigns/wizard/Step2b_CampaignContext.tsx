'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignType } from '@/lib/validation/campaign'

interface Props {
  campaignType: CampaignType
  value: Record<string, unknown>
  onChange: (fields: Record<string, unknown>) => void
}

export function Step2b_CampaignContext({ campaignType, value, onChange }: Props) {
  function patch(partial: Record<string, unknown>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Campaign Context
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These details shape the agent&apos;s knowledge and how it presents
          you.
        </p>
      </div>

      {campaignType === 'recruitment_outreach' && (
        <RecruitmentFields value={value} onChange={patch} />
      )}
      {campaignType === 'sales_outreach' && (
        <SalesFields value={value} onChange={patch} />
      )}
      {campaignType === 'investor_outreach' && (
        <InvestorFields value={value} onChange={patch} />
      )}
      {campaignType === 'partnership_outreach' && (
        <PartnershipFields value={value} onChange={patch} />
      )}
      {campaignType === 'custom' && (
        <CustomFields value={value} onChange={patch} />
      )}
    </div>
  )
}

// ── Shared field primitives ────────────────────────────────────────────────

function Field({
  label,
  helper,
  required,
  children,
}: {
  label: string
  helper?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
      {helper && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  )
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function addTag() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="ml-0.5 rounded-full hover:text-primary/60"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
        }}
        onBlur={addTag}
        placeholder={placeholder ?? 'Type and press Enter to add'}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )
}

// ── Context field sets per campaign type ──────────────────────────────────

function RecruitmentFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const str = (k: string) => (typeof value[k] === 'string' ? (value[k] as string) : '')
  const arr = (k: string) =>
    Array.isArray(value[k]) ? (value[k] as string[]) : []
  const bool = (k: string) => typeof value[k] === 'boolean' ? value[k] as boolean : false

  return (
    <div className="space-y-4">
      <Field label="Current / most recent role" required>
        <TextInput
          value={str('current_role')}
          onChange={(v) => onChange({ current_role: v })}
          placeholder="Senior Software Engineer at Acme Corp"
        />
      </Field>
      <Field label="Degree & university" required>
        <TextInput
          value={str('degree')}
          onChange={(v) => onChange({ degree: v })}
          placeholder="B.S. Computer Science, Stanford"
        />
      </Field>
      <Field
        label="Core skills"
        helper="Press Enter or comma to add each skill. At least one required."
        required
      >
        <TagInput
          value={arr('skills')}
          onChange={(v) => onChange({ skills: v })}
          placeholder="e.g. React, TypeScript, Node.js"
        />
      </Field>
      <Field label="Notable projects" helper="Optional">
        <TextArea
          value={str('notable_projects')}
          onChange={(v) => onChange({ notable_projects: v })}
          placeholder="Built X which achieved Y outcome..."
        />
      </Field>
      <Field label="LinkedIn URL" helper="Optional">
        <TextInput
          value={str('linkedin_url')}
          onChange={(v) => onChange({ linkedin_url: v })}
          placeholder="https://linkedin.com/in/yourname"
          type="url"
        />
      </Field>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={bool('resume_attached')}
          onChange={(e) => onChange({ resume_attached: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">
          I&apos;ll attach my resume
          <span className="ml-1.5 text-xs text-muted-foreground">
            (you&apos;ll upload it in the next step)
          </span>
        </span>
      </label>
    </div>
  )
}

function SalesFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const str = (k: string) => (typeof value[k] === 'string' ? (value[k] as string) : '')
  const arr = (k: string) =>
    Array.isArray(value[k]) ? (value[k] as string[]) : []

  return (
    <div className="space-y-4">
      <Field label="Product / service name" required>
        <TextInput
          value={str('product_name')}
          onChange={(v) => onChange({ product_name: v })}
          placeholder="Embra"
        />
      </Field>
      <Field label="What it does" required>
        <TextArea
          value={str('product_description')}
          onChange={(v) => onChange({ product_description: v })}
          placeholder="Embra automates personalised email outreach using AI agents..."
          rows={2}
        />
      </Field>
      <Field
        label="Key benefits"
        helper="Press Enter to add each benefit. At least one required."
        required
      >
        <TagInput
          value={arr('key_benefits')}
          onChange={(v) => onChange({ key_benefits: v })}
          placeholder="e.g. Saves 10 hours per week"
        />
      </Field>
      <Field label="Target recipient role" required>
        <TextInput
          value={str('target_role')}
          onChange={(v) => onChange({ target_role: v })}
          placeholder="Head of Growth"
        />
      </Field>
      <Field label="Pain point being solved" required>
        <TextArea
          value={str('pain_point')}
          onChange={(v) => onChange({ pain_point: v })}
          placeholder="Teams spend hours manually writing personalised outreach emails..."
          rows={2}
        />
      </Field>
      <Field label="Social proof" helper="Optional">
        <TextInput
          value={str('social_proof')}
          onChange={(v) => onChange({ social_proof: v })}
          placeholder="Used by 200+ growth teams"
        />
      </Field>
      <Field label="Pricing hint" helper="Optional — used sparingly">
        <TextInput
          value={str('pricing_hint')}
          onChange={(v) => onChange({ pricing_hint: v })}
          placeholder="From $99/mo"
        />
      </Field>
    </div>
  )
}

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B+']

function InvestorFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const str = (k: string) => (typeof value[k] === 'string' ? (value[k] as string) : '')
  const bool = (k: string) => typeof value[k] === 'boolean' ? value[k] as boolean : false

  return (
    <div className="space-y-4">
      <Field label="What your company does" required>
        <TextArea
          value={str('company_description')}
          onChange={(v) => onChange({ company_description: v })}
          placeholder="We build autonomous AI agents that handle email outreach..."
        />
      </Field>
      <Field label="Stage" required>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ stage: s })}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors duration-150',
                str('stage') === s
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label="Traction"
        helper="Key metrics that prove momentum"
        required
      >
        <TextArea
          value={str('traction')}
          onChange={(v) => onChange({ traction: v })}
          placeholder="$50k MRR, 3x YoY growth, 200 paying customers"
          rows={2}
        />
      </Field>
      <Field label="Round details" helper="Optional">
        <TextInput
          value={str('round_details')}
          onChange={(v) => onChange({ round_details: v })}
          placeholder="Raising $2M SAFE at $10M cap"
        />
      </Field>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={bool('deck_attached')}
          onChange={(e) => onChange({ deck_attached: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">
          I&apos;ll attach my pitch deck
          <span className="ml-1.5 text-xs text-muted-foreground">
            (you&apos;ll upload it in the next step)
          </span>
        </span>
      </label>
    </div>
  )
}

function PartnershipFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const str = (k: string) => (typeof value[k] === 'string' ? (value[k] as string) : '')

  return (
    <div className="space-y-4">
      <Field label="What you bring to the partnership" required>
        <TextArea
          value={str('value_offered')}
          onChange={(v) => onChange({ value_offered: v })}
          placeholder="We bring an engaged audience of 50k+ developers..."
        />
      </Field>
      <Field label="What you are looking for" required>
        <TextArea
          value={str('value_sought')}
          onChange={(v) => onChange({ value_sought: v })}
          placeholder="Co-marketing opportunities and integration partners..."
        />
      </Field>
      <Field label="Shared audience or overlap" helper="Optional">
        <TextInput
          value={str('audience_overlap')}
          onChange={(v) => onChange({ audience_overlap: v })}
          placeholder="B2B SaaS growth teams"
        />
      </Field>
      <Field label="Example partnership structure" helper="Optional">
        <TextArea
          value={str('partnership_example')}
          onChange={(v) => onChange({ partnership_example: v })}
          placeholder="Joint webinar, shared newsletter feature, integration in each other's apps..."
          rows={2}
        />
      </Field>
    </div>
  )
}

function CustomFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const prompt =
    typeof value.custom_system_prompt === 'string'
      ? value.custom_system_prompt
      : ''
  const MAX = 2000

  return (
    <div className="space-y-4">
      <Field
        label="System prompt"
        helper="This text becomes the AI agent's complete instruction set. Be specific about tone, goals, and how to handle replies."
        required
      >
        <textarea
          value={prompt}
          onChange={(e) =>
            e.target.value.length <= MAX &&
            onChange({ custom_system_prompt: e.target.value })
          }
          placeholder="You are Alex, an outreach specialist at Acme Inc. Your goal is..."
          rows={10}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <p
          className={cn(
            'text-right text-xs',
            prompt.length > MAX * 0.9
              ? 'text-amber-400'
              : 'text-muted-foreground'
          )}
        >
          {prompt.length}/{MAX}
        </p>
      </Field>
    </div>
  )
}
