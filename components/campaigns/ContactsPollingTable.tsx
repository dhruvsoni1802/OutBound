'use client'

import { useEffect, useRef, useState } from 'react'
import type { Contact, CampaignStatus, ContactStatus } from '@/types/campaign'

const STATUS_LABELS: Record<ContactStatus, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  replied: 'Replied',
  converted: 'Converted',
  opted_out: 'Opted out',
  bounced: 'Bounced',
  declined: 'Declined',
}

const STATUS_CLASSES: Record<ContactStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  contacted: 'bg-blue-500/15 text-blue-400',
  replied: 'bg-amber-500/15 text-amber-400',
  converted: 'bg-emerald-500/15 text-emerald-400',
  opted_out: 'bg-rose-500/15 text-rose-400',
  bounced: 'bg-rose-500/15 text-rose-400',
  declined: 'bg-muted text-muted-foreground/60',
}

const TERMINAL: ContactStatus[] = ['converted', 'opted_out', 'bounced', 'declined']

interface Props {
  campaignId: string
  campaignStatus: CampaignStatus
  initialContacts: Contact[]
}

export function ContactsPollingTable({
  campaignId,
  campaignStatus,
  initialContacts,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allTerminal =
    contacts.length > 0 &&
    contacts.every((c) => TERMINAL.includes(c.status as ContactStatus))

  useEffect(() => {
    if (campaignStatus !== 'active' || allTerminal) return

    async function poll() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/contacts`)
        if (!res.ok) return
        const data = await res.json()
        setContacts(data.contacts ?? [])
      } catch {
        // silently ignore transient errors
      }
    }

    intervalRef.current = setInterval(poll, 15_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [campaignId, campaignStatus, allTerminal])

  if (contacts.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        No contacts attached to this campaign.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['Name', 'Email', 'Company', 'Role', 'Status'].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              className="border-b border-border last:border-0 hover:bg-accent/30"
            >
              <td className="px-4 py-2.5 text-foreground">
                {contact.first_name}
                {contact.last_name ? ` ${contact.last_name}` : ''}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {contact.email}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {contact.company ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {contact.role ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASSES[contact.status as ContactStatus] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {STATUS_LABELS[contact.status as ContactStatus] ?? contact.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
