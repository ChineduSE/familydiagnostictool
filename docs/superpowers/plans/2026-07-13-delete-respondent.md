# Delete Respondent (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guarded "Delete respondent" action to the admin respondent detail page that removes the whole person (contact + all their assessments + email_messages) by email.

**Architecture:** A `DELETE /api/admin/respondents/[id]` route (guarded by `requireActiveAdmin`, run with the service-role client) resolves the person by the assessment's email and deletes their `email_messages`, `assessments`, and `contact`. A client component on the detail page provides a two-step inline confirm, then redirects to the respondents list.

**Tech Stack:** Next.js App Router (route handlers), TypeScript, Supabase (service-role client), Vitest.

## Global Constraints

- **Admin-only:** the route calls `requireActiveAdmin()` first and returns its 401 response on failure (API routes are not covered by the `/admin` middleware).
- **Service-role client** (`createSupabaseAdmin()`) for the deletes (RLS blocks them otherwise); used only server-side inside the guarded route.
- **Whole person, by email:** delete every `assessments` row with that email, their `email_messages`, and the `contacts` row. Leave `email_events` (harmless Resend webhook logs, not respondent-linked).
- **Detail page only** — no delete control on the respondents list rows.
- **Two-step inline confirm** (not a native browser dialog).
- **No em dashes** in any copy; no raw unescaped apostrophes in JSX text.

---

## Task 1: `DELETE /api/admin/respondents/[id]` route

**Files:**
- Create: `src/app/api/admin/respondents/[id]/route.ts`
- Test: `src/app/api/admin/respondents/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireActiveAdmin()` from `@/lib/require-admin` (returns `{ ok: true, user } | { ok: false, response }`); `createSupabaseAdmin()` from `@/lib/supabase-admin` (client or null).
- Produces: `DELETE(request, { params: Promise<{ id: string }> })` → JSON `{ success: boolean }`.

- [ ] **Step 1: Write the failing guard test**

Create `src/app/api/admin/respondents/[id]/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "src/app/api/admin/respondents/[id]/route.test.ts"`
Expected: FAIL — the route module does not exist yet.

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/respondents/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// Deletes a whole person (by the assessment's email): their email_messages, all
// their assessments, and their contact row. email_events are left as-is (Resend
// webhook logs keyed by resend_email_id, not respondent-linked).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
  }

  const { data: assessment, error: loadError } = await supabase
    .from('assessments')
    .select('id, email, contact_id')
    .eq('id', id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 })
  }
  if (!assessment) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const { email, contact_id } = assessment

  // Every submission this person made (they may have taken the quiz more than once).
  const { data: theirAssessments } = await supabase
    .from('assessments')
    .select('id')
    .eq('email', email)
  const assessmentIds = (theirAssessments ?? []).map((a) => a.id)

  // FK-safe order: children (email_messages) first, then assessments, then contact.
  if (assessmentIds.length > 0) {
    const { error } = await supabase.from('email_messages').delete().in('assessment_id', assessmentIds)
    if (error) return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
  if (contact_id) {
    const { error } = await supabase.from('email_messages').delete().eq('contact_id', contact_id)
    if (error) return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  const delAssessments = await supabase.from('assessments').delete().eq('email', email)
  if (delAssessments.error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  const delContact = await supabase.from('contacts').delete().eq('email', email)
  if (delContact.error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/api/admin/respondents/[id]/route.test.ts"`
Expected: PASS — the unauthenticated call returns 401 before any Supabase-admin work.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/respondents/[id]/route.ts" "src/app/api/admin/respondents/[id]/route.test.ts"
git commit -m "feat: admin DELETE route to remove a respondent (whole person)"
```

---

## Task 2: Delete button on the respondent detail page

**Files:**
- Create: `src/components/admin/DeleteRespondentButton.tsx`
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx`

**Interfaces:**
- Consumes: `DELETE /api/admin/respondents/[id]` (Task 1).
- Produces: `DeleteRespondentButton({ id, firstName })` client component.

- [ ] **Step 1: Create the client component**

Create `src/components/admin/DeleteRespondentButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type State = 'idle' | 'confirm' | 'deleting' | 'error'

export function DeleteRespondentButton({ id, firstName }: { id: string; firstName: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')

  async function remove() {
    setState('deleting')
    try {
      const res = await fetch(`/api/admin/respondents/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setState('error')
        return
      }
      router.push('/admin/respondents')
    } catch {
      setState('error')
    }
  }

  if (state === 'idle' || state === 'error') {
    return (
      <div className="mt-10 border-t border-black/5 pt-6">
        <button
          type="button"
          onClick={() => setState('confirm')}
          className="text-sm font-medium text-[#b91c1c] transition-colors hover:text-[#7f1d1d]"
        >
          Delete respondent
        </button>
        {state === 'error' && (
          <p className="mt-2 text-xs text-[#b91c1c]">Could not delete. Please try again.</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-black/5 pt-6">
      <p className="text-sm text-brand-black">
        Delete {firstName || 'this respondent'} and all their data? This cannot be undone.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={state === 'deleting'}
          className="rounded-md bg-[#b91c1c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7f1d1d] disabled:opacity-60"
        >
          {state === 'deleting' ? 'Deleting…' : 'Yes, delete permanently'}
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          disabled={state === 'deleting'}
          className="text-sm text-brand-muted transition-colors hover:text-brand-black"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Mount it on the detail page**

In `src/app/admin/(panel)/respondents/[id]/page.tsx`, add the import near the other component imports (after the `RangeBadge` import):

```tsx
import { DeleteRespondentButton } from '@/components/admin/DeleteRespondentButton'
```

Then render it just before the final closing `</div>` of the page, after the "Score band" paragraph:

```tsx
      <p className="mt-6 text-xs text-brand-muted">
        Score band: {SCORE_LABELS[range]}
      </p>

      <DeleteRespondentButton id={respondent.id} firstName={respondent.first_name} />
    </div>
```

(`respondent.id` and `respondent.first_name` are already selected in the page's query.)

- [ ] **Step 3: Typecheck, lint, build**

Run: `npx tsc --noEmit && npx eslint src/components/admin/DeleteRespondentButton.tsx "src/app/admin/(panel)/respondents/[id]/page.tsx" && npx next build`
Expected: no type/lint errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DeleteRespondentButton.tsx "src/app/admin/(panel)/respondents/[id]/page.tsx"
git commit -m "feat: Delete respondent button on the admin detail page"
```

---

## Task 3: Verification

**Files:** none (operational).

- [ ] **Step 1: Full suite + build**

Run: `npx vitest run && npx next build`
Expected: all tests pass; build succeeds.

- [ ] **Step 2: Live check (controller, after deploy)**

Create a throwaway respondent (take the quiz once), open it in `/admin/respondents/<id>`, click "Delete respondent" → "Yes, delete permanently". Confirm: redirect to the respondents list, the person is gone from the list, the dashboard "Total respondents" drops, and any OTHER respondents are untouched. Confirm a non-admin (logged out) `DELETE` to the endpoint returns 401.

---

## What you (the user) need to do

Nothing for the build. After it deploys, this is a UI-only feature — no migration, no env. I'll push and do a quick live check (creating and deleting a throwaway respondent).
