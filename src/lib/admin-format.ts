import type { ScoreRange, BroadcastStatus } from '@/types'

// Badge colours per score band, tuned for the light admin background.
export const RANGE_BADGE: Record<ScoreRange, string> = {
  at_risk: 'bg-[#fde2e2] text-[#991b1b]',
  under_strain: 'bg-[#fef3c7] text-[#92400e]',
  strong: 'bg-[#dcfce7] text-[#166534]',
}

// e.g. "14 May 2026"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Last-known email status from an email_messages row.
export function emailStatus(message?: {
  delivered_at: string | null
  first_opened_at: string | null
}): string {
  if (!message) return '—'
  if (message.first_opened_at) return 'Opened'
  if (message.delivered_at) return 'Delivered'
  return 'Sent'
}

// Status pill colours, tuned for the light admin background.
export const BROADCAST_STATUS_BADGE: Record<BroadcastStatus, string> = {
  draft: 'bg-black/5 text-brand-muted',
  scheduled: 'bg-[#dbeafe] text-[#1e40af]',
  sent: 'bg-[#dcfce7] text-[#166534]',
  cancelled: 'bg-[#fde2e2] text-[#991b1b]',
  failed: 'bg-[#fde2e2] text-[#991b1b]',
}

const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sent: 'Sent',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

export function broadcastStatusLabel(status: BroadcastStatus): string {
  return BROADCAST_STATUS_LABELS[status]
}
