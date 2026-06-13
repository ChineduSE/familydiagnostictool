# Broadcast Send Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin press "Send now" on a saved broadcast draft and have Resend deliver it to all consented parents or one score band, with first-name personalization and an unsubscribe link.

**Architecture:** Pure helpers (merge-token conversion, target resolution) are unit-tested in isolation. Two Resend I/O modules (audience sync, broadcast send) take injected `supabase` + `resend` clients so they test against a mock. Admin-only API routes (with their own auth guard, since middleware doesn't cover `/api/*`) drive a confirm page. Send/Schedule scheduling and open/click tracking are out of scope.

**Tech Stack:** Next.js 16 (App Router, route handlers), React 19, TypeScript, Supabase (`@supabase/ssr` + service role), Resend (`resend@6.12.4`), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-13-broadcast-send-integration-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/005_broadcast_audience_settings.sql` — add audience/segment id columns to `settings`.
- `src/lib/broadcast-merge.ts` (+ `.test.ts`) — pure `[First name]` → Resend merge tag, and sample substitution.
- `src/lib/broadcast-targets.ts` (+ `.test.ts`) — pure: resolve a `BroadcastAudience` to a Resend `{ audienceId } | { segmentId }` from settings, or a typed error.
- `src/lib/require-admin.ts` — server guard returning the admin user or a 401 `Response`.
- `src/lib/resend-audience.ts` (+ `.test.ts`) — `ensureAudience`, `syncConsentedContacts` (mock-tested).
- `src/lib/resend-broadcast.ts` (+ `.test.ts`) — `sendBroadcastNow`, `sendTestToSelf` (mock-tested).
- `src/app/api/admin/broadcasts/[id]/send/route.ts` — POST: real send.
- `src/app/api/admin/broadcasts/[id]/test-send/route.ts` — POST: test send to the admin.
- `src/app/admin/(panel)/broadcasts/[id]/confirm/page.tsx` — confirm screen (server).
- `src/components/admin/BroadcastConfirmActions.tsx` — client buttons (test-send + send).
- `src/components/admin/BroadcastDetail.tsx` — read-only view for sent broadcasts.

**Modify:**
- `src/types/index.ts` — extend `Settings` with the new columns.
- `src/app/admin/(panel)/broadcasts/[id]/page.tsx` — render `BroadcastDetail` when status ≠ draft.
- `src/components/admin/BroadcastComposer.tsx` — enable "Send now" (navigates to confirm).
- `src/app/admin/(panel)/settings/page.tsx` — fields to paste the audience id + 3 segment ids.

---

## Task 1: Settings migration + type for audience/segment ids

**Files:**
- Create: `supabase/migrations/005_broadcast_audience_settings.sql`
- Modify: `src/types/index.ts` (the `Settings` type, lines 96-102)

> **DB change — flag to the user before applying.** Per the Supabase workflow, do NOT apply the migration silently; the code reads the columns as null until the operator applies it and pastes ids in Settings.

- [ ] **Step 1: Write the migration**

`supabase/migrations/005_broadcast_audience_settings.sql`:
```sql
-- Resend audience + per-band segment ids for broadcast sending.
-- The audience id is auto-filled on first contact sync; the 3 segment ids are
-- created once in the Resend dashboard and pasted into the admin Settings page.
alter table public.settings
  add column if not exists resend_audience_id text,
  add column if not exists segment_at_risk_id text,
  add column if not exists segment_under_strain_id text,
  add column if not exists segment_strong_id text;
```

- [ ] **Step 2: Extend the `Settings` type**

In `src/types/index.ts`, replace the `Settings` type body:
```ts
export type Settings = {
  id: number
  whatsapp_cta_url: string | null
  logo_url: string | null
  logo_storage_path: string | null
  resend_audience_id: string | null
  segment_at_risk_id: string | null
  segment_under_strain_id: string | null
  segment_strong_id: string | null
  updated_at: string
}
```

- [ ] **Step 3: Verify type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_broadcast_audience_settings.sql src/types/index.ts
git commit -m "feat: add resend audience + segment id settings columns"
```

---

## Task 2: `broadcast-merge.ts` (pure) — TDD

Converts the human `[First name]` token into Resend's broadcast merge tag for real
sends, and into a literal sample for test sends (transactional sends don't merge).

**Files:**
- Create: `src/lib/broadcast-merge.ts`
- Test: `src/lib/broadcast-merge.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/broadcast-merge.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toResendMergeFields, toSampleText } from '@/lib/broadcast-merge'

describe('toResendMergeFields', () => {
  it('replaces [First name] with the Resend merge tag', () => {
    expect(toResendMergeFields('Hi [First name],')).toBe('Hi {{{contact.first_name|there}}},')
  })

  it('replaces every occurrence', () => {
    expect(toResendMergeFields('[First name] [First name]')).toBe(
      '{{{contact.first_name|there}}} {{{contact.first_name|there}}}'
    )
  })

  it('leaves text without the token untouched', () => {
    expect(toResendMergeFields('Hello parents')).toBe('Hello parents')
  })
})

describe('toSampleText', () => {
  it('substitutes a literal sample name for previews/tests', () => {
    expect(toSampleText('Hi [First name],', 'Ada')).toBe('Hi Ada,')
  })

  it('falls back to "there" when no name is given', () => {
    expect(toSampleText('Hi [First name],', '')).toBe('Hi there,')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/broadcast-merge.test.ts`
Expected: FAIL — cannot resolve `@/lib/broadcast-merge`.

- [ ] **Step 3: Write the implementation**

`src/lib/broadcast-merge.ts`:
```ts
// Personalization token handling for broadcasts. The human-facing token is
// "[First name]". For real broadcast sends it becomes Resend's merge tag (which
// Resend substitutes per contact). For test/preview sends, which go through the
// transactional API and do NOT merge, it becomes a literal sample name.

const TOKEN = /\[First name\]/g
const RESEND_FIRST_NAME = '{{{contact.first_name|there}}}'

export function toResendMergeFields(text: string): string {
  return text.replace(TOKEN, RESEND_FIRST_NAME)
}

export function toSampleText(text: string, name: string): string {
  return text.replace(TOKEN, name.trim() || 'there')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/broadcast-merge.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/broadcast-merge.ts src/lib/broadcast-merge.test.ts
git commit -m "feat: add broadcast personalization token conversion with tests"
```

---

## Task 3: `broadcast-targets.ts` (pure) — TDD

Resolves which Resend target an audience selection maps to: "all" → the audience,
a band → its segment. Returns a typed error when the needed id isn't configured,
so the confirm screen can tell the operator to set it in Settings.

**Files:**
- Create: `src/lib/broadcast-targets.ts`
- Test: `src/lib/broadcast-targets.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/broadcast-targets.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'

const settings = {
  resend_audience_id: 'aud_1',
  segment_at_risk_id: 'seg_risk',
  segment_under_strain_id: 'seg_strain',
  segment_strong_id: 'seg_strong',
}

describe('resolveBroadcastTarget', () => {
  it('maps "all" to the whole audience', () => {
    expect(resolveBroadcastTarget('all', settings)).toEqual({ ok: true, target: { audienceId: 'aud_1' } })
  })

  it('maps a band to its segment', () => {
    expect(resolveBroadcastTarget('at_risk', settings)).toEqual({ ok: true, target: { segmentId: 'seg_risk' } })
    expect(resolveBroadcastTarget('under_strain', settings)).toEqual({ ok: true, target: { segmentId: 'seg_strain' } })
    expect(resolveBroadcastTarget('strong', settings)).toEqual({ ok: true, target: { segmentId: 'seg_strong' } })
  })

  it('errors when the audience id is missing', () => {
    const result = resolveBroadcastTarget('all', { ...settings, resend_audience_id: null })
    expect(result.ok).toBe(false)
  })

  it('errors when a band segment id is missing', () => {
    const result = resolveBroadcastTarget('at_risk', { ...settings, segment_at_risk_id: null })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/broadcast-targets.test.ts`
Expected: FAIL — cannot resolve `@/lib/broadcast-targets`.

- [ ] **Step 3: Write the implementation**

`src/lib/broadcast-targets.ts`:
```ts
import type { BroadcastAudience } from '@/lib/audience'

// The subset of settings needed to resolve a send target.
export type TargetSettings = {
  resend_audience_id: string | null
  segment_at_risk_id: string | null
  segment_under_strain_id: string | null
  segment_strong_id: string | null
}

// Either the whole audience (for "all") or a single segment (for a band).
export type ResendTarget = { audienceId: string } | { segmentId: string }

export type ResolveResult =
  | { ok: true; target: ResendTarget }
  | { ok: false; error: string }

const BAND_SEGMENT_KEY: Record<
  Exclude<BroadcastAudience, 'all'>,
  keyof TargetSettings
> = {
  at_risk: 'segment_at_risk_id',
  under_strain: 'segment_under_strain_id',
  strong: 'segment_strong_id',
}

export function resolveBroadcastTarget(
  audience: BroadcastAudience,
  settings: TargetSettings
): ResolveResult {
  if (audience === 'all') {
    if (!settings.resend_audience_id) {
      return { ok: false, error: 'No Resend audience configured yet. Save a draft and sync, or set it in Settings.' }
    }
    return { ok: true, target: { audienceId: settings.resend_audience_id } }
  }

  const segmentId = settings[BAND_SEGMENT_KEY[audience]]
  if (!segmentId) {
    return { ok: false, error: `No Resend segment configured for "${audience}". Add it in Settings.` }
  }
  return { ok: true, target: { segmentId } }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/broadcast-targets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/broadcast-targets.ts src/lib/broadcast-targets.test.ts
git commit -m "feat: add broadcast target resolution with tests"
```

---

## Task 4: `require-admin.ts` server guard

The send routes live under `/api/*`, which the admin middleware does NOT match.
Each route must verify the caller is an active admin itself.

**Files:**
- Create: `src/lib/require-admin.ts`

- [ ] **Step 1: Write the guard**

`src/lib/require-admin.ts`:
```ts
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Verifies the request comes from a signed-in active admin. Returns the user on
// success, or a 401 NextResponse to return directly from the route. Mirrors the
// check in middleware.ts (which only covers /admin/*, not /api/*).
export async function requireActiveAdmin(): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true, user }
}
```

- [ ] **Step 2: Verify type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/require-admin.ts
git commit -m "feat: add active-admin guard for api routes"
```

---

## Task 5: `resend-audience.ts` (sync) — TDD with a mocked Resend

Ensures a Resend audience exists (creating it once and saving its id) and upserts
every consented, non-unsubscribed contact into it with a `score_band` property and
first name, storing each `resend_contact_id` back on the row.

**Files:**
- Create: `src/lib/resend-audience.ts`
- Test: `src/lib/resend-audience.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/resend-audience.test.ts`:
```ts
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
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/resend-audience.test.ts`
Expected: FAIL — cannot resolve `@/lib/resend-audience`.

- [ ] **Step 3: Write the implementation**

`src/lib/resend-audience.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'

// Ensures a Resend audience exists, returning its id. Creates one (named for the
// project) and persists the id to settings the first time.
export async function ensureAudience(
  supabase: SupabaseClient,
  resend: Resend
): Promise<string> {
  const { data: settings } = await supabase
    .from('settings')
    .select('resend_audience_id')
    .eq('id', 1)
    .maybeSingle()

  if (settings?.resend_audience_id) return settings.resend_audience_id

  const { data, error } = await resend.audiences.create({ name: 'Family Connection parents' })
  if (error || !data) throw new Error(error?.message ?? 'Failed to create Resend audience')

  await supabase.from('settings').update({ resend_audience_id: data.id }).eq('id', 1)
  return data.id
}

export type SyncResult = { synced: number; failed: number }

// Upserts every non-unsubscribed contact into the Resend audience with their
// first name and current score band, storing resend_contact_id back. Idempotent.
export async function syncConsentedContacts(
  supabase: SupabaseClient,
  resend: Resend
): Promise<SyncResult> {
  const audienceId = await ensureAudience(supabase, resend)

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, email, first_name, latest_score_range, resend_contact_id, unsubscribed_at')
    .is('unsubscribed_at', null)

  if (error || !contacts) throw new Error(error?.message ?? 'Failed to load contacts')

  let synced = 0
  let failed = 0

  for (const contact of contacts) {
    const properties = { score_band: contact.latest_score_range ?? '' }
    try {
      if (contact.resend_contact_id) {
        await resend.contacts.update({
          audienceId,
          id: contact.resend_contact_id,
          firstName: contact.first_name ?? undefined,
          unsubscribed: false,
          properties,
        })
      } else {
        const { data, error: createError } = await resend.contacts.create({
          audienceId,
          email: contact.email,
          firstName: contact.first_name ?? undefined,
          unsubscribed: false,
          properties,
        })
        if (createError || !data) throw new Error(createError?.message ?? 'create failed')
        await supabase.from('contacts').update({ resend_contact_id: data.id }).eq('id', contact.id)
      }
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/resend-audience.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/resend-audience.ts src/lib/resend-audience.test.ts
git commit -m "feat: add Resend audience sync with tests"
```

---

## Task 6: `resend-broadcast.ts` (send) — TDD with a mocked Resend

Assembles the final HTML (logo + body + CTA via `buildBroadcastHtml`, with merge
tags and an unsubscribe footer), creates + sends the broadcast in one call, and
persists the result. Refuses to re-send an already-sent broadcast. Also a
test-send to a single address using literal sample substitution.

**Files:**
- Create: `src/lib/resend-broadcast.ts`
- Test: `src/lib/resend-broadcast.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/resend-broadcast.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/resend-broadcast.test.ts`
Expected: FAIL — cannot resolve `@/lib/resend-broadcast`.

- [ ] **Step 3: Write the implementation**

`src/lib/resend-broadcast.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'
import type { Broadcast } from '@/types'
import type { ResendTarget } from '@/lib/broadcast-targets'
import { buildBroadcastHtml } from '@/lib/broadcast-html'
import { toResendMergeFields, toSampleText } from '@/lib/broadcast-merge'

const UNSUBSCRIBE_FOOTER =
  `<div style="margin-top:28px;font-size:12px;color:#9a948b;text-align:center;">` +
  `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9a948b;">Unsubscribe</a></div>`

type SendResult = { ok: true; broadcastId: string } | { ok: false; error: string }

type SendBroadcastArgs = {
  supabase: SupabaseClient
  resend: Resend
  broadcast: Broadcast
  target: ResendTarget
  from: string
  replyTo?: string
}

export async function sendBroadcastNow(args: SendBroadcastArgs): Promise<SendResult> {
  const { supabase, resend, broadcast, target, from, replyTo } = args

  if (broadcast.status === 'sent' || broadcast.resend_broadcast_id) {
    return { ok: false, error: 'This broadcast has already been sent.' }
  }

  const bodyHtml = toResendMergeFields(broadcast.body_html)
  const html =
    buildBroadcastHtml({
      bodyHtml,
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: broadcast.include_logo ? null : null, // logo injected server-side later if needed
    }) + UNSUBSCRIBE_FOOTER

  const { data, error } = await resend.broadcasts.create({
    ...target,
    from,
    replyTo,
    name: broadcast.subject,
    subject: toResendMergeFields(broadcast.subject),
    html,
    send: true,
  })

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to send broadcast' }

  await supabase
    .from('broadcasts')
    .update({
      resend_broadcast_id: data.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', broadcast.id)

  return { ok: true, broadcastId: data.id }
}

type TestSendArgs = { resend: Resend; broadcast: Broadcast; to: string; from: string; replyTo?: string }

export async function sendTestToSelf(args: TestSendArgs): Promise<SendResult> {
  const { resend, broadcast, to, from, replyTo } = args
  const html =
    buildBroadcastHtml({
      bodyHtml: toSampleText(broadcast.body_html, ''),
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: null,
    }) + '<div style="margin-top:28px;font-size:12px;color:#9a948b;text-align:center;">Unsubscribe (test)</div>'

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `[TEST] ${toSampleText(broadcast.subject, '')}`,
    html,
  })

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to send test' }
  return { ok: true, broadcastId: data.id }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/resend-broadcast.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/resend-broadcast.ts src/lib/resend-broadcast.test.ts
git commit -m "feat: add Resend broadcast send + test-send with tests"
```

---

## Task 7: Send + test-send API routes

Admin-guarded route handlers that load the draft + settings (service role), resolve
the target, sync the audience, and send (or test-send to the admin's own email).

**Files:**
- Create: `src/app/api/admin/broadcasts/[id]/send/route.ts`
- Create: `src/app/api/admin/broadcasts/[id]/test-send/route.ts`

- [ ] **Step 1: Write the send route**

`src/app/api/admin/broadcasts/[id]/send/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/resend'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'
import { syncConsentedContacts } from '@/lib/resend-audience'
import { sendBroadcastNow } from '@/lib/resend-broadcast'
import type { Broadcast, Settings } from '@/types'
import type { BroadcastAudience } from '@/lib/audience'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const resend = createResend()
  if (!resend) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

  const { data: broadcast } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })

  const resolved = resolveBroadcastTarget(
    (broadcast as Broadcast).audience_type as BroadcastAudience,
    settings as Settings
  )
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 })

  try {
    await syncConsentedContacts(supabase, resend)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Audience sync failed' },
      { status: 502 }
    )
  }

  const result = await sendBroadcastNow({
    supabase,
    resend,
    broadcast: broadcast as Broadcast,
    target: resolved.target,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, broadcastId: result.broadcastId })
}
```

- [ ] **Step 2: Write the test-send route**

`src/app/api/admin/broadcasts/[id]/test-send/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/resend'
import { sendTestToSelf } from '@/lib/resend-broadcast'
import type { Broadcast } from '@/types'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  if (!auth.user.email) return NextResponse.json({ error: 'Admin has no email' }, { status: 400 })

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const resend = createResend()
  if (!resend) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

  const { data: broadcast } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

  const result = await sendTestToSelf({
    resend,
    broadcast: broadcast as Broadcast,
    to: auth.user.email,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, sentTo: auth.user.email })
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/broadcasts/[id]/send/route.ts" "src/app/api/admin/broadcasts/[id]/test-send/route.ts"
git commit -m "feat: add admin-guarded broadcast send and test-send routes"
```

---

## Task 8: Confirm screen + client actions

**Files:**
- Create: `src/app/admin/(panel)/broadcasts/[id]/confirm/page.tsx`
- Create: `src/components/admin/BroadcastConfirmActions.tsx`

- [ ] **Step 1: Create the client actions component**

`src/components/admin/BroadcastConfirmActions.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { broadcastId: string; recipientCount: number; disabledReason?: string }

