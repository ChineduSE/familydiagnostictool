import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = createSupabaseAdmin()

  if (supabase) {
    const { data } = await supabase
      .from('settings')
      .select('whatsapp_cta_url')
      .eq('id', 1)
      .maybeSingle()

    if (data?.whatsapp_cta_url) {
      return NextResponse.json({ whatsappCtaUrl: data.whatsapp_cta_url })
    }
  }

  return NextResponse.json({ whatsappCtaUrl: process.env.NEXT_PUBLIC_WHATSAPP_CTA_URL ?? '' })
}
