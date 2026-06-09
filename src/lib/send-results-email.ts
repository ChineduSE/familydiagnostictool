import { createElement } from 'react'
import { render } from '@react-email/components'
import { ResultsEmail } from '@/emails/ResultsEmail'
import { EMAIL_COPY } from '@/lib/questions'
import { createResend, EMAIL_FROM } from '@/lib/resend'
import type { ScoreRange } from '@/types'

type SendResultsEmailParams = {
  firstName: string
  email: string
  score: number
  scoreRange: ScoreRange
  ctaUrl?: string
  logoUrl?: string
}

type SendResult = { success: boolean; id?: string; error?: string }

// Renders and sends the instant results email. Never throws — returns a result
// object so the caller (the submit route) can record success/failure without
// ever failing the quiz submission.
export async function sendResultsEmail(params: SendResultsEmailParams): Promise<SendResult> {
  const resend = createResend()
  if (!resend) return { success: false, error: 'Email not configured (no RESEND_API_KEY)' }

  try {
    const html = await render(
      createElement(ResultsEmail, {
        firstName: params.firstName,
        score: params.score,
        scoreRange: params.scoreRange,
        ctaUrl: params.ctaUrl,
        logoUrl: params.logoUrl,
      })
    )

    const subject = EMAIL_COPY[params.scoreRange].subject.replaceAll('[First name]', params.firstName)

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.email,
      subject,
      html,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