export function BroadcastConfirmActions({ broadcastId, recipientCount, disabledReason }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function call(path: string) {
    const res = await fetch(path, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data
  }

  async function onTest() {
    setMessage(null)
    setBusy('test')
    try {
      const data = await call(`/api/admin/broadcasts/${broadcastId}/test-send`)
      setMessage(`Test sent to ${data.sentTo}. Check your inbox.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setBusy(null)
    }
  }

  async function onSend() {
    if (!window.confirm(`Send this broadcast to ${recipientCount} parent(s)? This cannot be undone.`)) return
    setMessage(null)
    setBusy('send')
    try {
      await call(`/api/admin/broadcasts/${broadcastId}/send`)
      router.push(`/admin/broadcasts/${broadcastId}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {disabledReason && <p className="text-sm text-[#991b1b]">{disabledReason}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onTest} disabled={busy !== null}
          className="rounded-full border border-black/20 px-5 py-3 text-sm font-bold disabled:opacity-60">
          {busy === 'test' ? 'Sending test…' : 'Send a test to myself'}
        </button>
        <button type="button" onClick={onSend} disabled={busy !== null || !!disabledReason}
          className="btn-primary disabled:opacity-60">
          {busy === 'send' ? 'Sending…' : `Send to ${recipientCount} parent${recipientCount === 1 ? '' : 's'}`}
        </button>
      </div>
      {message && <p className="text-sm text-brand-muted">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create the confirm page**

`src/app/admin/(panel)/broadcasts/[id]/confirm/page.tsx`:
```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import { recipientCountFor, type BroadcastAudience } from '@/lib/audience'
import { resolveBroadcastTarget } from '@/lib/broadcast-targets'
import { EmailPreview } from '@/components/admin/EmailPreview'
import { BroadcastConfirmActions } from '@/components/admin/BroadcastConfirmActions'
import type { Broadcast, Settings } from '@/types'

export const dynamic = 'force-dynamic'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export default async function ConfirmBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast
  if (broadcast.status !== 'draft') redirect(`/admin/broadcasts/${id}`)

  const [{ data: settingsRow }, counts] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    fetchAudienceCounts(supabase),
  ])
  const settings = (settingsRow ?? {}) as Settings
  const audience = broadcast.audience_type as BroadcastAudience
  const recipientCount = recipientCountFor(audience, counts)
  const resolved = resolveBroadcastTarget(audience, settings)

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/broadcasts/${id}`} className="text-sm text-brand-muted underline">
        ← Back to draft
      </Link>
      <h1 className="mt-2 font-display text-[clamp(29px,5vw,40px)] leading-tight">Review &amp; send</h1>

      <dl className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-brand-white p-5 text-sm">
        <div className="flex justify-between"><dt className="text-brand-muted">Subject</dt><dd className="font-medium">{broadcast.subject}</dd></div>
        <div className="flex justify-between"><dt className="text-brand-muted">Audience</dt><dd className="font-medium">{AUDIENCE_LABELS[audience]}</dd></div>
        <div className="flex justify-between"><dt className="text-brand-muted">Recipients</dt><dd className="font-medium">{recipientCount}</dd></div>
      </dl>

      <div className="mt-6">
        <EmailPreview
          subject={broadcast.subject}
          bodyHtml={broadcast.body_html}
          ctaLabel={broadcast.cta_label ?? undefined}
          ctaUrl={broadcast.cta_url ?? undefined}
          logoUrl={settings.logo_url}
          includeLogo={broadcast.include_logo}
        />
      </div>

      <div className="mt-6">
        <BroadcastConfirmActions
          broadcastId={id}
          recipientCount={recipientCount}
          disabledReason={resolved.ok ? undefined : resolved.error}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(panel)/broadcasts/[id]/confirm/page.tsx" src/components/admin/BroadcastConfirmActions.tsx
git commit -m "feat: add broadcast confirm screen with test-send and send"
```

---

## Task 9: Read-only broadcast detail + `[id]` routing

When a broadcast is no longer a draft, the `[id]` page shows a read-only summary
instead of the composer.

**Files:**
- Create: `src/components/admin/BroadcastDetail.tsx`
- Modify: `src/app/admin/(panel)/broadcasts/[id]/page.tsx`

- [ ] **Step 1: Create the detail component**

`src/components/admin/BroadcastDetail.tsx`:
```tsx
import { formatDate } from '@/lib/admin-format'
import { BroadcastStatusBadge } from './BroadcastStatusBadge'
import { EmailPreview } from './EmailPreview'
import type { BroadcastAudience } from '@/lib/audience'
import type { Broadcast } from '@/types'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export function BroadcastDetail({ broadcast, logoUrl }: { broadcast: Broadcast; logoUrl: string | null }) {
  const audience = broadcast.audience_type as BroadcastAudience
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">{broadcast.subject}</h1>
        <BroadcastStatusBadge status={broadcast.status} />
      </div>
      <dl className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-brand-white p-5 text-sm">
        <div className="flex justify-between"><dt className="text-brand-muted">Audience</dt><dd className="font-medium">{AUDIENCE_LABELS[audience] ?? broadcast.audience_type}</dd></div>
        {broadcast.sent_at && (
          <div className="flex justify-between"><dt className="text-brand-muted">Sent</dt><dd className="font-medium">{formatDate(broadcast.sent_at)}</dd></div>
        )}
        {broadcast.resend_broadcast_id && (
          <div className="flex justify-between"><dt className="text-brand-muted">Resend id</dt><dd className="font-mono text-xs">{broadcast.resend_broadcast_id}</dd></div>
        )}
      </dl>
      <div className="mt-6">
        <EmailPreview
          subject={broadcast.subject}
          bodyHtml={broadcast.body_html}
          ctaLabel={broadcast.cta_label ?? undefined}
          ctaUrl={broadcast.cta_url ?? undefined}
          logoUrl={logoUrl}
          includeLogo={broadcast.include_logo}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Branch the `[id]` page on status**

Replace `src/app/admin/(panel)/broadcasts/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'
import { BroadcastDetail } from '@/components/admin/BroadcastDetail'
import type { Broadcast, Settings } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast

  if (broadcast.status !== 'draft') {
    const { data: settings } = await supabase.from('settings').select('logo_url').eq('id', 1).maybeSingle()
    return <BroadcastDetail broadcast={broadcast} logoUrl={(settings as Settings | null)?.logo_url ?? null} />
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Edit broadcast</h1>
      <div className="mt-6">
        <BroadcastComposer broadcast={broadcast} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BroadcastDetail.tsx "src/app/admin/(panel)/broadcasts/[id]/page.tsx"
git commit -m "feat: show read-only detail for sent broadcasts"
```

---

## Task 10: Enable "Send now" in the composer + segment-id Settings fields

**Files:**
- Modify: `src/components/admin/BroadcastComposer.tsx`
- Modify: `src/app/admin/(panel)/settings/page.tsx`

- [ ] **Step 1: Enable "Send now" in the composer**

In `src/components/admin/BroadcastComposer.tsx`, the composer already imports
`useRouter` as `router`. Replace the disabled "Send now" button:
```tsx
          <button
            type="button"
            disabled
            title="Live sending activates in Phase 7"
            className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
          >
            Send now
          </button>
```
with a button that requires the draft to be saved first (it only exists when
editing an existing `broadcast`), navigating to the confirm screen:
```tsx
          {broadcast ? (
            <button
              type="button"
              onClick={() => router.push(`/admin/broadcasts/${broadcast.id}/confirm`)}
              className="rounded-full border border-brand-black px-5 py-3 text-sm font-bold text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
            >
              Send now
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Save the draft first, then you can send it"
              className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
            >
              Send now
            </button>
          )}
```

- [ ] **Step 2: Update the helper line under the buttons**

In the same file, replace:
```tsx
        <p className="text-xs text-brand-muted">Live sending and scheduling activate in Phase 7.</p>
```
with:
```tsx
        <p className="text-xs text-brand-muted">
          Save your draft, then use “Send now” to review and send. Scheduling comes next.
        </p>
```

- [ ] **Step 3: Add segment-id fields to Settings**

In `src/app/admin/(panel)/settings/page.tsx`, the page already loads the settings
row and saves with an update. Add four controlled inputs bound to new state and
include them in the saved payload. Add near the existing fields:
```tsx
        <div className="grid gap-[7px]">
          <label className="text-sm font-bold" htmlFor="audienceId">Resend audience id</label>
          <input id="audienceId" className="field-input" value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)} placeholder="aud_… (auto-filled on first send)" />
        </div>
        <div className="grid gap-[7px]">
          <label className="text-sm font-bold" htmlFor="segRisk">Segment id — At risk</label>
          <input id="segRisk" className="field-input" value={segRisk} onChange={(e) => setSegRisk(e.target.value)} />
        </div>
        <div className="grid gap-[7px]">
          <label className="text-sm font-bold" htmlFor="segStrain">Segment id — Under strain</label>
          <input id="segStrain" className="field-input" value={segStrain} onChange={(e) => setSegStrain(e.target.value)} />
        </div>
        <div className="grid gap-[7px]">
          <label className="text-sm font-bold" htmlFor="segStrong">Segment id — Strong</label>
          <input id="segStrong" className="field-input" value={segStrong} onChange={(e) => setSegStrong(e.target.value)} />
        </div>
```
Add the matching `useState` declarations next to the existing ones:
```tsx
  const [audienceId, setAudienceId] = useState('')
  const [segRisk, setSegRisk] = useState('')
  const [segStrain, setSegStrain] = useState('')
  const [segStrong, setSegStrong] = useState('')
```
Hydrate them where the existing settings load runs (`.then(({ data }) => …)`):
```tsx
        setAudienceId(data.resend_audience_id ?? '')
        setSegRisk(data.segment_at_risk_id ?? '')
        setSegStrain(data.segment_under_strain_id ?? '')
        setSegStrong(data.segment_strong_id ?? '')
```
And include them in the saved `update(...)` payload:
```tsx
        resend_audience_id: audienceId || null,
        segment_at_risk_id: segRisk || null,
        segment_under_strain_id: segStrain || null,
        segment_strong_id: segStrong || null,
```
Also update the settings `.select(...)` in this page to include the new columns
(`resend_audience_id, segment_at_risk_id, segment_under_strain_id, segment_strong_id`).

- [ ] **Step 4: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/BroadcastComposer.tsx "src/app/admin/(panel)/settings/page.tsx"
git commit -m "feat: enable Send now and add segment-id settings fields"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the full gate**

Run: `npm run test && npm run type-check && npm run lint && npm run build`
Expected: all pass — Vitest green (new merge/targets/audience/broadcast suites added), no type or lint errors, build succeeds with the new `/admin/broadcasts/[id]/confirm` and `/api/admin/broadcasts/[id]/send` + `/test-send` routes.

- [ ] **Step 2: Operator setup checklist (manual, documented)**

1. Apply migration `005` to the Supabase project (flag to the user first).
2. In the Resend dashboard, create 3 segments filtering `score_band` = `at_risk`, `under_strain`, `strong`. (The audience auto-creates on the first send/sync; copy its id from Settings afterward, or from the dashboard.)
3. Paste the 3 segment ids into `/admin/settings`.
4. Confirm `EMAIL_FROM` + `EMAIL_REPLY_TO` are set.

- [ ] **Step 3: Manual smoke test (test-send only — no real parent list)**

Run `npm run dev`, log into `/admin`, open a saved draft → "Send now" → on the
confirm screen click **"Send a test to myself"** → confirm the email arrives in the
admin inbox with the sample name and an unsubscribe footer. Do NOT click the real
"Send to N parents" until the operator setup is done and the audience is intended.

- [ ] **Step 4: Update the project-status memory**

Mark the Send-now integration done (local), note Schedule + tracking still deferred,
in `C:\Users\Chinedu Nweke\.claude\projects\C--Users-Chinedu-Nweke-Downloads-familydiagnostictool\memory\project-status.md`.

- [ ] **Step 5: Stop and report before pushing**

Per the project workflow (commit to main locally, ask before pushing), do NOT push.
Summarize what was built + verification results, flag that migration `005` needs
applying and the 3 Resend segments need creating, and ask for the go-ahead to push.

---

## Self-Review notes

- **Spec coverage:** merge tags (T2), target resolution all/band/missing (T3), admin guard for /api (T4), audience sync (T5), send + test-send + idempotency guard (T6), routes (T7), confirm screen + test-send + recipient count + safety (T8), read-only detail (T9), enable Send now + segment settings (T10), migration + types (T1), verification + operator setup + deferred items (T11). All covered.
- **Deferred correctly:** Schedule (`scheduledAt`) and the webhook/tracking are explicitly out, matching the spec.
- **Type consistency:** `resolveBroadcastTarget` returns `{ ok, target | error }` used identically in T7/T8; `ResendTarget` spread into `broadcasts.create` in T6; `sendBroadcastNow`/`sendTestToSelf` signatures match their callers; `Settings` extended in T1 is used in T7/T8/T10.
- **Known simplification:** `sendBroadcastNow` currently passes `logoUrl: null` (logo embedding in sent broadcasts is deferred with the same rationale as the preview); the include-logo toggle still affects the preview. Note for a later task if logo-in-email is wanted.
- **DB flag:** migration `005` application is called out as requiring user sign-off (Supabase workflow).
