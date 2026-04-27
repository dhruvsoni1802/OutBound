import { createClient } from '@/lib/supabase/server'

const BUCKET = 'campaign-attachments'

export interface AttachmentInput {
  filename: string
  contentType: string
  /** base64-encoded file data */
  data: string
}

export interface StoredAttachment {
  storageKey: string
  filename: string
  contentType: string
  sizeBytes: number
}

/** Uploads a base64 attachment to Supabase Storage and returns the storage key + metadata. */
export async function uploadCampaignAttachment(
  campaignId: string,
  attachment: AttachmentInput
): Promise<StoredAttachment> {
  const buffer = Buffer.from(attachment.data, 'base64')
  const storageKey = `${campaignId}/${attachment.filename}`

  const supabase = await createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { contentType: attachment.contentType })

  if (error) throw new Error(`Failed to upload ${attachment.filename}: ${error.message}`)

  return {
    storageKey,
    filename: attachment.filename,
    contentType: attachment.contentType,
    sizeBytes: buffer.length,
  }
}

/** Persists attachment metadata to the campaign_attachments table after a successful upload. */
export async function recordAttachmentMetadata(
  campaignId: string,
  userId: string,
  stored: StoredAttachment
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('campaign_attachments').insert({
    campaign_id: campaignId,
    user_id: userId,
    filename: stored.filename,
    storage_key: stored.storageKey,
    content_type: stored.contentType,
    size_bytes: stored.sizeBytes,
  })
  if (error) throw new Error(`Failed to record attachment metadata: ${error.message}`)
}
