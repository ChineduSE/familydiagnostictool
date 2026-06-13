import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'
import { BroadcastDetail } from '@/components/admin/BroadcastDetail'
import type { Broadcast, Settings } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast

  if (broadcast.status !== 'draft') {
    const { data: settings } = await supabase.from('settings').select('logo_url').eq('id', 1).maybeSingle()
    return <BroadcastDetail broadcast={broadcast} logoUrl={(settings as Settings | null)?.logo_url ?? null} />
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Edit broadcast</h1>
      <div className="mt-6">
        <BroadcastComposer broadcast={broadcast} />
      </div>
    </div>
  )
}
