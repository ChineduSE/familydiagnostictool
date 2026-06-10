'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/admin-format'
import { recipientCountFor, type AudienceCounts, type BroadcastAudience } from '@/lib/audience'
import { BroadcastStatusBadge } from './BroadcastStatusBadge'
import type { Broadcast } from '@/types'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export function BroadcastRow({ b, counts }: { b: Broadcast; counts: AudienceCounts }) {
  const router = useRouter()
  const open = () => router.push(`/admin/broadcasts/${b.id}`)
  const audience = b.audience_type as BroadcastAudience
  const recipients = audience in AUDIENCE_LABELS ? recipientCountFor(audience, counts) : 0

  return (
    <tr
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open()
      }}
      tabIndex={0}
      className="cursor-pointer border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.03] focus:bg-black/[0.03] focus:outline-none"
    >
      <td className="px-4 py-3 font-medium">{b.subject}</td>
      <td className="px-4 py-3 text-brand-muted">{AUDIENCE_LABELS[audience] ?? b.audience_type}</td>
      <td className="px-4 py-3">
        <BroadcastStatusBadge status={b.status} />
      </td>
      <td className="px-4 py-3 text-brand-muted">{recipients}</td>
      <td className="px-4 py-3 text-brand-muted">{formatDate(b.updated_at)}</td>
    </tr>
  )
}
