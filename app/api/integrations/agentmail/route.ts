import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import {
  connectAgentMail,
  disconnectAgentMail,
} from '@/lib/server/integrations/agentmail'

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

  const { apiKey } = body
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  try {
    const result = await connectAgentMail(user.id, apiKey.trim())
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const e = err as Error & { status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await disconnectAgentMail(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const e = err as Error
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
