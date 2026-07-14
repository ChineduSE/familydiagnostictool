import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QUESTIONS, SCALE_LABELS, SCORE_LABELS } from '@/lib/questions'
import { emailStatus, formatDate } from '@/lib/admin-format'
import { RangeBadge } from '@/components/admin/RangeBadge'
import { DeleteRespondentButton } from '@/components/admin/DeleteRespondentButton'
import { cn } from '@/lib/utils'
import type { QuizAnswer, ScoreRange } from '@/types'

export const dynamic = 'force-dynamic'

function BackLink() {
  return (
    <Link
      href="/admin/respondents"
      className="text-sm text-brand-muted transition-colors hover:text-brand-black"
    >
      ← Back to respondents
    </Link>
  )
}

export default async function RespondentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: respondent } = await supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, wants_support, session_request_at, answers, submitted_at')
    .eq('id', id)
    .maybeSingle()

  if (!respondent) {
    return (
      <div>
        <BackLink />
        <p className="mt-6 font-display text-xl">Respondent not found</p>
      </div>
    )
  }

  const range = respondent.score_range as ScoreRange
  const answerByQuestion = new Map<string, number>()
  for (const answer of (respondent.answers as QuizAnswer[]) ?? []) {
    answerByQuestion.set(answer.id, answer.value)
  }

  const sections: string[] = []
  for (const q of QUESTIONS) if (!sections.includes(q.section)) sections.push(q.section)

  const { data: emails } = await supabase
    .from('email_messages')
    .select('kind, delivered_at, first_opened_at, created_at')
    .eq('assessment_id', id)
    .order('created_at', { ascending: false })

  const { data: contact } = await supabase
    .from('contacts')
    .select('unsubscribed_at')
    .eq('email', respondent.email)
    .maybeSingle()
  const isUnsubscribed = Boolean(contact?.unsubscribed_at)

  return (
    <div className="max-w-3xl">
      <BackLink />

      {/* Profile */}
      <div className="mt-4 rounded-xl border border-black/10 bg-brand-white p-6">
        <h1 className="font-display text-[clamp(24px,4vw,34px)] leading-tight">
          {respondent.first_name}
        </h1>
        <div className="mt-3 grid gap-1 text-sm text-brand-muted">
          <a className="hover:text-brand-black" href={`mailto:${respondent.email}`}>
            {respondent.email}
          </a>
          <span>{respondent.phone || 'Not provided'}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="font-display text-2xl">{respondent.score} / 80</span>
          <RangeBadge range={range} />
          {isUnsubscribed && (
            <span className="inline-block whitespace-nowrap rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-brand-muted">
              Unsubscribed
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          Submitted {formatDate(respondent.submitted_at)}
        </p>
        <p className="mt-2 text-xs text-brand-muted">
          Wants guided support:{' '}
          <span className="font-medium text-brand-black">
            {respondent.wants_support === true
              ? 'Yes'
              : respondent.wants_support === false
                ? 'No'
                : 'Not answered'}
          </span>
        </p>
        <p className="mt-2 text-xs text-brand-muted">
          Requested a session:{' '}
          <span className="font-medium text-brand-black">
            {respondent.session_request_at
              ? `Yes (${formatDate(respondent.session_request_at)})`
              : 'No'}
          </span>
        </p>
      </div>

      {/* Answers */}
      <h2 className="mt-8 font-display text-xl">Diagnostic answers</h2>
      <div className="mt-3 space-y-6">
        {sections.map((section) => (
          <div key={section}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
              {section}
            </p>
            <div className="space-y-3">
              {QUESTIONS.filter((q) => q.section === section).map((q) => {
                const value = answerByQuestion.get(q.id)
                return (
                  <div key={q.id} className="rounded-lg border border-black/10 bg-brand-white p-4">
                    <p className="text-sm">{q.text}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className={cn(
                              'h-2 w-2 rounded-full',
                              value && dot <= value ? 'bg-brand-gold' : 'bg-black/15'
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-brand-muted">
                        {value
                          ? `${value} — ${SCALE_LABELS[value as keyof typeof SCALE_LABELS]}`
                          : 'No answer'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Email activity */}
      <h2 className="mt-8 font-display text-xl">Email activity</h2>
      <div className="mt-3 rounded-xl border border-black/10 bg-brand-white p-4">
        {emails && emails.length > 0 ? (
          <ul className="divide-y divide-black/5 text-sm">
            {emails.map((email, index) => (
              <li key={index} className="flex items-center justify-between py-2">
                <span>{email.kind === 'results' ? 'Results email' : 'Broadcast'}</span>
                <span className="text-brand-muted">
                  {emailStatus(email)} · {formatDate(email.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-muted">No email activity recorded yet</p>
        )}
      </div>

      <p className="mt-6 text-xs text-brand-muted">
        Score band: {SCORE_LABELS[range]}
      </p>

      <DeleteRespondentButton id={respondent.id} firstName={respondent.first_name} />
    </div>
  )
}
