import { SCORE_LABELS } from '@/lib/questions'
import { RANGE_BADGE } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import type { ScoreRange } from '@/types'

export function RangeBadge({ range }: { range: ScoreRange }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        RANGE_BADGE[range]
      )}
    >
      {SCORE_LABELS[range]}
    </span>
  )
}
