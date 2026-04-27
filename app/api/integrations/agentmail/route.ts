import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function encrypt(plaintext: string): string {
  const rawKey = process.env.ENCRYPTION_KEY
  if (!rawKey) throw new Error('ENCRYPTION_KEY is not set')

  const key = Buffer.from(rawKey, 'base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Layout: iv (12 bytes) | authTag (16 bytes) | ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

async function validateAgentMailKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.status === 200
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { apiKey?: unknown }
  try {
    body = (await request.json()) as { apiKey?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = body.apiKey
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const trimmedKey = apiKey.trim()

  const isValid = await validateAgentMailKey(trimmedKey)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid API key. Please check and try again.' },
      { status: 422 }
    )
  }

  let encryptedKey: string
  try {
    encryptedKey = encrypt(trimmedKey)
  } catch {
    return NextResponse.json(
      { error: 'Server configuration error. Contact support.' },
      { status: 500 }
    )
  }

  const keyPreview = `am-****${trimmedKey.slice(-4)}`
  const validatedAt = new Date().toISOString()

  const { error } = await supabase.from('user_integrations').upsert(
    {
      user_id: user.id,
      provider: 'agentmail',
      key_preview: keyPreview,
      encrypted_key: encryptedKey,
      is_valid: true,
      validated_at: validatedAt,
      updated_at: validatedAt,
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) {
    return NextResponse.json({ error: 'Failed to save integration.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    preview: keyPreview,
    validated_at: validatedAt,
  })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'agentmail')

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
