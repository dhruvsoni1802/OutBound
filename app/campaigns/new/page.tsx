import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WizardShell } from '@/components/campaigns/wizard/WizardShell'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'agentmail')
    .eq('is_valid', true)
    .maybeSingle()

  if (!integration) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Connect AgentMail first
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          A valid AgentMail API key is required before you can create a campaign.
        </p>
        <Link
          href="/settings/integrations"
          className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90"
        >
          Go to Integrations
        </Link>
      </div>
    )
  }

  return <WizardShell />
}
