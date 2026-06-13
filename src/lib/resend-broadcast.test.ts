/* eslint-disable @typescript-eslint/no-explicit-any -- intentionally loose test doubles for the Supabase/Resend clients */
import { describe, it, expect, vi } from 'vitest'
import { sendBroadcastNow, sendTestToSelf } from '@/lib/resend-broadcast'

const draft = {
  id: 'b1',
  subject: 'Hi [First name]',
  body_html: '<p>Hello [First name]</p>',
  cta_label: null,
  cta_url: null,
  include_logo: false,
  audience_type: 'all',
  status: 'draft',
  resend_broadcast_id: null,
} as any

function fakeResend() {
  return {
    broadcasts: { create: vi.fn(async () => ({ data: { id: 'bc_1' }, error: null })) },
    emails: { send: vi.fn(async () => ({ data: { id: 'em_1' }, error: null })) },
  } as any
}

describe('sendBroadcastNow', () => {
  it('creates+sends with merge tags and persists the broadcast id and sent status', async () => {
    const resend = fakeResend()
    const updates: any[] = []
    const supabase = {
      from: () => ({ update: (p: any) => { updates.push(p); return { eq: async () => ({ error: null }) } } }),
    } as any

    const result = await sendBroadcastNow({
      supabase,
      resend,
      broadcast: draft,
      target: { audienceId: 'aud_1' },
      from: 'X <hello@d.com>',
      replyTo: 'reply@d.com',
    })

    expect(result.ok).toBe(true)
    const arg = resend.broadcasts.create.mock.calls[0][0]
    expect(arg.audienceId).toBe('aud_1')
    expect(arg.from).toBe('X <hello@d.com>')
    expect(arg.replyTo).toBe('reply@d.com')
    expect(arg.subject).toBe('Hi {{{contact.first_name|there}}}')
    expect(arg.html).toContain('{{{contact.first_name|there}}}')
    expect(arg.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(arg.send).toBe(true)
    expect(updates[0]).toMatchObject({ resend_broadcast_id: 'bc_1', status: 'sent' })
  })

  it('refuses to resend an already-sent broadcast', async () => {
    const resend = fakeResend()
    const supabase = { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) } as any
    const result = await sendBroadcastNow({
      supabase,
      resend,
      broadcast: { ...draft, status: 'sent', resend_broadcast_id: 'bc_old' },
      target: { audienceId: 'aud_1' },
      from: 'X <hello@d.com>',
    })
    expect(result.ok).toBe(false)
    expect(resend.broadcasts.create).not.toHaveBeenCalled()
  })
})

describe('sendTestToSelf', () => {
  it('sends a transactional email with a literal sample name', async () => {
    const resend = fakeResend()
    await sendTestToSelf({ resend, broadcast: draft, to: 'me@d.com', from: 'X <hello@d.com>' })
    const arg = resend.emails.send.mock.calls[0][0]
    expect(arg.to).toBe('me@d.com')
    expect(arg.subject).toBe('[TEST] Hi there')
    expect(arg.html).toContain('Hello there')
    expect(arg.html).not.toContain('{{{')
  })
})
