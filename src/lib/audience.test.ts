import { describe, it, expect } from 'vitest'
import { AUDIENCE_OPTIONS, recipientCountFor, type AudienceCounts } from '@/lib/audience'

const counts: AudienceCounts = { all: 100, at_risk: 20, under_strain: 50, strong: 30 }

describe('AUDIENCE_OPTIONS', () => {
  it('offers exactly all + the three bands (no individuals)', () => {
    expect(AUDIENCE_OPTIONS.map((o) => o.value)).toEqual([
      'all',
      'at_risk',
      'under_strain',
      'strong',
    ])
  })
})

describe('recipientCountFor', () => {
  it('returns the matching count for each audience', () => {
    expect(recipientCountFor('all', counts)).toBe(100)
    expect(recipientCountFor('at_risk', counts)).toBe(20)
    expect(recipientCountFor('under_strain', counts)).toBe(50)
    expect(recipientCountFor('strong', counts)).toBe(30)
  })
})
