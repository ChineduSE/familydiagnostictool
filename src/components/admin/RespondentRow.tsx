'use client'

import { useRouter } from 'next/navigation'
import { emailStatus, formatDate } from '@/lib/admin-format'
import { RangeBadge } from './RangeBadge'
import type { ScoreRange } from '@/types'

type Respondent = {
  id: string
  first_name: string
  email: string
  phone: string | null
  score: number
  score_range: string
  submitted_at: string
}

type EmailStatusRow = { delivered_at: string | null; first_opened_at: string | null }

export function RespondentRow({ r, status }: { r: Respondent; status?: EmailStatusRow }) {
  const router = useRouter()
  const open = () => router.push(`/admin/respondents/${r.id}`)

  return (
    <tr
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open()
      }}
      tabIndex={0}
      className="cursor-pointer border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.03] focus:bg-black/[0.03] focus:outline-none"
    >
      <td className="px-4 py-3 font-medium">{r.first_name}</td>
      <td className="px-4 py-3 text-brand-muted">{r.email}</td>
      <td className="px-4 py-3 text-brand-muted">{r.phone || '—'}</td>
      <td className="px-4 py-3">{r.score} / 80</td>
      <td className="px-4 py-3">
        <RangeBadge range={r.score_range as ScoreRange} />
      </td>
      <td className="px-4 py-3 text-brand-muted">{formatDate(r.submitted_at)}</td>
      <td className="px-4 py-3 text-brand-muted">{emailStatus(status)}</td>
    </tr>
  )
}
