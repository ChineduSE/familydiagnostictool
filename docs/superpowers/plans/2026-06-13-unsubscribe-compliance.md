# Unsubscribe Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Respect broadcast unsubscribes — never re-subscribe someone who opted out, and pull Resend-side unsubscribes back into our database so admin counts are accurate and opt-outs are visible.

**Architecture:** Two changes in `src/lib/resend-audience.ts` (the sync path that runs before every send): stop forcing `unsubscribed: false` on contact updates, and add a `reconcileUnsubscribes` step that lists the Resend audience and marks opted-out contacts in our DB. Plus a small "Unsubscribed" badge on the admin respondent detail page. Pure dependency-injected functions, unit-tested with mocked clients.

**Tech Stack:** TypeScript, Supabase (`@supabase/supabase-js`), Resend (`resend@6.12.4`), Vitest, Next.js 16 (App Router).

**Spec:** `docs/superpowers/specs/2026-06-13-unsubscribe-compliance-design.md`

---

## File Structure

**Part A — pull-at-send + badge (Tasks 1-3):**
- Modify `src/lib/resend-audience.ts` — update path drops `unsubscribed: false`; add + wire `reconcileUnsubscribes`.
- Modify `src/lib/resend-audience.test.ts` — add `contacts.list` to the fake; tests for no-resubscribe and reconciliation.
- Modify `src/app/admin/(panel)/respondents/[id]/page.tsx` — look up the contact's `unsubscribed_at` and show an "Unsubscribed" badge.

**Part B — custom unsubscribe for the results email (Tasks 4-7):**
- Create `src/lib/unsubscribe-token.ts` (+ test) — HMAC sign/verify + `buildUnsubscribeUrl`.
- Create `src/lib/unsubscribe-contact.ts` (+ test) — `unsubscribeContact` (DB + best-effort Resend).
- Create `src/app/unsubscribe/page.tsx` — public confirmation/success/invalid page.
- Create `src/app/api/unsubscribe/route.ts` — public POST handler performing the opt-out.
- Modify `src/emails/BaseEmail.tsx`, `src/emails/ResultsEmail.tsx`, `src/lib/send-results-email.ts` — render the unsubscribe footer link.

No DB migration (uses existing `contacts.unsubscribed_at`). No new required env var (signing secret falls back to `SUPABASE_SERVICE_ROLE_KEY`).

---

## Task 1: Stop re-subscribing contacts on update — TDD

The sync's update path sends `unsubscribed: false`, which overwrites a Resend opt-out. Omit the field so Resend's subscription state is never touched on update. (Create keeps `unsubscribed: false` — a newly synced contact is subscribed.)

**Files:**
- Modify: `src/lib/resend-audience.ts`
- Test: `src/lib/resend-audience.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/resend-audience.test.ts`, add this test inside the `describe('syncConsentedContacts', ...)` block (after the existing "updates an already-synced contact" test):
```ts
  it('does not re-subscribe an existing contact on update', async () => {
    const contacts = [
      { id: 'r9', email: 'keep@x.com', first_name: 'Keep', latest_score_range: 'strong', resend_contact_id: 'c_keep', unsubscribed_at: null },
    ]
    const supabase = fakeSupabase(contacts, 'aud_1')
    const resend = fakeResend()
    await syncConsentedContacts(supabase, resend)
    const updateArg = resend.contacts.update.mock.calls[0][0]
    expect(updateArg.unsubscribed).toBeUndefined()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/resend-audience.test.ts -t "does not re-subscribe"`
Expected: FAIL — `updateArg.unsubscribed` is `false`, not `undefined`.

- [ ] **Step 3: Remove `unsubscribed: false` from the update path**

