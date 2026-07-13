import { createResend, EMAIL_FROM, OWNER_EMAIL } from '@/lib/resend'
import { SCORE_LABELS } from '@/lib/questions'
import type { ScoreRange } from '@/types'

type SendSessionRequestParams = {
  firstName: string
  email: string
  phone: string | null
  score: number
  scoreRange: ScoreRange
  message: string
}

type SendResult = { success: boolean; id?: string; error?: string }

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// Emails the app owner (Ibironke) that a parent asked to book a session. Reply-To
// is the parent's email so she replies straight from Gmail. Never throws.
export async function sendSessionRequestEmail(p: SendSessionRequestParams): Promise<SendResult> {
  const resend = createResend()
  if (!resend) return { success: false, error: 'Email not configured (no RESEND_API_KEY)' }

  const band = SCORE_LABELS[p.scoreRange]
  const subject = `Session request: ${p.firstName} (${p.score}/80, ${band})`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1A1A1A">
  <p><strong>${escapeHtml(p.firstName)} would like to book a session.</strong></p>
  <p>Name: ${escapeHtml(p.firstName)}<br/>
     Email: ${escapeHtml(p.email)}<br/>
     Phone: ${escapeHtml(p.phone || 'Not provided')}<br/>
     Score: ${p.score}/80 (${escapeHtml(band)})</p>
  <hr/>
  <p style="white-space:pre-line">${escapeHtml(p.message)}</p>
  <p style="color:#666">Reply to this email to reach ${escapeHtml(p.firstName)} directly.</p>
</div>`

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: OWNER_EMAIL,
      replyTo: p.email,
      subject,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
