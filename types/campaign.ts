export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export type AgentTone = 'professional' | 'friendly' | 'direct' | 'consultative'

export type CampaignType =
  | 'recruitment_outreach'
  | 'sales_outreach'
  | 'investor_outreach'
  | 'partnership_outreach'
  | 'custom'

export type ContactStatus =
  | 'pending'
  | 'contacted'
  | 'replied'
  | 'converted'
  | 'opted_out'
  | 'bounced'
  | 'declined'

export interface Campaign {
  id: string
  user_id: string
  name: string
  goal: string
  agent_name: string
  agent_company: string
  agent_tone: AgentTone
  max_followups: number
  followup_delay_hours: number
  web_search_enabled: boolean
  status: CampaignStatus
  emails_sent: number
  emails_replied: number
  conversions: number
  config_snapshot: Record<string, unknown>
  // Phase 3 additions (migration 005)
  inbox_id: string | null
  webhook_id: string | null
  // Phase 3.5 additions (migration 006)
  campaign_type: CampaignType
  context_fields: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  campaign_id: string
  user_id: string
  first_name: string
  last_name: string | null
  email: string
  company: string | null
  role: string | null
  context: string | null
  agentmail_thread_id: string | null
  langgraph_thread_id: string | null
  status: ContactStatus
  followup_count: number
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface CampaignAttachment {
  id: string
  campaign_id: string
  user_id: string
  filename: string
  storage_key: string
  content_type: string
  size_bytes: number
  created_at: string
}
