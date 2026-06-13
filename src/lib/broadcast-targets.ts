import type { BroadcastAudience } from '@/lib/audience'

// The subset of settings needed to resolve a send target.
export type TargetSettings = {
  resend_audience_id: string | null
  segment_at_risk_id: string | null
  segment_under_strain_id: string | null
  segment_strong_id: string | null
}

// Either the whole audience (for "all") or a single segment (for a band).
export type ResendTarget = { audienceId: string } | { segmentId: string }

export type ResolveResult =
  | { ok: true; target: ResendTarget }
  | { ok: false; error: string }

const BAND_SEGMENT_KEY: Record<
  Exclude<BroadcastAudience, 'all'>,
  keyof TargetSettings
> = {
  at_risk: 'segment_at_risk_id',
  under_strain: 'segment_under_strain_id',
  strong: 'segment_strong_id',
}

export function resolveBroadcastTarget(
  audience: BroadcastAudience,
  settings: TargetSettings
): ResolveResult {
  if (audience === 'all') {
    if (!settings.resend_audience_id) {
      return { ok: false, error: 'No Resend audience configured yet. Save a draft and sync, or set it in Settings.' }
    }
    return { ok: true, target: { audienceId: settings.resend_audience_id } }
  }

  const segmentId = settings[BAND_SEGMENT_KEY[audience]]
  if (!segmentId) {
    return { ok: false, error: `No Resend segment configured for "${audience}". Add it in Settings.` }
  }
  return { ok: true, target: { segmentId } }
}
