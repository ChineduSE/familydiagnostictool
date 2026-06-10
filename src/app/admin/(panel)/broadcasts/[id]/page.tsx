import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'
import type { Broadcast } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EditBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Edit broadcast</h1>
      <div className="mt-6">
        <BroadcastComposer broadcast={broadcast} />
      </div>
    </div>
  )
}
