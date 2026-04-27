import { createClient } from '@/lib/supabase/server'
import type { Campaign, Contact } from '@/types/campaign'

export interface CampaignListItem extends Campaign {
  // No extra fields for now; extended here to allow future projection differences
}

export interface CampaignDetail {
  campaign: Campaign
  contacts: Contact[]
}

export interface CampaignListStats {
  totalSent: number
  totalReplied: number
  totalConversions: number
  overallReplyRate: number
}

/** Fetches all campaigns for a user, sorted newest first. */
export async function listUserCampaigns(userId: string): Promise<CampaignListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as CampaignListItem[]
}

/** Computes aggregate stats across a list of campaigns. */
export function computeCampaignListStats(campaigns: CampaignListItem[]): CampaignListStats {
  const totalSent = campaigns.reduce((s, c) => s + c.emails_sent, 0)
  const totalReplied = campaigns.reduce((s, c) => s + c.emails_replied, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const overallReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0
  return { totalSent, totalReplied, totalConversions, overallReplyRate }
}

/**
 * Fetches a single campaign + all its contacts.
 * Returns null when the campaign doesn't exist or doesn't belong to the user.
 */
export async function getCampaignDetail(
  campaignId: string,
  userId: string
): Promise<CampaignDetail | null> {
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single()

  if (!campaign) return null

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  return {
    campaign: campaign as Campaign,
    contacts: (contacts ?? []) as Contact[],
  }
}
