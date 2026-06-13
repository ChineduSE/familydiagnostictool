import { describe, it, expect } from 'vitest'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'

const settings = {
  resend_audience_id: 'aud_1',
  segment_at_risk_id: 'seg_risk',
  segment_under_strain_id: 'seg_strain',
  segment_strong_id: 'seg_strong',
}

describe('resolveBroadcastTarget', () => {
  it('maps "all" to the whole audience', () => {
    expect(resolveBroadcastTarget('all', settings)).toEqual({ ok: true, target: { audienceId: 'aud_1' } })
  })

  it('maps a band to its segment', () => {
    expect(resolveBroadcastTarget('at_risk', settings)).toEqual({ ok: true, target: { segmentId: 'seg_risk' } })
    expect(resolveBroadcastTarget('under_strain', settings)).toEqual({ ok: true, target: { segmentId: 'seg_strain' } })
    expect(resolveBroadcastTarget('strong', settings)).toEqual({ ok: true, target: { segmentId: 'seg_strong' } })
  })

  it('errors when the audience id is missing', () => {
    const result = resolveBroadcastTarget('all', { ...settings, resend_audience_id: null })
    expect(result.ok).toBe(false)
  })

  it('errors when a band segment id is missing', () => {
    const result = resolveBroadcastTarget('at_risk', { ...settings, segment_at_risk_id: null })
    expect(result.ok).toBe(false)
  })
})
