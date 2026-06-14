import { createHmac, timingSafeEqual } from 'node:crypto'

// HMAC key: a dedicated secret if set, otherwise the service-role key (always
// present server-side) so no new env var is required.
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function signUnsubscribeToken(email: string): string {
  return createHmac('sha256', secret()).update(email).digest('base64url')
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(signUnsubscribeToken(email))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function buildUnsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/unsubscribe?e=${encodeURIComponent(email)}&t=${signUnsubscribeToken(email)}`
}
