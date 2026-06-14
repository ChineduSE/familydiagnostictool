/* eslint-disable @typescript-eslint/no-explicit-any -- intentionally loose test doubles */
import { describe, it, expect, vi } from 'vitest'
import { unsubscribeContact } from '@/lib/unsubscribe-contact'

function fakeSupabase({ resendContactId = null as string | null, audienceId = null as string | null } = {}) {
  const dbUpdates: any[] = []
  return {
    dbUpdates,
    from(table: string) {
      if (table === 'settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { resend_audience_id: audienceId } }) }) }) }
      }
      return {
        update(patch: any) {
          return { eq: () => ({ is: async () => { dbUpdates.push(patch); return { error: null } } }) }
        },
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { resend_contact_id: resendContactId } }) }) }),
      }
    },
  } as any
}

describe('unsubscribeContact', () => {
  it('marks the contact unsubscribed in the database', async () => {
    const supabase = fakeSupabase()
    const resend = { contacts: { update: vi.fn() } } as any
    await unsubscribeContact(supabase, resend, 'a@x.com')
    expect(supabase.dbUpdates[0]).toHaveProperty('unsubscribed_at')
  })

  it('also marks unsubscribed in Resend when the contact is already synced', async () => {
    const supabase = fakeSupabase({ resendContactId: 'c1', audienceId: 'aud1' })
    const resend = { contacts: { update: vi.fn(async () => ({ data: {}, error: null })) } } as any
    await unsubscribeContact(supabase, resend, 'a@x.com')
    expect(resend.contacts.update).toHaveBeenCalledWith(
      expect.objectContaining({ audienceId: 'aud1', id: 'c1', unsubscribed: true })
    )
  })

  it('skips Resend when the contact has not been synced yet', async () => {
    const supabase = fakeSupabase({ resendContactId: null })
    const resend = { contacts: { update: vi.fn() } } as any
    await unsubscribeContact(supabase, resend, 'a@x.com')
    expect(resend.contacts.update).not.toHaveBeenCalled()
  })
})
