import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// The CTA link is rendered into an href and opened in a new tab. Only expose
// http(s) URLs so a malformed or tampered value can never become a
// javascript:/data: link on the public results page.
function safeHttpUrl(url: string | null | undefined): string {
  return url && /^https?:\/\//i.test(url) ? url : ''
}

export async function GET() {
  const supabase = createSupabaseAdmin()

  if (supabase) {
    const { data } = await supabase
      .from('settings')
      .select('whatsapp_cta_url')
      .eq('id', 1)
      .maybeSingle()

    const ctaUrl = safeHttpUrl(data?.whatsapp_cta_url)
    if (ctaUrl) {
      return NextResponse.json({ whatsappCtaUrl: ctaUrl })
    }
  }

  return NextResponse.json({
    whatsappCtaUrl: safeHttpUrl(process.env.NEXT_PUBLIC_WHATSAPP_CTA_URL),
  })
}
