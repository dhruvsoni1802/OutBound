import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1)

      const destination =
        campaigns && campaigns.length > 0
          ? '/campaigns'
          : '/settings/integrations'

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
