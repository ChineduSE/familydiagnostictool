import { describe, it, expect, beforeAll } from 'vitest'
import { signUnsubscribeToken, verifyUnsubscribeToken, buildUnsubscribeUrl } from '@/lib/unsubscribe-token'

beforeAll(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
})

describe('unsubscribe token', () => {
  it('verifies a token it signed', () => {
    const t = signUnsubscribeToken('a@x.com')
    expect(verifyUnsubscribeToken('a@x.com', t)).toBe(true)
  })

  it('rejects a tampered token', () => {
    const t = signUnsubscribeToken('a@x.com')
    expect(verifyUnsubscribeToken('a@x.com', `${t}x`)).toBe(false)
  })

  it('rejects a token signed for a different email', () => {
    const t = signUnsubscribeToken('a@x.com')
    expect(verifyUnsubscribeToken('b@x.com', t)).toBe(false)
  })

  it('builds a url with the email and token as query params', () => {
    const url = buildUnsubscribeUrl('a@x.com')
    expect(url).toContain('https://example.com/unsubscribe?e=a%40x.com&t=')
  })
})
