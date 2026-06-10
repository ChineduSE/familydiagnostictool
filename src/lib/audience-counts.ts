import type { SupabaseClient } from '@supabase/supabase-js'
import type { AudienceCounts, BroadcastAudience } from '@/lib/audience'

// Counts marketing-consented, non-unsubscribed contacts overall and per band.
// Works with either the browser or server Supabase client. Uses head:true count
// queries so no rows are transferred.
export async function fetchAudienceCounts(supabase: SupabaseClient): Promise<AudienceCounts> {
  const base = () =>
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

  const band = (b: Exclude<BroadcastAudience, 'all'>) => base().eq('latest_score_range', b)

  const [all, atRisk, underStrain, strong] = await Promise.all([
    base(),
    band('at_risk'),
    band('under_strain'),
    band('strong'),
  ])

  return {
    all: all.count ?? 0,
    at_risk: atRisk.count ?? 0,
    under_strain: underStrain.count ?? 0,
    strong: strong.count ?? 0,
  }
}
