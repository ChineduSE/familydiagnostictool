import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyBookingToken } from '@/lib/booking-token'
import { notifySessionRequest } from '@/lib/notify-session-request'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const bookSchema = z.object({
  assessmentId: z.string().min(1),
  token: z.string().min(1),
})

// Still serves "Book your session" links in results emails sent before Yes
// answers started notifying Ibironke automatically at submit time.
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

  const result = await notifySessionRequest(supabase, assessmentId)
  if (!result.ok) {
    return result.reason === 'not_found'
      ? NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      : NextResponse.json({ success: false, error: 'Send failed' }, { status: 502 })
  }

  return NextResponse.json(result.alreadySent ? { success: true, alreadySent: true } : { success: true })
}
