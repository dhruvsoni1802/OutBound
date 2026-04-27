import { createClient } from '@/lib/supabase/server'
import { AgentMailConnect } from '@/components/settings/AgentMailConnect'

interface Integration {
  key_preview: string
  is_valid: boolean
  validated_at: string | null
}

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let integration: Integration | null = null

  if (user) {
    const { data } = await supabase
      .from('user_integrations')
      .select('key_preview, is_valid, validated_at')
      .eq('user_id', user.id)
      .eq('provider', 'agentmail')
      .maybeSingle()

    integration = data
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect external services your agent uses
        </p>
      </div>

      {/* Email Infrastructure */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Email Infrastructure
        </h2>
        <div className="space-y-3">
          <AgentMailConnect initialIntegration={integration} />
        </div>
      </section>

      {/* Coming soon placeholders */}
      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Coming Soon
        </h2>
        <div className="space-y-3">
          {['Anthropic API Key', 'Tavily Search'].map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-5 opacity-40"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Coming soon
                </p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                Soon
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
