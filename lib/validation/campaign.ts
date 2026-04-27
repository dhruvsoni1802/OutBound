import { z } from 'zod'

export const AgentToneEnum = z.enum([
  'professional',
  'friendly',
  'direct',
  'consultative',
])

export const CampaignConfigSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Campaign name must be at least 3 characters' })
    .max(80, { message: 'Campaign name must be under 80 characters' }),
  goal: z
    .string()
    .min(10, { message: 'Please describe your goal in at least 10 characters' })
    .max(500, { message: 'Goal description must be under 500 characters' }),

  agentName: z
    .string()
    .min(2, { message: 'Agent name must be at least 2 characters' })
    .max(50),
  agentCompany: z
    .string()
    .min(2, { message: 'Company name must be at least 2 characters' })
    .max(100),
  agentTone: AgentToneEnum,

  maxFollowups: z
    .number()
    .int()
    .min(1, { message: 'At least 1 follow-up is required' })
    .max(10, { message: 'Maximum 10 follow-ups allowed' }),
  followupDelayHours: z
    .number()
    .int()
    .min(1, { message: 'Delay must be at least 1 hour' })
    .max(168, { message: 'Delay cannot exceed 7 days (168 hours)' }),
  webSearchEnabled: z.boolean(),
})

export const ContactRowSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().optional(),
  email: z.string().email({ message: 'Invalid email address' }),
  company: z.string().optional(),
  role: z.string().optional(),
  context: z.string().optional(),
})

export const CreateCampaignPayloadSchema = z.object({
  config: CampaignConfigSchema,
  contacts: z
    .array(ContactRowSchema)
    .min(1, { message: 'At least one contact is required' })
    .max(1000, { message: 'Maximum 1000 contacts per campaign' }),
})

// ── Phase 3.5 additions ────────────────────────────────────────────────────

export const CampaignTypeEnum = z.enum([
  'recruitment_outreach',
  'sales_outreach',
  'investor_outreach',
  'partnership_outreach',
  'custom',
])

export const RecruitmentContextSchema = z.object({
  current_role: z.string().min(2, 'Required'),
  degree: z.string().min(2, 'Required'),
  skills: z.array(z.string().min(1)).min(1, 'Add at least one skill'),
  notable_projects: z.string().optional(),
  linkedin_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  resume_attached: z.boolean().default(false),
})

export const SalesContextSchema = z.object({
  product_name: z.string().min(2, 'Required'),
  product_description: z.string().min(10, 'Required'),
  key_benefits: z.array(z.string().min(1)).min(1, 'Add at least one benefit'),
  social_proof: z.string().optional(),
  pricing_hint: z.string().optional(),
  target_role: z.string().min(2, 'Required'),
  pain_point: z.string().min(10, 'Required'),
})

export const InvestorContextSchema = z.object({
  company_description: z.string().min(10, 'Required'),
  stage: z.string().min(2, 'Required'),
  traction: z.string().min(5, 'Required'),
  round_details: z.string().optional(),
  deck_attached: z.boolean().default(false),
})

export const PartnershipContextSchema = z.object({
  value_offered: z.string().min(10, 'Required'),
  value_sought: z.string().min(10, 'Required'),
  audience_overlap: z.string().optional(),
  partnership_example: z.string().optional(),
})

export const CustomContextSchema = z.object({
  custom_system_prompt: z
    .string()
    .min(20, 'Please write at least 20 characters')
    .max(2000, 'Maximum 2000 characters'),
})

export const AttachmentPayloadSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  data: z.string(), // base64
})

export const CreateCampaignPayloadV2Schema = CreateCampaignPayloadSchema.extend({
  campaign_type: CampaignTypeEnum,
  context_fields: z.record(z.string(), z.unknown()),
  attachments: z.array(AttachmentPayloadSchema).optional().default([]),
})

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>
export type ContactRow = z.infer<typeof ContactRowSchema>
export type CreateCampaignPayload = z.infer<typeof CreateCampaignPayloadSchema>
export type CampaignType = z.infer<typeof CampaignTypeEnum>
export type RecruitmentContext = z.infer<typeof RecruitmentContextSchema>
export type SalesContext = z.infer<typeof SalesContextSchema>
export type InvestorContext = z.infer<typeof InvestorContextSchema>
export type PartnershipContext = z.infer<typeof PartnershipContextSchema>
export type CustomContext = z.infer<typeof CustomContextSchema>
export type AttachmentPayload = z.infer<typeof AttachmentPayloadSchema>
export type CreateCampaignPayloadV2 = z.infer<typeof CreateCampaignPayloadV2Schema>
