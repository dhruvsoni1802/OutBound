import type { AgentTone, CampaignStatus, ContactStatus } from './campaign'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          key_preview: string
          encrypted_key: string
          is_valid: boolean
          validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          key_preview: string
          encrypted_key: string
          is_valid?: boolean
          validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          key_preview?: string
          encrypted_key?: string
          is_valid?: boolean
          validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          goal: string
          agent_name: string
          agent_company: string
          agent_tone: AgentTone
          max_followups?: number
          followup_delay_hours?: number
          web_search_enabled?: boolean
          status?: CampaignStatus
          emails_sent?: number
          emails_replied?: number
          conversions?: number
          config_snapshot: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          goal?: string
          agent_name?: string
          agent_company?: string
          agent_tone?: AgentTone
          max_followups?: number
          followup_delay_hours?: number
          web_search_enabled?: boolean
          status?: CampaignStatus
          emails_sent?: number
          emails_replied?: number
          conversions?: number
          config_snapshot?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
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
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          first_name: string
          last_name?: string | null
          email: string
          company?: string | null
          role?: string | null
          context?: string | null
          agentmail_thread_id?: string | null
          langgraph_thread_id?: string | null
          status?: ContactStatus
          followup_count?: number
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          first_name?: string
          last_name?: string | null
          email?: string
          company?: string | null
          role?: string | null
          context?: string | null
          agentmail_thread_id?: string | null
          langgraph_thread_id?: string | null
          status?: ContactStatus
          followup_count?: number
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
