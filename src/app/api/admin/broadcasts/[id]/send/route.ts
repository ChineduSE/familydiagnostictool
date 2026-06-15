import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/resend'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'
import { syncConsentedContacts } from '@/lib/resend-audience'
import { sendBroadcastNow } from '@/lib/resend-broadcast'
import type { Broadcast, Settings } from '@/types'
import type { BroadcastAudience } from '@/lib/audience'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const resend = createResend()
  if (!resend) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

  const { data: broadcast } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

  // Sync first: this auto-creates the Resend audience (saving its id to settings)
  // and refreshes each contact's score_band. Must run BEFORE resolving the target
  // so an "all" send can find the freshly-created audience id.
  try {
    await syncConsentedContacts(supabase, resend)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Audience sync failed' },
      { status: 502 }
    )
  }

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })

  const resolved = resolveBroadcastTarget(
    (broadcast as Broadcast).audience_type as BroadcastAudience,
    settings as Settings
  )
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

  const result = await sendBroadcastNow({
    supabase,
    resend,
    broadcast: broadcast as Broadcast,
    target: resolved.target,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    logoUrl: (broadcast as Broadcast).include_logo ? (settings as Settings).logo_url : null,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, broadcastId: result.broadcastId })
}
