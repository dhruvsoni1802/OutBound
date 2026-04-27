'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Unplug } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Integration {
  key_preview: string
  is_valid: boolean
  validated_at: string | null
}

interface ConnectResponse {
  success: boolean
  preview: string
  validated_at: string
}

interface ErrorResponse {
  error: string
}

interface AgentMailConnectProps {
  initialIntegration: Integration | null
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function AgentMailConnect({ initialIntegration }: AgentMailConnectProps) {
  const [integration, setIntegration] = useState<Integration | null>(
    initialIntegration
  )
  const [apiKey, setApiKey] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const isConnected = integration?.is_valid === true

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return

    setIsConnecting(true)
    try {
      const res = await fetch('/api/integrations/agentmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const data = (await res.json()) as ConnectResponse | ErrorResponse

      if (!res.ok) {
        toast.error('error' in data ? data.error : 'Something went wrong.')
        return
      }

      if ('success' in data && data.success) {
        setIntegration({
          key_preview: data.preview,
          is_valid: true,
          validated_at: data.validated_at,
        })
        setApiKey('')
        toast.success('AgentMail connected successfully.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/agentmail', {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = (await res.json()) as ErrorResponse
        toast.error(data.error ?? 'Failed to disconnect.')
        return
      }

      setIntegration(null)
      toast.success('AgentMail disconnected.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card px-6 py-5 transition-all duration-200',
        isConnected
          ? 'border-emerald-500/30'
          : 'border-border hover:border-primary/40',
        !isConnected &&
          'hover:shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_4px_24px_rgba(99,102,241,0.08)]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + info */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            >
              <path
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AgentMail</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isConnected
                ? `${integration!.key_preview} · Connected on ${formatDate(integration!.validated_at)}`
                : 'AI-native email infrastructure for your outreach agent'}
            </p>
          </div>
        </div>

        {/* Right: status badge or disconnect */}
        {isConnected && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </span>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              aria-label="Disconnect AgentMail"
              className="flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unplug className="h-3 w-3" />
              )}
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Connect form */}
      {!isConnected && (
        <form onSubmit={handleConnect} className="mt-5">
          <label
            htmlFor="agentmail-key"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            API Key
          </label>
          <div className="flex gap-2">
            <input
              id="agentmail-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="am-••••••••••••••••"
              autoComplete="off"
              spellCheck={false}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-shadow duration-150"
            />
            <button
              type="submit"
              disabled={isConnecting || !apiKey.trim()}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-[#818CF8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isConnecting ? 'Connecting…' : 'Connect AgentMail'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
