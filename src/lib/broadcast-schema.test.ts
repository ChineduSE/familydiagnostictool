import { describe, it, expect } from 'vitest'
import { draftBroadcastSchema } from '@/lib/broadcast-schema'

describe('draftBroadcastSchema', () => {
  it('accepts a minimal draft (subject + audience only)', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'Hello parents',
      audienceType: 'all',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty subject', () => {
    const result = draftBroadcastSchema.safeParse({ subject: '', audienceType: 'all' })
    expect(result.success).toBe(false)
  })

  it('accepts an empty cta url', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'x',
      audienceType: 'all',
      ctaUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid cta url', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'x',
      audienceType: 'all',
      ctaUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})
