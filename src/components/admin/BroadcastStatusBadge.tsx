import { BROADCAST_STATUS_BADGE, broadcastStatusLabel } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import type { BroadcastStatus } from '@/types'

export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        BROADCAST_STATUS_BADGE[status]
      )}
    >
      {broadcastStatusLabel(status)}
    </span>
  )
}
