import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateCampaignPayloadV2Schema } from '@/lib/validation/campaign'
import { getValidAgentMailIntegration } from '@/lib/server/integrations/agentmail'
import { createCampaign } from '@/lib/server/campaigns/service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const integration = await getValidAgentMailIntegration(user.id)
  if (!integration) {
    return NextResponse.json(
      {
        error:
          'Please connect your AgentMail account before creating a campaign',
      },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateCampaignPayloadV2Schema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: message }, { status: 422 })
  }

  try {
    const result = await createCampaign(user.id, parsed.data)
    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.status === 409) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    console.error('Campaign creation error:', e)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
