import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ContactStatus } from '@/types/campaign'

const TERMINAL: ContactStatus[] = ['converted', 'opted_out', 'bounced', 'declined']

export async function GET(
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
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  const list = contacts ?? []

  const summary = {
    total: list.length,
    pending: list.filter((c) => c.status === 'pending').length,
    contacted: list.filter((c) => c.status === 'contacted').length,
    replied: list.filter((c) => c.status === 'replied').length,
    converted: list.filter((c) => c.status === 'converted').length,
    terminal: list.filter((c) => TERMINAL.includes(c.status as ContactStatus)).length,
  }

  return NextResponse.json({ contacts: list, summary })
}
