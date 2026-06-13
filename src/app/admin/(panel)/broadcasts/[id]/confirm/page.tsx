import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import { recipientCountFor, type BroadcastAudience } from '@/lib/audience'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'
import { EmailPreview } from '@/components/admin/EmailPreview'
import { BroadcastConfirmActions } from '@/components/admin/BroadcastConfirmActions'
import type { Broadcast, Settings } from '@/types'

export const dynamic = 'force-dynamic'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export default async function ConfirmBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast
  if (broadcast.status !== 'draft') redirect(`/admin/broadcasts/${id}`)

  const [{ data: settingsRow }, counts] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    fetchAudienceCounts(supabase),
  ])
  const settings = (settingsRow ?? {}) as Settings
  const audience = broadcast.audience_type as BroadcastAudience
  const recipientCount = recipientCountFor(audience, counts)
  const resolved = resolveBroadcastTarget(audience, settings)

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/broadcasts/${id}`} className="text-sm text-brand-muted underline">
        ← Back to draft
      </Link>
      <h1 className="mt-2 font-display text-[clamp(29px,5vw,40px)] leading-tight">Review &amp; send</h1>

      <dl className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-brand-white p-5 text-sm">
        <div className="flex justify-between"><dt className="text-brand-muted">Subject</dt><dd className="font-medium">{broadcast.subject}</dd></div>
        <div className="flex justify-between"><dt className="text-brand-muted">Audience</dt><dd className="font-medium">{AUDIENCE_LABELS[audience]}</dd></div>
        <div className="flex justify-between"><dt className="text-brand-muted">Recipients</dt><dd className="font-medium">{recipientCount}</dd></div>
      </dl>

      <div className="mt-6">
        <EmailPreview
          subject={broadcast.subject}
          bodyHtml={broadcast.body_html}
          ctaLabel={broadcast.cta_label ?? undefined}
          ctaUrl={broadcast.cta_url ?? undefined}
          logoUrl={settings.logo_url}
          includeLogo={broadcast.include_logo}
        />
      </div>

      <div className="mt-6">
        <BroadcastConfirmActions
          broadcastId={id}
          recipientCount={recipientCount}
          disabledReason={resolved.ok ? undefined : resolved.error}
        />
      </div>
    </div>
  )
}
