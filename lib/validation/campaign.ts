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

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>
export type ContactRow = z.infer<typeof ContactRowSchema>
export type CreateCampaignPayload = z.infer<typeof CreateCampaignPayloadSchema>