In `src/lib/resend-audience.ts`, change the update call inside `syncConsentedContacts` from:
```ts
        await resend.contacts.update({
          audienceId,
          id: contact.resend_contact_id,
          firstName: contact.first_name ?? undefined,
          unsubscribed: false,
          properties,
        })
```
to (drop the `unsubscribed: false` line and update the comment):
```ts
        // Already in the audience: refresh name/band only. Do NOT send
        // `unsubscribed` — that would overwrite a Resend opt-out and re-subscribe
        // someone who unsubscribed. resend_contact_id is already stored.
        await resend.contacts.update({
          audienceId,
          id: contact.resend_contact_id,
          firstName: contact.first_name ?? undefined,
          properties,
        })
```
(Leave the create call's `unsubscribed: false` as-is.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/resend-audience.test.ts`
Expected: PASS (all existing tests + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/lib/resend-audience.ts src/lib/resend-audience.test.ts
git commit -m "fix: stop re-subscribing contacts on sync update"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 2: `reconcileUnsubscribes` + wire it into the sync — TDD

Pull Resend-side opt-outs back into our DB. Lists the audience's Resend contacts;
for each `unsubscribed`, sets `unsubscribed_at = now()` on the matching `contacts`
row by email, only when currently null (idempotent, preserves the first opt-out
time). Resilient: per-contact failures are logged and counted, never thrown.

**Files:**
- Modify: `src/lib/resend-audience.ts`
- Test: `src/lib/resend-audience.test.ts`

- [ ] **Step 1: Add `contacts.list` to the test fake**

In `src/lib/resend-audience.test.ts`, update `fakeResend()` so `contacts` includes a `list` (defaults to empty so existing sync tests stay no-op):
```ts
    contacts: {
      list: vi.fn(async () => ({ data: { data: [] }, error: null })),
      create: vi.fn(async () => ({ data: { id: 'c_new' }, error: null })),
      update: vi.fn(async () => ({ data: { id: 'c_upd' }, error: null })),
    },
```

- [ ] **Step 2: Write the failing tests**

Add a new `describe` block at the end of `src/lib/resend-audience.test.ts` (import `reconcileUnsubscribes` — update the top import line to `import { syncConsentedContacts, reconcileUnsubscribes } from '@/lib/resend-audience'`):
```ts
describe('reconcileUnsubscribes', () => {
  // A Supabase fake whose contacts.update(...).eq(...).is(...) chain is awaitable
  // and records the patch + filters used.
  function reconcileSupabase() {
    const calls: any[] = []
    return {
      calls,
      from() {
        return {
          update(patch: any) {
            const record: any = { patch }
            const chain = {
              eq(col: string, val: any) {
                record.eq = { col, val }
                return {
                  is(col2: string, val2: any) {
                    record.is = { col: col2, val: val2 }
                    calls.push(record)
                    return Promise.resolve({ error: null })
                  },
                }
              },
            }
            return chain
          },
        }
      },
    } as any
  }

  it('marks an unsubscribed Resend contact as unsubscribed in the DB', async () => {
    const supabase = reconcileSupabase()
    const resend = {
      contacts: {
        list: vi.fn(async () => ({
          data: { data: [{ email: 'gone@x.com', unsubscribed: true }, { email: 'stay@x.com', unsubscribed: false }] },
          error: null,
        })),
      },
    } as any

    const count = await reconcileUnsubscribes(supabase, resend, 'aud_1')

    expect(count).toBe(1)
    expect(supabase.calls).toHaveLength(1)
    expect(supabase.calls[0].patch).toHaveProperty('unsubscribed_at')
    expect(supabase.calls[0].eq).toEqual({ col: 'email', val: 'gone@x.com' })
    expect(supabase.calls[0].is).toEqual({ col: 'unsubscribed_at', val: null })
  })

  it('does nothing when no Resend contacts are unsubscribed', async () => {
    const supabase = reconcileSupabase()
    const resend = {
      contacts: { list: vi.fn(async () => ({ data: { data: [{ email: 'a@x.com', unsubscribed: false }] }, error: null })) },
    } as any
    const count = await reconcileUnsubscribes(supabase, resend, 'aud_1')
    expect(count).toBe(0)
    expect(supabase.calls).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/resend-audience.test.ts`
Expected: FAIL — `reconcileUnsubscribes` is not exported.

- [ ] **Step 4: Implement `reconcileUnsubscribes`**

In `src/lib/resend-audience.ts`, add this exported function (place it after `ensureAudience`, before `syncConsentedContacts`):
```ts
// Pulls Resend-side opt-outs back into our DB so admin counts stay accurate.
// Lists the audience's Resend contacts and, for each unsubscribed one, sets
// unsubscribed_at on the matching contact row by email — only when it's still
// null, so the original opt-out time is preserved. Resilient: a failure on one
// row is logged and skipped. Returns how many rows were newly marked.
export async function reconcileUnsubscribes(
  supabase: SupabaseClient,
  resend: Resend,
  audienceId: string
): Promise<number> {
  const { data, error } = await resend.contacts.list({ audienceId })
  if (error || !data) return 0

  let reconciled = 0
  for (const contact of data.data ?? []) {
    if (!contact.unsubscribed) continue
    try {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('email', contact.email)
        .is('unsubscribed_at', null)
      if (updateError) throw new Error(updateError.message)
      reconciled++
    } catch (err) {
      console.error(`Failed to reconcile unsubscribe for ${contact.email}:`, err)
    }
  }
  return reconciled
}
```

- [ ] **Step 5: Wire it into `syncConsentedContacts`**

In `src/lib/resend-audience.ts`, change the start of `syncConsentedContacts` from:
```ts
  const audienceId = await ensureAudience(supabase, resend)
  await ensureScoreBandProperty(resend)

  const { data: contacts, error } = await supabase
```
to:
```ts
  const audienceId = await ensureAudience(supabase, resend)
  await ensureScoreBandProperty(resend)

  // Pull Resend opt-outs into our DB BEFORE loading contacts, so anyone who
  // unsubscribed is excluded from this send's sync (and never re-touched).
  await reconcileUnsubscribes(supabase, resend, audienceId)

  const { data: contacts, error } = await supabase
```

- [ ] **Step 6: Run the tests + gate**

Run: `npx vitest run src/lib/resend-audience.test.ts && npm run type-check && npm run lint`
Expected: all PASS, no type/lint errors. (If TS complains that `contact.unsubscribed`/`contact.email` are unknown on the list item, the SDK `Contact` type has `email: string` and `unsubscribed: boolean` — no cast needed; if a cast is genuinely required, report it rather than using `any`.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/resend-audience.ts src/lib/resend-audience.test.ts
git commit -m "feat: reconcile Resend unsubscribes into the database at send time"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 3: "Unsubscribed" badge on the respondent detail page

The detail page reads from `assessments`, which has no `unsubscribed_at`. Look up
the matching `contacts` row by email and show a small badge when opted out.

**Files:**
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx`

- [ ] **Step 1: Load the contact's unsubscribe status**

In `src/app/admin/(panel)/respondents/[id]/page.tsx`, after the `email_messages`
query (the `const { data: emails } = ...` block, around line 54-58), add:
```ts
  const { data: contact } = await supabase
    .from('contacts')
    .select('unsubscribed_at')
    .eq('email', respondent.email)
    .maybeSingle()
  const isUnsubscribed = Boolean(contact?.unsubscribed_at)
```

- [ ] **Step 2: Show the badge in the profile**

In the same file, change the score/range row from:
```tsx
        <div className="mt-4 flex items-center gap-3">
          <span className="font-display text-2xl">{respondent.score} / 60</span>
          <RangeBadge range={range} />
        </div>
```
to:
```tsx
        <div className="mt-4 flex items-center gap-3">
          <span className="font-display text-2xl">{respondent.score} / 60</span>
          <RangeBadge range={range} />
          {isUnsubscribed && (
            <span className="inline-block whitespace-nowrap rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-brand-muted">
              Unsubscribed
            </span>
          )}
        </div>
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(panel)/respondents/[id]/page.tsx"
git commit -m "feat: show Unsubscribed badge on respondent detail"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 4: `unsubscribe-token.ts` (signed link) — TDD

A stateless HMAC token so an unsubscribe link can't be forged for someone else.

**Files:**
- Create: `src/lib/unsubscribe-token.ts`
- Test: `src/lib/unsubscribe-token.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/unsubscribe-token.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/unsubscribe-token.test.ts`
Expected: FAIL — cannot resolve `@/lib/unsubscribe-token`.

- [ ] **Step 3: Write the implementation**

`src/lib/unsubscribe-token.ts`:
```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/unsubscribe-token.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/unsubscribe-token.ts src/lib/unsubscribe-token.test.ts
git commit -m "feat: add signed unsubscribe token helpers"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 5: `unsubscribe-contact.ts` — TDD with mocks

Marks a contact unsubscribed in our DB (idempotent), and best-effort in Resend so
broadcasts also skip them. Never throws on the Resend side (DB is source of truth).

**Files:**
- Create: `src/lib/unsubscribe-contact.ts`
- Test: `src/lib/unsubscribe-contact.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/unsubscribe-contact.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/unsubscribe-contact.test.ts`
Expected: FAIL — cannot resolve `@/lib/unsubscribe-contact`.

- [ ] **Step 3: Write the implementation**

`src/lib/unsubscribe-contact.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'

// Marks a contact unsubscribed in our DB (only when not already, preserving the
// first opt-out time) and best-effort in Resend so broadcasts skip them too.
// Never throws on the Resend side — our DB is the source of truth and the sync
// excludes unsubscribed rows regardless.
export async function unsubscribeContact(
  supabase: SupabaseClient,
  resend: Resend,
  email: string
): Promise<void> {
  await supabase
    .from('contacts')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email)
    .is('unsubscribed_at', null)

  const { data: contact } = await supabase
    .from('contacts')
    .select('resend_contact_id')
    .eq('email', email)
    .maybeSingle()
  if (!contact?.resend_contact_id) return

  const { data: settings } = await supabase
    .from('settings')
    .select('resend_audience_id')
    .eq('id', 1)
    .maybeSingle()
  if (!settings?.resend_audience_id) return

  try {
    await resend.contacts.update({
      audienceId: settings.resend_audience_id,
      id: contact.resend_contact_id,
      unsubscribed: true,
    })
  } catch (err) {
    console.error(`Failed to mark ${email} unsubscribed in Resend:`, err)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/unsubscribe-contact.test.ts && npm run type-check && npm run lint`
Expected: PASS (3 tests), no type/lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unsubscribe-contact.ts src/lib/unsubscribe-contact.test.ts
git commit -m "feat: add unsubscribeContact (db + best-effort Resend)"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 6: Public `/unsubscribe` page + POST route

The page (GET) verifies the token and shows a confirmation; the route (POST) does
the opt-out and redirects to the success state. Both are public (outside the
`/admin` middleware matcher).

**Files:**
- Create: `src/app/unsubscribe/page.tsx`
- Create: `src/app/api/unsubscribe/route.ts`

- [ ] **Step 1: Create the page**

`src/app/unsubscribe/page.tsx`:
```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-8">
      <section className="w-full max-w-[480px] rounded-[18px] bg-brand-white p-[30px] text-center shadow-[0_10px_32px_rgba(26,26,26,0.08)]">
        {children}
      </section>
    </main>
  )
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string; done?: string }>
}) {
  const { e = '', t = '', done } = await searchParams

  if (done) {
    return (
      <Shell>
        <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">You&apos;re unsubscribed</h1>
        <p className="mt-3 text-brand-muted">You won&apos;t receive any more emails from us. You can retake the quiz anytime.</p>
      </Shell>
    )
  }

  if (!e || !t || !verifyUnsubscribeToken(e, t)) {
    return (
      <Shell>
        <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">Link not valid</h1>
        <p className="mt-3 text-brand-muted">This unsubscribe link is invalid or has expired.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">Unsubscribe?</h1>
      <p className="mt-3 text-brand-muted">
        Stop sending emails to <strong className="text-brand-black">{e}</strong>?
      </p>
      <form method="post" action="/api/unsubscribe" className="mt-6">
        <input type="hidden" name="e" value={e} />
        <input type="hidden" name="t" value={t} />
        <button type="submit" className="btn-primary">Yes, unsubscribe me</button>
      </form>
      <Link href="/" className="mt-4 inline-block text-sm text-brand-muted underline">
        No, keep me subscribed
      </Link>
    </Shell>
  )
}
```

- [ ] **Step 2: Create the POST route**

`src/app/api/unsubscribe/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { unsubscribeContact } from '@/lib/unsubscribe-contact'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createResend } from '@/lib/resend'

