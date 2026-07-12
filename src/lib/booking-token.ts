import { createHmac, timingSafeEqual } from 'node:crypto'

// HMAC key: a dedicated secret if set, otherwise the service-role key (always
// present server-side), mirroring unsubscribe-token so no new env var is needed.
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function signBookingToken(assessmentId: string): string {
  return createHmac('sha256', secret()).update(`book:${assessmentId}`).digest('base64url')
}

export function verifyBookingToken(assessmentId: string, token: string): boolean {
  const expected = Buffer.from(signBookingToken(assessmentId))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function buildBookingUrl(assessmentId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/book?a=${encodeURIComponent(assessmentId)}&t=${signBookingToken(assessmentId)}`
}
