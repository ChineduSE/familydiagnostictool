import { NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { unsubscribeContact } from '@/lib/unsubscribe-contact'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend } from '@/lib/resend'

export async function POST(request: Request) {
  const form = await request.formData()
  const email = String(form.get('e') ?? '')
  const token = String(form.get('t') ?? '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(`${appUrl}/unsubscribe`, { status: 303 })
  }

  const supabase = createSupabaseAdmin()
  const resend = createResend()
  if (supabase && resend) await unsubscribeContact(supabase, resend, email)

  return NextResponse.redirect(`${appUrl}/unsubscribe?done=1`, { status: 303 })
}
