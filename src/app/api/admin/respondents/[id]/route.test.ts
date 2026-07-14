import { describe, it, expect, vi } from 'vitest'

// Mock the request-scoped Supabase client so requireActiveAdmin sees no user.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}))

import { DELETE } from '@/app/api/admin/respondents/[id]/route'

describe('DELETE /api/admin/respondents/[id]', () => {
  it('returns 401 when the caller is not an authenticated admin', async () => {
    const res = await DELETE(
      new Request('http://localhost/api/admin/respondents/abc', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'abc' }) }
    )
    expect(res.status).toBe(401)
  })
})
