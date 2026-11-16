import type { createSupabaseAdmin } from '@/lib/supabase-admin'
import { sendSessionRequestEmail } from '@/lib/send-session-request-email'
import type { ScoreRange } from '@/types'

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>

export type NotifyResult =
  | { ok: true; alreadySent?: boolean }
  | { ok: false; reason: 'not_found' | 'send_failed'; error?: string }

const DEFAULT_MESSAGE =
  '[First name] took the Family Connection Diagnosis and would like to book a session.'

// Emails Ibironke that a parent wants a session and stamps session_request_at.
// Shared by quiz submit (parent answered "Yes" to the readiness question) and
// /api/book (legacy "Book your session" links in already-sent emails).
// Idempotent: never notifies twice for the same assessment. Never throws.
export async function notifySessionRequest(
  supabase: AdminClient,
  assessmentId: string
): Promise<NotifyResult> {
  const { data: a, error } = await supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, session_request_at')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !a) return { ok: false, reason: 'not_found' }
  if (a.session_request_at) return { ok: true, alreadySent: true }

  const { data: settings } = await supabase
    .from('settings')
    .select('whatsapp_message_template')
    .eq('id', 1)
    .maybeSingle()

  const message = (settings?.whatsapp_message_template || DEFAULT_MESSAGE)
    .replaceAll('[First name]', a.first_name)
    .replaceAll('[SCORE]', String(a.score))

  const sent = await sendSessionRequestEmail({
    firstName: a.first_name,
    email: a.email,
    phone: a.phone,
    score: a.score,
    scoreRange: a.score_range as ScoreRange,
    message,
  })

  if (!sent.success) return { ok: false, reason: 'send_failed', error: sent.error }

  // Stamp only after a successful send so a failed send can be retried.
  await supabase
    .from('assessments')
    .update({ session_request_at: new Date().toISOString() })
    .eq('id', assessmentId)

  return { ok: true }
}
