import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateCampaignPayloadSchema } from '@/lib/validation/campaign'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Require a valid AgentMail integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'agentmail')
    .eq('is_valid', true)
    .maybeSingle()

  if (!integration) {
    return NextResponse.json(
      { error: 'AgentMail integration required. Connect your API key in Settings.' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateCampaignPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: message }, { status: 422 })
  }

  const { config, contacts } = parsed.data

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
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
    })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    console.error('Campaign insert error:', campaignError)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  const contactRows = contacts.map((c) => ({
    campaign_id: campaign.id,
    user_id: user.id,
    first_name: c.firstName,
    last_name: c.lastName ?? null,
    email: c.email,
    company: c.company ?? null,
    role: c.role ?? null,
    context: c.context ?? null,
    status: 'pending' as const,
  }))

  const { error: contactsError } = await supabase
    .from('contacts')
    .insert(contactRows)

  if (contactsError) {
    console.error('Contacts insert error:', contactsError)
    // Roll back campaign
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    return NextResponse.json({ error: 'Failed to save contacts' }, { status: 500 })
  }

  return NextResponse.json({ id: campaign.id }, { status: 201 })
}
