import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/admin-format'
import { RangeBadge } from '@/components/admin/RangeBadge'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import type { DashboardStats, ScoreRange } from '@/types'

export const dynamic = 'force-dynamic'

const QUIZ_URL = 'quiz.ibironkeosemowo.com'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: statsData } = await supabase.rpc('get_dashboard_stats')
  const stats: DashboardStats = statsData ?? {
    total: 0,
    at_risk: 0,
    under_strain: 0,
    strong: 0,
    wants_support_yes: 0,
    wants_support_no: 0,
  }

  const { data: recent } = await supabase
    .from('assessments')
    .select('id, first_name, score, score_range, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(5)

  const cards = [
    { label: 'Total respondents', value: stats.total },
    { label: 'Would love a session', value: stats.wants_support_yes },
    { label: 'Connection at risk', value: stats.at_risk },
    { label: 'Connection under strain', value: stats.under_strain },
    { label: 'Connection is strong', value: stats.strong },
  ]

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Dashboard</h1>

      {stats.total === 0 ? (
        <div className="mt-8 rounded-xl border border-black/10 bg-brand-white p-10 text-center">
          <p className="font-display text-xl">No one has taken the quiz yet</p>
          <p className="mt-2 text-sm text-brand-muted">Share your quiz link to get started:</p>
          <p className="mt-3 font-medium">{QUIZ_URL}</p>
          <div className="mt-4 flex justify-center">
            <CopyLinkButton text={QUIZ_URL} />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {cards.map((card) => (
              <div key={card.label} className="rounded-xl border border-black/10 bg-brand-white p-5">
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-brand-muted">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">Recent respondents</h2>
              <Link
                href="/admin/respondents"
                className="text-sm text-brand-muted transition-colors hover:text-brand-black"
              >
                View all respondents →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-xl border border-black/10 bg-brand-white">
              <table className="w-full text-sm">
                <thead className="border-b border-black/10 text-left text-xs text-brand-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Range</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/respondents/${r.id}`}
                          className="font-medium transition-colors hover:text-brand-gold"
                        >
                          {r.first_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{r.score} / 80</td>
                      <td className="px-4 py-3">
                        <RangeBadge range={r.score_range as ScoreRange} />
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{formatDate(r.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
