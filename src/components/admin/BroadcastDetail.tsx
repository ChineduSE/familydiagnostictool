import { formatDate } from '@/lib/admin-format'
import { BroadcastStatusBadge } from './BroadcastStatusBadge'
import { EmailPreview } from './EmailPreview'
import type { BroadcastAudience } from '@/lib/audience'
import type { Broadcast } from '@/types'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export function BroadcastDetail({ broadcast, logoUrl }: { broadcast: Broadcast; logoUrl: string | null }) {
  const audience = broadcast.audience_type as BroadcastAudience
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">{broadcast.subject}</h1>
        <BroadcastStatusBadge status={broadcast.status} />
      </div>
      <dl className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-brand-white p-5 text-sm">
        <div className="flex justify-between"><dt className="text-brand-muted">Audience</dt><dd className="font-medium">{AUDIENCE_LABELS[audience] ?? broadcast.audience_type}</dd></div>
        {broadcast.sent_at && (
          <div className="flex justify-between"><dt className="text-brand-muted">Sent</dt><dd className="font-medium">{formatDate(broadcast.sent_at)}</dd></div>
        )}
        {broadcast.resend_broadcast_id && (
          <div className="flex justify-between"><dt className="text-brand-muted">Resend id</dt><dd className="font-mono text-xs">{broadcast.resend_broadcast_id}</dd></div>
        )}
      </dl>
      <div className="mt-6">
        <EmailPreview
          subject={broadcast.subject}
          bodyHtml={broadcast.body_html}
          ctaLabel={broadcast.cta_label ?? undefined}
          ctaUrl={broadcast.cta_url ?? undefined}
          logoUrl={logoUrl}
          includeLogo={broadcast.include_logo}
        />
      </div>
    </div>
  )
}
