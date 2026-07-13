import { NextResponse } from 'next/server'
import { QUESTIONS, getScoreRange } from '@/lib/questions'
import { submitSchema } from '@/lib/submit-schema'
import { sendResultsEmail } from '@/lib/send-results-email'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const parsed = submitSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 })
  }

  const { firstName, email, phone, marketingConsent, answers, wantsSupport } = parsed.data
  const score = answers.reduce((total, value) => total + value, 0)
  const scoreRange = getScoreRange(score)
  const structuredAnswers = QUESTIONS.map((question, index) => ({
    id: question.id,
    section: question.section,
    value: answers[index],
  }))

  const supabase = createSupabaseAdmin()
  let contactId: string | null = null
  let assessmentId: string | null = null
  let ctaUrl = ''
  let logoUrl: string | undefined

  if (supabase) {
    // Upsert the contact (one row per email, preserved across repeat quizzes).
    // Opt-out model: completing the quiz subscribes the parent, so consent is
    // always recorded. A parent leaves the audience only by unsubscribing.
    const contactPayload: Record<string, unknown> = {
      email,
      first_name: firstName,
      phone: phone || null,
      latest_score_range: scoreRange,
      marketing_consent: true,
      marketing_consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(contactPayload, { onConflict: 'email' })
      .select('id')
      .single()

    if (contactError) {
      // Non-fatal: the assessment is the record that matters. Log and continue.
      console.error('Failed to upsert contact:', contactError)
    } else {
      contactId = contact?.id ?? null
    }

    // The assessment is the authoritative per-submission record.
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        contact_id: contactId,
        first_name: firstName,
        email,
        phone: phone || null,
        score,
        score_range: scoreRange,
        wants_support: wantsSupport,
        answers: structuredAnswers,
        marketing_consent: marketingConsent,
      })
      .select('id')
      .single()

    if (assessmentError) {
      console.error('Failed to save assessment:', assessmentError)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
    assessmentId = assessment?.id ?? null

    const { data: settings } = await supabase
      .from('settings')
      .select('whatsapp_number, whatsapp_message_template, logo_url')
      .eq('id', 1)
      .maybeSingle()

    ctaUrl = buildWhatsAppUrl(settings?.whatsapp_number, settings?.whatsapp_message_template, {
      firstName,
      score,
    })
    if (settings?.logo_url) logoUrl = settings.logo_url
  }

  // Send the instant results email. An email failure must never block the
  // results page — the assessment is already saved, so we always return success.
  try {
    const sent = await sendResultsEmail({ firstName, email, score, scoreRange, wantsSupport, ctaUrl, logoUrl })

    if (supabase && sent.success && sent.id) {
      await supabase.from('email_messages').insert({
        resend_email_id: sent.id,
        contact_id: contactId,
        assessment_id: assessmentId,
        kind: 'results',
        recipient_email: email,
      })
    } else if (!sent.success) {
      console.error('Results email not sent:', sent.error)
    }
  } catch (err) {
    console.error('Results email error:', err)
  }

  return NextResponse.json({ success: true, score, scoreRange })
}
