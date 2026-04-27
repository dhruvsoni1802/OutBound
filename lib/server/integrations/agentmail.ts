import { createClient } from '@/lib/supabase/server'
import { encrypt, keyPreview } from '@/lib/server/security/encryption'

/** Makes a test call to AgentMail to verify the provided key is valid. */
export async function validateAgentMailKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  } catch {
    return false
  }
}

export interface ConnectResult {
  preview: string
  validated_at: string
}

/**
 * Validates the key, encrypts it, and upserts the user_integrations row.
 * Throws if the key is invalid or if a DB error occurs.
 */
export async function connectAgentMail(
  userId: string,
  apiKey: string
): Promise<ConnectResult> {
  const valid = await validateAgentMailKey(apiKey)
  if (!valid) {
    const err = new Error('Invalid API key. Please check and try again.')
    ;(err as Error & { status: number }).status = 422
    throw err
  }

  const encryptedKey = encrypt(apiKey)
  const preview = keyPreview(apiKey)
  const validated_at = new Date().toISOString()

  const supabase = await createClient()
  const { error } = await supabase.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: 'agentmail',
      key_preview: preview,
      encrypted_key: encryptedKey,
      is_valid: true,
      validated_at,
      updated_at: validated_at,
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) throw new Error('Failed to save integration.')

  return { preview, validated_at }
}

/** Removes the AgentMail integration row for a user. */
export async function disconnectAgentMail(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'agentmail')

  if (error) throw new Error('Failed to disconnect.')
}

/** Returns the integration row if the user has a valid AgentMail key connected. */
export async function getValidAgentMailIntegration(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_integrations')
    .select('id, key_preview, validated_at')
    .eq('user_id', userId)
    .eq('provider', 'agentmail')
    .eq('is_valid', true)
    .maybeSingle()
  return data
}
