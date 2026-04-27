import type { CampaignType } from '@/lib/validation/campaign'

export interface CampaignTypeConfig {
  type: CampaignType
  label: string
  description: string
  /** Lucide icon name — UI layer maps this to the actual import. */
  iconName: string
  /** Client-side validation for wizard's "Continue" button on the Context step. */
  validateContext: (fields: Record<string, unknown>) => boolean
  /** Whether this type typically expects a file attachment (affects Step 4 heading). */
  expectsAttachment: (fields: Record<string, unknown>) => boolean
}

function str(fields: Record<string, unknown>, key: string): boolean {
  return typeof fields[key] === 'string' && (fields[key] as string).trim().length > 0
}

function arr(fields: Record<string, unknown>, key: string): boolean {
  return Array.isArray(fields[key]) && (fields[key] as unknown[]).length > 0
}

const REGISTRY: CampaignTypeConfig[] = [
  {
    type: 'recruitment_outreach',
    label: 'Job Application Outreach',
    description: 'Contact recruiters and hiring managers for open roles',
    iconName: 'UserSearch',
    validateContext: (f) => str(f, 'current_role') && str(f, 'degree') && arr(f, 'skills'),
    expectsAttachment: (f) => f.resume_attached === true,
  },
  {
    type: 'sales_outreach',
    label: 'Sales & Lead Generation',
    description: 'Reach potential customers with your product or service',
    iconName: 'TrendingUp',
    validateContext: (f) =>
      str(f, 'product_name') &&
      str(f, 'product_description') &&
      arr(f, 'key_benefits') &&
      str(f, 'target_role') &&
      str(f, 'pain_point'),
    expectsAttachment: () => false,
  },
  {
    type: 'investor_outreach',
    label: 'Investor Outreach',
    description: 'Connect with VCs and angels for fundraising',
    iconName: 'DollarSign',
    validateContext: (f) =>
      str(f, 'company_description') && str(f, 'stage') && str(f, 'traction'),
    expectsAttachment: (f) => f.deck_attached === true,
  },
  {
    type: 'partnership_outreach',
    label: 'Partnership Development',
    description: 'Find co-marketing and integration partners',
    iconName: 'Handshake',
    validateContext: (f) => str(f, 'value_offered') && str(f, 'value_sought'),
    expectsAttachment: () => false,
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Write your own system prompt from scratch',
    iconName: 'Settings2',
    validateContext: (f) =>
      typeof f.custom_system_prompt === 'string' &&
      (f.custom_system_prompt as string).trim().length >= 20,
    expectsAttachment: () => false,
  },
]

/** Returns all registered campaign type configs in display order. */
export function getAllCampaignTypes(): CampaignTypeConfig[] {
  return REGISTRY
}

/** Returns the config for a specific type, or undefined if unregistered. */
export function getCampaignTypeConfig(type: CampaignType): CampaignTypeConfig | undefined {
  return REGISTRY.find((c) => c.type === type)
}
