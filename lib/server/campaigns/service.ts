import { createClient } from '@/lib/supabase/server'
import {
  uploadCampaignAttachment,
  recordAttachmentMetadata,
  type AttachmentInput,
} from '@/lib/server/storage/attachments'
import type { CreateCampaignPayloadV2 } from '@/lib/validation/campaign'

export interface CreateCampaignResult {
  id: string
  contactsCreated: number
}

/**
 * Creates a campaign, bulk-inserts contacts, and uploads any attachments.
 * Rolls back the campaign row if contact insertion fails.
 */
export async function createCampaign(
  userId: string,
  payload: CreateCampaignPayloadV2
): Promise<CreateCampaignResult> {
  const supabase = await createClient()
  const { config, contacts, campaign_type, context_fields, attachments } = payload

  // 1. Insert campaign row
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: config.name,
      goal: config.goal,
      agent_name: config.agentName,
      agent_company: config.agentCompany,
      agent_tone: config.agentTone,
      max_followups: config.maxFollowups,
      followup_delay_hours: config.followupDelayHours,
      web_search_enabled: config.webSearchEnabled,
      status: 'draft',
      config_snapshot: config as Record<string, unknown>,
      campaign_type: campaign_type ?? 'custom',
      context_fields: (context_fields ?? {}) as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    throw Object.assign(new Error('Failed to create campaign'), { status: 500 })
  }

  // 2. Bulk-insert contacts (roll back campaign on failure)
  const contactRows = contacts.map((c) => ({
    campaign_id: campaign.id,
    user_id: userId,
    first_name: c.firstName,
    last_name: c.lastName ?? null,
    email: c.email,
    company: c.company ?? null,
    role: c.role ?? null,
    context: c.context ?? null,
    status: 'pending' as const,
  }))

  const { error: contactsError } = await supabase.from('contacts').insert(contactRows)

  if (contactsError) {
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    if (contactsError.code === '23505') {
      throw Object.assign(
        new Error('Duplicate email addresses found in contact list'),
        { status: 409 }
      )
    }
    throw Object.assign(new Error('Failed to save contacts'), { status: 500 })
  }

  // 3. Upload attachments (non-fatal — log errors, don't abort)
  for (const attachment of attachments ?? []) {
    try {
      const stored = await uploadCampaignAttachment(campaign.id, attachment as AttachmentInput)
      await recordAttachmentMetadata(campaign.id, userId, stored)
    } catch (err) {
      console.error('Attachment upload failed:', err)
    }
  }

  return { id: campaign.id, contactsCreated: contactRows.length }
}