export async function POST(request: Request) {
  const form = await request.formData()
  const email = String(form.get('e') ?? '')
  const token = String(form.get('t') ?? '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.redirect(`${appUrl}/unsubscribe`, { status: 303 })
  }

  const supabase = createSupabaseAdmin()
  const resend = createResend()
  if (supabase && resend) await unsubscribeContact(supabase, resend, email)

  return NextResponse.redirect(`${appUrl}/unsubscribe?done=1`, { status: 303 })
}
```

- [ ] **Step 3: Verify type-check + lint + build**

Run: `npm run type-check && npm run lint && npm run build`
Expected: no errors; the build lists `/unsubscribe` and `/api/unsubscribe` as routes.

- [ ] **Step 4: Commit**

```bash
git add src/app/unsubscribe/page.tsx src/app/api/unsubscribe/route.ts
git commit -m "feat: add public unsubscribe confirmation page and handler"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 7: Add the unsubscribe link to the results email

**Files:**
- Modify: `src/emails/BaseEmail.tsx`
- Modify: `src/emails/ResultsEmail.tsx`
- Modify: `src/lib/send-results-email.ts`

- [ ] **Step 1: Add an `unsubscribeUrl` prop + footer link to `BaseEmail`**

In `src/emails/BaseEmail.tsx`, change the props type:
```tsx
type BaseEmailProps = {
  previewText: string
  children: ReactNode
  logoUrl?: string
  unsubscribeUrl?: string
}
```
Update the signature to destructure it:
```tsx
export function BaseEmail({ previewText, children, logoUrl, unsubscribeUrl }: BaseEmailProps) {
```
And replace the footer `Section` with one that adds the unsubscribe link when present:
```tsx
          <Hr style={{ borderColor: '#eee', margin: 0 }} />
          <Section style={{ padding: '20px 40px' }}>
            <Text style={{ fontSize: '12px', color: BRAND.muted, textAlign: 'center', margin: 0 }}>
              © {new Date().getFullYear()} Ibironke O. Semowo · ibironkeosemowo.com
            </Text>
            {isSafeHttpUrl(unsubscribeUrl) && (
              <Text style={{ fontSize: '12px', color: BRAND.muted, textAlign: 'center', margin: '8px 0 0' }}>
                <a href={unsubscribeUrl} style={{ color: BRAND.muted, textDecoration: 'underline' }}>
                  Unsubscribe
                </a>
              </Text>
            )}
          </Section>
```

