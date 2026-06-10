'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import type { AudienceCounts } from '@/lib/audience'

// Loads consented-contact counts (total + per band) for the audience selector.
export function useAudienceCounts() {
  const [counts, setCounts] = useState<AudienceCounts | null>(null)

  useEffect(() => {
    const supabase = createClient()
    fetchAudienceCounts(supabase).then(setCounts)
  }, [])

  return counts
}
