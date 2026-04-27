'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CampaignStatus } from '@/types/campaign'

interface Props {
  campaignId: string
  initialStatus: CampaignStatus
}

export function ActivateCampaignButton({ campaignId, initialStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(initialStatus)

  if (status !== 'draft') return null

  async function activate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to activate campaign')
        return
      }
      setStatus('active')
      toast.success(
        'Campaign activated — your agent is now reaching out to contacts'
      )
      router.refresh()
    } catch {
      toast.error('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={activate}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {loading ? 'Activating…' : 'Activate Campaign'}
    </button>
  )
}
