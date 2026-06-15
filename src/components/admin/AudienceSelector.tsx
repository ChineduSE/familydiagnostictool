'use client'

import { AUDIENCE_OPTIONS, BANDS_ENABLED, recipientCountFor, type BroadcastAudience, type AudienceCounts } from '@/lib/audience'
import { cn } from '@/lib/utils'

type AudienceSelectorProps = {
  value: BroadcastAudience
  onChange: (audience: BroadcastAudience) => void
  counts: AudienceCounts | null
}

export function AudienceSelector({ value, onChange, counts }: AudienceSelectorProps) {
  const options = BANDS_ENABLED ? AUDIENCE_OPTIONS : AUDIENCE_OPTIONS.filter((o) => o.value === 'all')

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value
        const count = counts ? recipientCountFor(option.value, counts) : null
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
              selected ? 'border-brand-gold bg-brand-gold/10' : 'border-black/15 hover:bg-black/5'
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-brand-muted">
              {count === null ? '…' : `${count} recipient${count === 1 ? '' : 's'}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}
