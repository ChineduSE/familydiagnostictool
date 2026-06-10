// Audience selection helpers for broadcasts. The four offered audiences are the
// consented-contact total plus each score band. "individuals" is deprioritized
// and not offered (see locked product decisions).

export type BroadcastAudience = 'all' | 'at_risk' | 'under_strain' | 'strong'

export type AudienceCounts = {
  all: number
  at_risk: number
  under_strain: number
  strong: number
}

export const AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: 'all', label: 'All respondents' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'under_strain', label: 'Under strain' },
  { value: 'strong', label: 'Strong' },
]

export function recipientCountFor(audience: BroadcastAudience, counts: AudienceCounts): number {
  return counts[audience]
}
