import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft campaigns can be activated' },
      { status: 409 }
    )
  }

  const agentServiceUrl = process.env.AGENT_SERVICE_URL
  if (!agentServiceUrl) {
    return NextResponse.json(
      { error: 'Agent service not configured' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${agentServiceUrl}/campaigns/${id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': process.env.AGENT_SERVICE_SECRET ?? '',
      },
      body: JSON.stringify({ user_id: user.id }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Agent service error' },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Could not reach agent service' },
      { status: 502 }
    )
  }
}
