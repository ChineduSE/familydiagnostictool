import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyBookingToken } from '@/lib/booking-token'
import { sendSessionRequestEmail } from '@/lib/send-session-request-email'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { ScoreRange } from '@/types'

const bookSchema = z.object({
  assessmentId: z.string().min(1),
  token: z.string().min(1),
})

const DEFAULT_MESSAGE =
  '[First name] took the Family Connection Diagnosis and would like to book a session.'

export async function POST(request: Request) {
  const parsed = bookSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }

  const { assessmentId, token } = parsed.data
  if (!verifyBookingToken(assessmentId, token)) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 })
  }

  const { data: a, error } = await supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, session_request_at')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !a) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  // Idempotent: never notify twice for the same assessment.
  if (a.session_request_at) {
    return NextResponse.json({ success: true, alreadySent: true })
  }

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

  if (!sent.success) {
    return NextResponse.json({ success: false, error: 'Send failed' }, { status: 502 })
  }

  // Stamp only after a successful send so a failed send can be retried.
  await supabase
    .from('assessments')
    .update({ session_request_at: new Date().toISOString() })
    .eq('id', assessmentId)

  return NextResponse.json({ success: true })
}
