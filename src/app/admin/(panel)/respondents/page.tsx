import { createClient } from '@/lib/supabase/server'
import { RespondentsControls } from '@/components/admin/RespondentsControls'
import { RespondentRow } from '@/components/admin/RespondentRow'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'

export const dynamic = 'force-dynamic'

const QUIZ_URL = 'quiz.ibironkeosemowo.com'
const VALID_RANGES = ['all', 'at_risk', 'under_strain', 'strong']
const VALID_SORTS = ['date_desc', 'date_asc', 'score_desc', 'score_asc']
const VALID_SUPPORT = ['all', 'yes', 'no']

type SearchParams = Promise<{ range?: string; sort?: string; support?: string }>

export default async function RespondentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const range = VALID_RANGES.includes(sp.range ?? '') ? (sp.range as string) : 'all'
  const sort = VALID_SORTS.includes(sp.sort ?? '') ? (sp.sort as string) : 'date_desc'
  const support = VALID_SUPPORT.includes(sp.support ?? '') ? (sp.support as string) : 'all'

  const supabase = await createClient()

  let query = supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, wants_support, submitted_at')

  if (range !== 'all') query = query.eq('score_range', range)
  if (support === 'yes') query = query.eq('wants_support', true)
  if (support === 'no') query = query.eq('wants_support', false)

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

  const isFiltered = range !== 'all' || support !== 'all'

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Respondents</h1>

      <div className="mt-5">
        <RespondentsControls range={range} sort={sort} support={support} />
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
                <th className="px-4 py-3 font-medium">Support</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {respondents.map((r) => (
                <RespondentRow key={r.id} r={r} status={statusByAssessment.get(r.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
