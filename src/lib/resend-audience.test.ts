/* eslint-disable @typescript-eslint/no-explicit-any -- intentionally loose test doubles for the Supabase/Resend clients */
import { describe, it, expect, vi } from 'vitest'
import { syncConsentedContacts } from '@/lib/resend-audience'

// Minimal fake Supabase + Resend that record the calls we care about.
function fakeSupabase(contacts: any[], audienceId: string | null) {
  const updates: any[] = []
  const settingsUpdates: any[] = []
  return {
    updates,
    settingsUpdates,
    from(table: string) {
      if (table === 'settings') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { resend_audience_id: audienceId } }) }) }),
          update: (patch: any) => {
            settingsUpdates.push(patch)
            return { eq: async () => ({ error: null }) }
          },
        }
      }
      // contacts
      return {
        select: () => ({
          is: () => ({ then: undefined, data: contacts, error: null }),
        }),
        update: (patch: any) => {
          updates.push(patch)
          return { eq: async () => ({ error: null }) }
        },
      }
    },
  } as any
}

function fakeResend() {
  return {
    audiences: { create: vi.fn(async () => ({ data: { id: 'aud_new' }, error: null })) },
    contacts: {
      create: vi.fn(async () => ({ data: { id: 'c_new' }, error: null })),
      update: vi.fn(async () => ({ data: { id: 'c_upd' }, error: null })),
    },
  } as any
}

describe('syncConsentedContacts', () => {
  it('creates the audience when none is configured and saves its id', async () => {
    const supabase = fakeSupabase([], null)
    const resend = fakeResend()
    await syncConsentedContacts(supabase, resend)
    expect(resend.audiences.create).toHaveBeenCalledOnce()
    expect(supabase.settingsUpdates[0]).toMatchObject({ resend_audience_id: 'aud_new' })
  })

  it('creates a Resend contact for an unsynced row and stores the id', async () => {
    const contacts = [
      { id: 'r1', email: 'a@x.com', first_name: 'Ada', latest_score_range: 'at_risk', resend_contact_id: null, unsubscribed_at: null },
    ]
    const supabase = fakeSupabase(contacts, 'aud_1')
    const resend = fakeResend()
    await syncConsentedContacts(supabase, resend)
    expect(resend.contacts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceId: 'aud_1',
        email: 'a@x.com',
        firstName: 'Ada',
        unsubscribed: false,
        properties: { score_band: 'at_risk' },
      })
    )
    expect(supabase.updates[0]).toMatchObject({ resend_contact_id: 'c_new' })
  })

  it('updates an already-synced contact instead of recreating', async () => {
    const contacts = [
      { id: 'r2', email: 'b@x.com', first_name: 'Bo', latest_score_range: 'strong', resend_contact_id: 'c_existing', unsubscribed_at: null },
    ]
    const supabase = fakeSupabase(contacts, 'aud_1')
    const resend = fakeResend()
    await syncConsentedContacts(supabase, resend)
    expect(resend.contacts.update).toHaveBeenCalledWith(
      expect.objectContaining({ audienceId: 'aud_1', id: 'c_existing', properties: { score_band: 'strong' } })
    )
    expect(resend.contacts.create).not.toHaveBeenCalled()
  })

  it('counts a failed contact without aborting the rest of the sync', async () => {
    const contacts = [
      { id: 'bad', email: 'bad@x.com', first_name: 'Bad', latest_score_range: 'at_risk', resend_contact_id: null, unsubscribed_at: null },
      { id: 'good', email: 'good@x.com', first_name: 'Good', latest_score_range: 'strong', resend_contact_id: 'c_ok', unsubscribed_at: null },
    ]
    const supabase = fakeSupabase(contacts, 'aud_1')
    const resend = fakeResend()
    resend.contacts.create.mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await syncConsentedContacts(supabase, resend)

    expect(result).toEqual({ synced: 1, failed: 1 })
    expect(resend.contacts.update).toHaveBeenCalledOnce() // the good one still ran
  })
})
