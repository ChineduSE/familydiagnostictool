import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/book/route'

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/book guards', () => {
  it('rejects a malformed body with 400', async () => {
    const res = await post({ nope: true })
    expect(res.status).toBe(400)
  })
  it('rejects an invalid token with 400', async () => {
    const res = await post({ assessmentId: 'abc-123', token: 'not-a-valid-token' })
    expect(res.status).toBe(400)
  })
})
