import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/resend'
import { sendTestToSelf } from '@/lib/resend-broadcast'
import type { Broadcast } from '@/types'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  if (!auth.user.email) return NextResponse.json({ error: 'Admin has no email' }, { status: 400 })

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const resend = createResend()
  if (!resend) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

  const { data: broadcast } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

  const { data: settings } = await supabase.from('settings').select('logo_url').eq('id', 1).maybeSingle()

  const result = await sendTestToSelf({
    resend,
    broadcast: broadcast as Broadcast,
    to: auth.user.email,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    logoUrl: (broadcast as Broadcast).include_logo ? settings?.logo_url ?? null : null,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, sentTo: auth.user.email })
}
