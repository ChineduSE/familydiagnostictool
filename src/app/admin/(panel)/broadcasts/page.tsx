import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import { BroadcastRow } from '@/components/admin/BroadcastRow'
import type { Broadcast } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BroadcastsPage() {
  const supabase = await createClient()
  const [{ data: rows }, counts] = await Promise.all([
    supabase.from('broadcasts').select('*').order('updated_at', { ascending: false }),
    fetchAudienceCounts(supabase),
  ])
  const broadcasts = (rows ?? []) as Broadcast[]

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Broadcasts</h1>
        <Link href="/admin/broadcasts/new" className="btn-primary">
          New broadcast
        </Link>
      </div>

      {broadcasts.length === 0 ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-brand-white p-10 text-center">
          <p className="font-display text-xl">No broadcasts yet</p>
          <p className="mt-2 text-sm text-brand-muted">
            Create a draft to start composing an email to your respondents.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/admin/broadcasts/new" className="btn-primary">
              New broadcast
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/10 bg-brand-white">
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recipients</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <BroadcastRow key={b.id} b={b} counts={counts} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
