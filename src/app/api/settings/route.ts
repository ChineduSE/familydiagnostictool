import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// Public settings read for the results page. Returns the WhatsApp number and
// message template; the client builds a personalised wa.me link from them. The
// number is digits-only and the final link is always a hardcoded https://wa.me
// URL, so there is no scheme-injection risk.
export async function GET() {
  const supabase = createSupabaseAdmin()

  if (supabase) {
    const { data } = await supabase
      .from('settings')
      .select('whatsapp_number, whatsapp_message_template')
      .eq('id', 1)
      .maybeSingle()

    return NextResponse.json({
      whatsappNumber: data?.whatsapp_number ?? '',
      whatsappMessageTemplate: data?.whatsapp_message_template ?? '',
    })
  }

  return NextResponse.json({ whatsappNumber: '', whatsappMessageTemplate: '' })
}