- [ ] **Step 2: Thread the prop through `ResultsEmail`**

In `src/emails/ResultsEmail.tsx`, add to `ResultsEmailProps`:
```tsx
  unsubscribeUrl?: string
```
Update the function signature destructure to include `unsubscribeUrl`:
```tsx
export function ResultsEmail({ firstName, score, scoreRange, ctaUrl, logoUrl, unsubscribeUrl }: ResultsEmailProps) {
```
And pass it to `BaseEmail`:
```tsx
    <BaseEmail previewText={previewText} logoUrl={logoUrl} unsubscribeUrl={unsubscribeUrl}>
```

- [ ] **Step 3: Build the url in `sendResultsEmail`**

In `src/lib/send-results-email.ts`, add the import:
```ts
import { buildUnsubscribeUrl } from '@/lib/unsubscribe-token'
```
And pass `unsubscribeUrl` when creating the element:
```ts
    const html = await render(
      createElement(ResultsEmail, {
        firstName: params.firstName,
        score: params.score,
        scoreRange: params.scoreRange,
        ctaUrl: params.ctaUrl,
        logoUrl: params.logoUrl,
        unsubscribeUrl: buildUnsubscribeUrl(params.email),
      })
    )
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/emails/BaseEmail.tsx src/emails/ResultsEmail.tsx src/lib/send-results-email.ts
git commit -m "feat: add unsubscribe link to the results email footer"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 8: Full verification

- [ ] **Step 1: Run the full gate**

Run: `npm run test && npm run type-check && npm run lint && npm run build`
Expected: all pass — Vitest green (existing suites + no-resubscribe, reconcile,
unsubscribe-token, unsubscribe-contact), no type/lint errors, build succeeds and
lists the new `/unsubscribe` + `/api/unsubscribe` routes.

- [ ] **Step 2: Manual reasoning check**

Confirm by reading the code:
- `syncConsentedContacts` calls `reconcileUnsubscribes` before loading contacts; the update path no longer passes `unsubscribed`; create still passes `unsubscribed: false`.
- The results email footer renders an Unsubscribe link; `/unsubscribe` shows a confirmation before the POST performs the opt-out.

- [ ] **Step 3: Update the project-status memory**

In `C:\Users\Chinedu Nweke\.claude\projects\C--Users-Chinedu-Nweke-Downloads-familydiagnostictool\memory\project-status.md`, mark unsubscribe compliance done (local): pull-at-send reconciliation + no-resubscribe fix + admin badge + a signed custom unsubscribe link on the results email (confirmation page). Note the real-time webhook + open/click tracking remain (Phase 6).

- [ ] **Step 4: Stop and report before pushing**

Per the project workflow (commit to main locally, ask before pushing), do NOT push.
Summarize what changed and the verification results, note that a real opt-out can
be tested end-to-end via the results email's link, and ask for the go-ahead to push.

---

## Self-Review notes

- **Spec coverage:** no-resubscribe on update (T1), create keeps subscribed (T1), `reconcileUnsubscribes` + send-flow ordering (T2), admin badge (T3), signed token (T4), `unsubscribeContact` DB+Resend (T5), public confirmation page + POST handler (T6), results-email footer link (T7), verification (T8). All covered.
- **Out of scope correctly absent:** webhook/tracking, resubscribe UI, list pagination, and any change to the broadcast (Resend-hosted) unsubscribe.
- **Type consistency:** `reconcileUnsubscribes(supabase, resend, audienceId)` matches its call site; SDK `Contact` exposes `email`/`unsubscribed`; `unsubscribeContact(supabase, resend, email)` matches the route call; `signUnsubscribeToken`/`verifyUnsubscribeToken`/`buildUnsubscribeUrl` names are consistent across token lib, page, route, and email; `unsubscribeUrl` prop threads BaseEmail ← ResultsEmail ← sendResultsEmail.
- **Idempotency:** reconcile and `unsubscribeContact` both update only where `unsubscribed_at IS NULL`, preserving the first opt-out time.
- **Security:** unsubscribe link is HMAC-signed (no forging others' opt-outs); confirmation page (not one-click) avoids scanner auto-unsubscribes; page + route are public (outside `/admin` matcher) by design.
- **No DB migration / no required new env var:** uses existing `contacts.unsubscribed_at`; signing secret falls back to `SUPABASE_SERVICE_ROLE_KEY`.
