'use client'

import { buildBroadcastHtml } from '@/lib/broadcast-html'

type EmailPreviewProps = {
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  logoUrl?: string | null
  includeLogo: boolean
}

export function EmailPreview({ bodyHtml, ctaLabel, ctaUrl, logoUrl, includeLogo }: EmailPreviewProps) {
  const html = buildBroadcastHtml({
    bodyHtml: bodyHtml || '<p style="color:#888">Your message preview will appear here…</p>',
    ctaLabel,
    ctaUrl,
    logoUrl: includeLogo ? logoUrl : null,
  })

  return (
    <div className="rounded-xl border border-black/10 bg-brand-offwhite p-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-muted">Preview</p>
      <div className="rounded-lg bg-white p-5 shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
