'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const RANGES = [
  { key: 'all', label: 'All' },
  { key: 'at_risk', label: 'At risk' },
  { key: 'under_strain', label: 'Under strain' },
  { key: 'strong', label: 'Strong' },
]

const SORTS = [
  { key: 'date_desc', label: 'Newest first' },
  { key: 'date_asc', label: 'Oldest first' },
  { key: 'score_desc', label: 'Score: high to low' },
  { key: 'score_asc', label: 'Score: low to high' },
]

const SUPPORT = [
  { key: 'all', label: 'Everyone' },
  { key: 'yes', label: 'Wants support' },
  { key: 'no', label: 'Not right now' },
]

export function RespondentsControls({
  range,
  sort,
  support,
}: {
  range: string
  sort: string
  support: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`/admin/respondents?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setParam('range', r.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              range === r.key
                ? 'bg-brand-black text-brand-white'
                : 'bg-black/5 text-brand-muted hover:bg-black/10'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {SUPPORT.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setParam('support', s.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              support === s.key
                ? 'bg-brand-black text-brand-white'
                : 'bg-black/5 text-brand-muted hover:bg-black/10'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <select
        value={sort}
        onChange={(event) => setParam('sort', event.target.value)}
        className="ml-auto rounded-md border border-black/15 bg-brand-white px-3 py-1.5 text-xs"
      >
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
