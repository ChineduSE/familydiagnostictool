# Unsubscribe Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Respect broadcast unsubscribes — never re-subscribe someone who opted out, and pull Resend-side unsubscribes back into our database so admin counts are accurate and opt-outs are visible.

**Architecture:** Two changes in `src/lib/resend-audience.ts` (the sync path that runs before every send): stop forcing `unsubscribed: false` on contact updates, and add a `reconcileUnsubscribes` step that lists the Resend audience and marks opted-out contacts in our DB. Plus a small "Unsubscribed" badge on the admin respondent detail page. Pure dependency-injected functions, unit-tested with mocked clients.

**Tech Stack:** TypeScript, Supabase (`@supabase/supabase-js`), Resend (`resend@6.12.4`), Vitest, Next.js 16 (App Router).

**Spec:** `docs/superpowers/specs/2026-06-13-unsubscribe-compliance-design.md`

---

## File Structure

**Modify:**
- `src/lib/resend-audience.ts` — update path drops `unsubscribed: false`; add + wire `reconcileUnsubscribes`.
- `src/lib/resend-audience.test.ts` — add `contacts.list` to the fake; tests for no-resubscribe and reconciliation.
- `src/app/admin/(panel)/respondents/[id]/page.tsx` — look up the contact's `unsubscribed_at` and show an "Unsubscribed" badge.

No new files, no DB migration (uses existing `contacts.unsubscribed_at`).

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

## Task 4: Full verification

- [ ] **Step 1: Run the full gate**

Run: `npm run test && npm run type-check && npm run lint && npm run build`
Expected: all pass — Vitest green (existing suites + the new no-resubscribe and reconcile tests), no type/lint errors, build succeeds.

- [ ] **Step 2: Manual reasoning check (no live send required)**

Confirm by reading the final `syncConsentedContacts`:
- It calls `reconcileUnsubscribes` before loading contacts.
- The update path no longer passes `unsubscribed`.
- The create path still passes `unsubscribed: false`.

- [ ] **Step 3: Update the project-status memory**

In `C:\Users\Chinedu Nweke\.claude\projects\C--Users-Chinedu-Nweke-Downloads-familydiagnostictool\memory\project-status.md`, mark unsubscribe compliance done (local), note it's pull-at-send (no webhook yet), and that the real-time webhook + open/click tracking remain (Phase 6).

- [ ] **Step 4: Stop and report before pushing**

Per the project workflow (commit to main locally, ask before pushing), do NOT push.
Summarize what changed and the verification results, and ask for the go-ahead to push.

---

## Self-Review notes

- **Spec coverage:** no-resubscribe on update (T1), create keeps subscribed (T1, unchanged line), `reconcileUnsubscribes` + send-flow ordering (T2), admin badge (T3), tests for both behaviors (T1/T2), verification (T4). All covered.
- **No webhook / no custom unsubscribe page / no results-email unsubscribe:** correctly out of scope.
- **Type consistency:** `reconcileUnsubscribes(supabase, resend, audienceId)` signature matches its call in `syncConsentedContacts`; the SDK `Contact` list item exposes `email`/`unsubscribed`; `contacts.list` added to the fake matches the real call shape.
- **Idempotency:** reconcile updates only where `unsubscribed_at IS NULL`, preserving the first opt-out time and making repeated sends safe.
- **No DB migration:** uses the existing `contacts.unsubscribed_at` column.
