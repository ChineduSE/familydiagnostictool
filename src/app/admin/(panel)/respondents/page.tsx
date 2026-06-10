import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { emailStatus, formatDate } from '@/lib/admin-format'
import { RangeBadge } from '@/components/admin/RangeBadge'
import { RespondentsControls } from '@/components/admin/RespondentsControls'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import type { ScoreRange } from '@/types'

export const dynamic = 'force-dynamic'

const QUIZ_URL = 'quiz.ibironkeosemowo.com'
const VALID_RANGES = ['all', 'at_risk', 'under_strain', 'strong']
const VALID_SORTS = ['date_desc', 'date_asc', 'score_desc', 'score_asc']

type SearchParams = Promise<{ range?: string; sort?: string }>

export default async function RespondentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const range = VALID_RANGES.includes(sp.range ?? '') ? (sp.range as string) : 'all'
  const sort = VALID_SORTS.includes(sp.sort ?? '') ? (sp.sort as string) : 'date_desc'

  const supabase = await createClient()

  let query = supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, submitted_at')

  if (range !== 'all') query = query.eq('score_range', range)

  switch (sort) {
    case 'date_asc':
      query = query.order('submitted_at', { ascending: true })
      break
    case 'score_desc':
      query = query.order('score', { ascending: false })
      break
    case 'score_asc':
      query = query.order('score', { ascending: true })
      break
    default:
      query = query.order('submitted_at', { ascending: false })
  }

  const { data: rows } = await query
  const respondents = rows ?? []

  // Last-known email status per assessment (populated once delivery tracking is live).
  const statusByAssessment = new Map<string, { delivered_at: string | null; first_opened_at: string | null }>()
  if (respondents.length > 0) {
    const { data: messages } = await supabase
      .from('email_messages')
      .select('assessment_id, delivered_at, first_opened_at')
      .eq('kind', 'results')
      .in(
        'assessment_id',
        respondents.map((r) => r.id)
      )
    for (const m of messages ?? []) {
      if (m.assessment_id) statusByAssessment.set(m.assessment_id, m)
    }
  }

  const isFiltered = range !== 'all'

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Respondents</h1>

      <div className="mt-5">
        <RespondentsControls range={range} sort={sort} />
      </div>

      <p className="mt-4 text-sm text-brand-muted">
        Showing {respondents.length} respondent{respondents.length === 1 ? '' : 's'}
      </p>

      {respondents.length === 0 ? (
        <div className="mt-4 rounded-xl border border-black/10 bg-brand-white p-10 text-center">
          {isFiltered ? (
            <p className="text-brand-muted">No respondents in this range yet</p>
          ) : (
            <>
              <p className="font-display text-xl">No respondents yet</p>
              <p className="mt-2 text-sm text-brand-muted">
                Share your quiz link to start collecting results:
              </p>
              <p className="mt-3 font-medium">{QUIZ_URL}</p>
              <div className="mt-4 flex justify-center">
                <CopyLinkButton text={QUIZ_URL} />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-brand-white">
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Range</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {respondents.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/respondents/${r.id}`}
                      className="font-medium transition-colors hover:text-brand-gold"
                    >
                      {r.first_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{r.email}</td>
                  <td className="px-4 py-3 text-brand-muted">{r.phone || '—'}</td>
                  <td className="px-4 py-3">{r.score} / 60</td>
                  <td className="px-4 py-3">
                    <RangeBadge range={r.score_range as ScoreRange} />
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{formatDate(r.submitted_at)}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {emailStatus(statusByAssessment.get(r.id))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
