'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { draftBroadcastSchema } from '@/lib/broadcast-schema'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { RichTextEditor } from './RichTextEditor'
import { AudienceSelector } from './AudienceSelector'
import { EmailPreview } from './EmailPreview'
import { useAudienceCounts } from '@/hooks/useAudienceCounts'
import type { BroadcastAudience } from '@/lib/audience'
import type { Broadcast } from '@/types'

type BroadcastComposerProps = { broadcast?: Broadcast }

export function BroadcastComposer({ broadcast }: BroadcastComposerProps) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const counts = useAudienceCounts()

  const [subject, setSubject] = useState(broadcast?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(broadcast?.body_html ?? '')
  const [ctaLabel, setCtaLabel] = useState(broadcast?.cta_label ?? '')
  const [ctaUrl, setCtaUrl] = useState(broadcast?.cta_url ?? '')
  const [includeLogo, setIncludeLogo] = useState(broadcast?.include_logo ?? false)
  const [audienceType, setAudienceType] = useState<BroadcastAudience>(
    (broadcast?.audience_type as BroadcastAudience) ?? 'all'
  )

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappTemplate, setWhatsappTemplate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select('logo_url, whatsapp_number, whatsapp_message_template')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setLogoUrl(data.logo_url)
        setWhatsappNumber(data.whatsapp_number ?? '')
        setWhatsappTemplate(data.whatsapp_message_template ?? '')
      })
  }, [supabase])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  function useWhatsAppLink() {
    const url = buildWhatsAppUrl(whatsappNumber, whatsappTemplate, { firstName: '', score: 0 })
    if (url) setCtaUrl(url)
  }

  async function saveDraft() {
    setError(null)
    const parsed = draftBroadcastSchema.safeParse({
      subject,
      bodyHtml,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
      includeLogo,
      audienceType,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form')
      return
    }

    setSaving(true)
    const payload = {
      subject,
      body_html: bodyHtml,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      include_logo: includeLogo,
      audience_type: audienceType,
      status: 'draft' as const,
    }

    if (broadcast) {
      const { error } = await supabase.from('broadcasts').update(payload).eq('id', broadcast.id)
      setSaving(false)
      if (error) return showToast('Could not save — please try again')
      showToast('Draft saved')
    } else {
      const { data, error } = await supabase
        .from('broadcasts')
        .insert(payload)
        .select('id')
        .single()
      setSaving(false)
      if (error || !data) return showToast('Could not save — please try again')
      router.push(`/admin/broadcasts/${data.id}`)
    }
  }

  async function deleteDraft() {
    if (!broadcast) return
    if (!window.confirm('Delete this draft? This cannot be undone.')) return
    const { error } = await supabase.from('broadcasts').delete().eq('id', broadcast.id)
    if (error) return showToast('Could not delete — please try again')
    router.push('/admin/broadcasts')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold" htmlFor="subject">
            Subject line
          </label>
          <input
            id="subject"
            className="field-input mt-1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A note for you, [First name]"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Type <code className="rounded bg-black/5 px-1">[First name]</code> anywhere in the
            subject <em>or</em> the message — it&apos;s replaced with each parent&apos;s first name
            when the email is sent. In the message, use the{' '}
            <span className="font-medium">+ [First name]</span> button below.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold">Message</label>
          <div className="mt-1">
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold">Audience</label>
          <div className="mt-1">
            <AudienceSelector value={audienceType} onChange={setAudienceType} counts={counts} />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-brand-white p-4">
          <p className="text-sm font-bold">Call-to-action button (optional)</p>
          <input
            className="field-input mt-2"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Button label (e.g. Book a session)"
          />
          <input
            className="field-input mt-2"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://…"
          />
          <button type="button" onClick={useWhatsAppLink} className="mt-2 text-sm text-brand-muted underline">
            Use my WhatsApp link
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} />
          Include logo at the top
          {includeLogo && !logoUrl && (
            <span className="text-xs text-brand-muted">(no logo uploaded yet — set one in Settings)</span>
          )}
        </label>

        {error && <p className="text-sm text-[#991b1b]">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {broadcast ? (
            <button
              type="button"
              onClick={() => router.push(`/admin/broadcasts/${broadcast.id}/confirm`)}
              className="rounded-full border border-brand-black px-5 py-3 text-sm font-bold text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
            >
              Send now
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Save the draft first, then you can send it"
              className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
            >
              Send now
            </button>
          )}
          <button
            type="button"
            disabled
            title="Scheduling activates in a later update"
            className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
          >
            Schedule
          </button>
          {broadcast && (
            <button type="button" onClick={deleteDraft} className="ml-auto text-sm text-[#991b1b] underline">
              Delete draft
            </button>
          )}
        </div>
        <p className="text-xs text-brand-muted">
          Save your draft, then use “Send now” to review and send. Scheduling comes next.
        </p>
        {toast && (
          <div className="rounded-lg bg-brand-black px-4 py-2 text-sm text-brand-white">{toast}</div>
        )}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <EmailPreview
          subject={subject}
          bodyHtml={bodyHtml}
          ctaLabel={ctaLabel || undefined}
          ctaUrl={ctaUrl || undefined}
          logoUrl={logoUrl}
          includeLogo={includeLogo}
        />
      </div>
    </div>
  )
}
