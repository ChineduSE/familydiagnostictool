import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'
import type { Broadcast } from '@/types'
import type { ResendTarget } from '@/lib/broadcast-targets'
import { buildBroadcastHtml } from '@/lib/broadcast-html'
import { toResendMergeFields, toSampleText } from '@/lib/broadcast-merge'

const UNSUBSCRIBE_FOOTER =
  `<div style="margin-top:28px;font-size:12px;color:#9a948b;text-align:center;">` +
  `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9a948b;">Unsubscribe</a></div>`

type SendResult = { ok: true; broadcastId: string } | { ok: false; error: string }

type SendBroadcastArgs = {
  supabase: SupabaseClient
  resend: Resend
  broadcast: Broadcast
  target: ResendTarget
  from: string
  replyTo?: string
  logoUrl?: string | null
}

export async function sendBroadcastNow(args: SendBroadcastArgs): Promise<SendResult> {
  const { supabase, resend, broadcast, target, from, replyTo, logoUrl } = args

  if (broadcast.status === 'sent' || broadcast.resend_broadcast_id) {
    return { ok: false, error: 'This broadcast has already been sent.' }
  }

  const bodyHtml = toResendMergeFields(broadcast.body_html)
  const html =
    buildBroadcastHtml({
      bodyHtml,
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: logoUrl ?? null,
    }) + UNSUBSCRIBE_FOOTER

  // CreateBroadcastOptions requires RequireAtLeastOne<SegmentOptions> (audienceId | segmentId)
  // and RequireAtLeastOne<EmailRenderOptions> (html | react | text), plus send: true.
  // We spread target (which satisfies the segment requirement) and cast because
  // TypeScript cannot verify RequireAtLeastOne constraints through object spread.
  const payload = {
    ...target,
    from,
    replyTo,
    name: broadcast.subject,
    subject: toResendMergeFields(broadcast.subject),
    html,
    send: true as const,
  }

  const { data, error } = await resend.broadcasts.create(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spread of ResendTarget satisfies RequireAtLeastOne<SegmentOptions> at runtime but TS cannot verify through spread
    payload as any
  )

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to send broadcast' }

  const { error: updateError } = await supabase
    .from('broadcasts')
    .update({
      resend_broadcast_id: data.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', broadcast.id)

  if (updateError) {
    // The broadcast WAS sent via Resend, but recording it failed. Surface a
    // distinct error so the operator investigates rather than blindly resending —
    // a retry would pass the idempotency guard (status still 'draft') and send a
    // duplicate to real parents. This cross-system gap can't be made atomic here.
    console.error(
      `Broadcast ${broadcast.id} sent (resend id ${data.id}) but status update failed:`,
      updateError
    )
    return {
      ok: false,
      error: 'The broadcast was sent, but saving its status failed. Do not resend — verify it in Resend first.',
    }
  }

  return { ok: true, broadcastId: data.id }
}

// Test sends go through the transactional API and return an email id (not a
// broadcast id), so they use a result type without the misleading broadcastId.
type TestSendResult = { ok: true } | { ok: false; error: string }

type TestSendArgs = { resend: Resend; broadcast: Broadcast; to: string; from: string; replyTo?: string; logoUrl?: string | null }

export async function sendTestToSelf(args: TestSendArgs): Promise<TestSendResult> {
  const { resend, broadcast, to, from, replyTo, logoUrl } = args
  const html =
    buildBroadcastHtml({
      bodyHtml: toSampleText(broadcast.body_html, ''),
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: logoUrl ?? null,
    }) + '<div style="margin-top:28px;font-size:12px;color:#9a948b;text-align:center;">Unsubscribe (test)</div>'

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `[TEST] ${toSampleText(broadcast.subject, '')}`,
    html,
  })

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to send test' }
  return { ok: true }
}
