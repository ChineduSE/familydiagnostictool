import { describe, it, expect } from 'vitest'
import { signBookingToken, verifyBookingToken, buildBookingUrl } from '@/lib/booking-token'

describe('booking-token', () => {
  it('verifies a token it signed', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('abc-123', t)).toBe(true)
  })
  it('rejects a token for a different id', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('xyz-999', t)).toBe(false)
  })
  it('rejects a tampered token', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('abc-123', `${t}x`)).toBe(false)
  })
  it('builds a url carrying the id and token', () => {
    expect(buildBookingUrl('abc-123')).toContain('/book?a=abc-123&t=')
  })
})
