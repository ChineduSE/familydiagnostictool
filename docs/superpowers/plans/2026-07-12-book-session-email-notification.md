# "Book your session" → Instant Owner Email Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the "Book your session" CTA into an instant server-sent email to Ibironke (reply-to the parent), shown only to parents who answered Yes to Q17, fired from both the results page and the results email, with admin visibility of who requested a session.

**Architecture:** A signed booking token (same HMAC pattern as unsubscribe links) identifies the assessment. A new `POST /api/book` verifies the token, sends the owner a notification (reply-to = parent), and stamps `assessments.session_request_at` once (idempotent). The results-page CTA POSTs to it on a direct click; the results-email CTA links to a small `/book` confirmation page whose button POSTs to it (defeating inbox link-prefetch). The CTA is gated in copy by the parent's `wants_support` answer via two markers (`[CTA LEAD]`, `[CTA BUTTON]`) in the existing copy strings.

**Tech Stack:** Next.js (App Router), TypeScript, Zod, Supabase (Postgres + RLS), Resend, React Email, Vitest, Tailwind.

## Global Constraints

- **No em dashes** (`—`) in any parent-facing copy; use commas/parentheses/periods.
- **Notification destination:** `OWNER_EMAIL` = `process.env.OWNER_EMAIL || process.env.EMAIL_REPLY_TO || EMAIL_FROM` (currently ronkesemowo@gmail.com). **Reply-To on the notification is the parent's email.**
- **CTA gating:** `wants_support === true` shows the CTA (results page + email); `false` hides the CTA **and** its session-pitch lead-in, keeping the warm closing.
- **WhatsApp is fully removed from the CTA.** WhatsApp settings columns remain in the DB but no longer feed the CTA. The `whatsapp_message_template` is reused as the body of the owner notification.
- **At most one notification per assessment** — dedup via `session_request_at`.
- **Email CTA uses a confirm-page button** (physical click, prefetch-safe); the results-page CTA sends on the direct click.
- **Token:** HMAC-signed like `src/lib/unsubscribe-token.ts`; key = `UNSUBSCRIBE_SECRET || SUPABASE_SERVICE_ROLE_KEY`.
- Supabase project: `familydiagnosticquiz` (ref `lobsyoxlllfyafpfbqcp`).

---

## Task 1: Foundational libs + types (booking token, OWNER_EMAIL, type fields)

**Files:**
- Create: `src/lib/booking-token.ts`
- Test: `src/lib/booking-token.test.ts`
- Modify: `src/lib/resend.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `signBookingToken(assessmentId: string): string`
  - `verifyBookingToken(assessmentId: string, token: string): boolean`
  - `buildBookingUrl(assessmentId: string): string` → `${APP_URL}/book?a=<id>&t=<token>`
  - `OWNER_EMAIL: string` from `@/lib/resend`
  - `QuizResult` gains optional `wantsSupport?`, `assessmentId?`, `bookToken?`
  - `Assessment` gains `session_request_at: string | null`

- [ ] **Step 1: Write the failing token test**

Create `src/lib/booking-token.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signBookingToken, verifyBookingToken, buildBookingUrl } from '@/lib/booking-token'

describe('booking-token', () => {
  it('verifies a token it signed', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('abc-123', t)).toBe(true)
  })
  it('rejects a token for a different id', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('xyz-999', t)).toBe(false)
  })
  it('rejects a tampered token', () => {
    const t = signBookingToken('abc-123')
    expect(verifyBookingToken('abc-123', `${t}x`)).toBe(false)
  })
  it('builds a url carrying the id and token', () => {
    expect(buildBookingUrl('abc-123')).toContain('/book?a=abc-123&t=')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/booking-token.test.ts`
Expected: FAIL — module `@/lib/booking-token` not found.

- [ ] **Step 3: Implement the token module**

Create `src/lib/booking-token.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

// HMAC key: a dedicated secret if set, otherwise the service-role key (always
// present server-side), mirroring unsubscribe-token so no new env var is needed.
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function signBookingToken(assessmentId: string): string {
  return createHmac('sha256', secret()).update(`book:${assessmentId}`).digest('base64url')
}

export function verifyBookingToken(assessmentId: string, token: string): boolean {
  const expected = Buffer.from(signBookingToken(assessmentId))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function buildBookingUrl(assessmentId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/book?a=${encodeURIComponent(assessmentId)}&t=${signBookingToken(assessmentId)}`
}
```

- [ ] **Step 4: Run the token test to verify it passes**

Run: `npx vitest run src/lib/booking-token.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Add `OWNER_EMAIL` to resend.ts**

In `src/lib/resend.ts`, append after the `EMAIL_REPLY_TO` export:

```ts
// Inbox that receives "wants a session" notifications. Defaults to the reply-to
// inbox (Ibironke's Gmail) so no new env var is required to ship.
export const OWNER_EMAIL =
  process.env.OWNER_EMAIL || process.env.EMAIL_REPLY_TO || EMAIL_FROM
```

- [ ] **Step 6: Extend the shared types**

In `src/types/index.ts`, update `QuizResult`:

```ts
export type QuizResult = {
  firstName: string
  score: number
  scoreRange: ScoreRange
  wantsSupport?: boolean
  assessmentId?: string
  bookToken?: string
}
```

And add to the `Assessment` type, after `wants_support`:

```ts
  session_request_at: string | null
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/booking-token.ts src/lib/booking-token.test.ts src/lib/resend.ts src/types/index.ts
git commit -m "feat: booking token, OWNER_EMAIL, and session-request type fields"
```

---

## Task 2: Migration 007 (session_request_at + stats)

**Files:**
- Create: `supabase/migrations/007_session_requests.sql`

> **YOU (the user) apply this** later in the Supabase SQL Editor (no CLI/DDL access here). This task only writes and commits the file.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/007_session_requests.sql`:

```sql
-- 007: session-request notifications
-- session_request_at is stamped when a parent clicks "Book your session" (the CTA
-- that emails Ibironke). Adds a "Requested a session" count to dashboard stats.

alter table public.assessments
  add column if not exists session_request_at timestamptz;

create or replace function public.get_dashboard_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'total',             count(*),
    'at_risk',           count(*) filter (where score_range = 'at_risk'),
    'under_strain',      count(*) filter (where score_range = 'under_strain'),
    'strong',            count(*) filter (where score_range = 'strong'),
    'wants_support_yes', count(*) filter (where wants_support is true),
    'wants_support_no',  count(*) filter (where wants_support is false),
    'session_requests',  count(*) filter (where session_request_at is not null)
  )
  from public.assessments;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_session_requests.sql
git commit -m "feat: migration for session_request_at and requested-a-session stat"
```

- [ ] **Step 3: USER ACTION (deferred to cutover, Task 8)** — do not apply yet.

---

## Task 3: Gate the CTA copy by `wants_support` (results page + email)

**Files:**
- Modify: `src/lib/questions.ts`
- Test: `src/lib/questions-copy.test.ts`
- Modify: `src/emails/ResultsEmail.tsx`
- Modify: `src/emails/ResultsAtRisk.tsx`, `src/emails/ResultsStrong.tsx`, `src/emails/ResultsUnderStrain.tsx`
- Modify: `src/lib/send-results-email.ts`
- Modify: `src/app/api/submit/route.ts`
- Modify: `src/app/gate/page.tsx`
- Modify: `src/app/results/page.tsx`

**Interfaces:**
- Consumes: `QuizResult.wantsSupport` (Task 1).
- Produces:
  - `buildResultsCopy(range: ScoreRange, wantsSupport: boolean): string`
  - `buildEmailBody(range: ScoreRange, wantsSupport: boolean): string`
  - `ResultsEmail` gains a required `wantsSupport: boolean` prop.
  - `sendResultsEmail` params gain `wantsSupport: boolean`.

- [ ] **Step 1: Add the `[CTA LEAD]` marker before each pitch block in `questions.ts`**

In `src/lib/questions.ts`, in each of the three `RESULTS_COPY` strings, insert a `[CTA LEAD]` paragraph immediately before the session-pitch paragraph (the one right before `[CTA BUTTON]`):

- `at_risk`: before `The next step is a 1-on-1 Family Connection Session with Ibironke,` insert a line `[CTA LEAD]` and a blank line, so it reads:

```
→ Making space for your child's emotions without rushing to fix them

[CTA LEAD]

The next step is a 1-on-1 Family Connection Session with Ibironke, where we look closely at your specific score, identify the two or three changes that will make the biggest difference in your home, and build a practical reconnection plan together, starting now.

[CTA BUTTON]
```

- `under_strain`: insert `[CTA LEAD]` + blank line before `If you'd like a personalised look at exactly where to focus, a Family Connection Session with Ibironke will pinpoint`.
- `strong`: insert `[CTA LEAD]` + blank line before `Parents with strong scores often find the most value in surrounding themselves`.

And in each of the three `EMAIL_COPY[*].body` strings, insert `[CTA LEAD]` + blank line before the pitch:

- `at_risk`: before `I'd love to help you map this out personally.`
- `under_strain`: before `If you'd like to know exactly what those shifts are for your family specifically,`
- `strong`: before `If you'd like to understand your score in more depth`

(These leave `[CTA BUTTON]` exactly where it is. `EMAIL_COPY` and `RESULTS_COPY` keep their existing shapes.)

- [ ] **Step 2: Write the failing copy-assembly test**

Create `src/lib/questions-copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildResultsCopy, buildEmailBody } from '@/lib/questions'
import type { ScoreRange } from '@/types'

const bands: ScoreRange[] = ['at_risk', 'under_strain', 'strong']

describe('buildResultsCopy', () => {
  for (const band of bands) {
    it(`${band}: yes keeps the button, drops the lead marker`, () => {
      const copy = buildResultsCopy(band, true)
      expect(copy).toContain('[CTA BUTTON]')
      expect(copy).not.toContain('[CTA LEAD]')
    })
    it(`${band}: no drops both the button and the lead marker`, () => {
      const copy = buildResultsCopy(band, false)
      expect(copy).not.toContain('[CTA BUTTON]')
      expect(copy).not.toContain('[CTA LEAD]')
    })
  }
  it('no version keeps the warm closing and drops the session pitch', () => {
    const copy = buildResultsCopy('at_risk', false)
    expect(copy).toContain("Don't let that courage go to waste")
    expect(copy).not.toContain('The next step is a 1-on-1 Family Connection Session')
  })
})

describe('buildEmailBody', () => {
  for (const band of bands) {
    it(`${band}: yes keeps the button, no drops it, neither leaks the lead marker`, () => {
      expect(buildEmailBody(band, true)).toContain('[CTA BUTTON]')
      expect(buildEmailBody(band, true)).not.toContain('[CTA LEAD]')
      expect(buildEmailBody(band, false)).not.toContain('[CTA BUTTON]')
      expect(buildEmailBody(band, false)).not.toContain('[CTA LEAD]')
    })
  }
  it('at_risk no version drops both pitch paragraphs but keeps the sign-off', () => {
    const copy = buildEmailBody('at_risk', false)
    expect(copy).not.toContain("I'd love to help you map this out personally")
    expect(copy).not.toContain('A 1-on-1 Family Connection Session')
    expect(copy).toContain('Warmly,')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/questions-copy.test.ts`
Expected: FAIL — `buildResultsCopy` / `buildEmailBody` are not exported.

- [ ] **Step 4: Add the assembly helpers to `questions.ts`**

In `src/lib/questions.ts`, after the `RESULTS_COPY` constant, add:

```ts
// Shows or hides the session CTA block based on the parent's Q17 answer. The copy
// carries two markers: [CTA LEAD] begins the session-pitch block and [CTA BUTTON]
// is where the button renders. For "yes" we drop only the [CTA LEAD] marker
// (keeping the pitch + button). For "no" we drop everything from [CTA LEAD]
// through [CTA BUTTON] so no dangling pitch remains.
function applyCtaVisibility(text: string, wantsSupport: boolean): string {
  const blocks = text.split('\n\n')
  const leadIdx = blocks.indexOf('[CTA LEAD]')
  const btnIdx = blocks.indexOf('[CTA BUTTON]')
  if (leadIdx === -1 || btnIdx === -1) return text
  if (wantsSupport) {
    blocks.splice(leadIdx, 1)
  } else {
    blocks.splice(leadIdx, btnIdx - leadIdx + 1)
  }
  return blocks.join('\n\n')
}

export function buildResultsCopy(range: ScoreRange, wantsSupport: boolean): string {
  return applyCtaVisibility(RESULTS_COPY[range], wantsSupport)
}

export function buildEmailBody(range: ScoreRange, wantsSupport: boolean): string {
  return applyCtaVisibility(EMAIL_COPY[range].body, wantsSupport)
}
```

- [ ] **Step 5: Run the copy test to verify it passes**

Run: `npx vitest run src/lib/questions-copy.test.ts`
Expected: PASS.

- [ ] **Step 6: Update `ResultsEmail.tsx` to gate on `wantsSupport`**

In `src/emails/ResultsEmail.tsx`:

Change the import line to add `buildEmailBody`:

```tsx
import { CTA_LABEL, EMAIL_COPY, buildEmailBody } from '@/lib/questions'
```

Add `wantsSupport` to the props type:

```tsx
export type ResultsEmailProps = {
  firstName: string
  score: number
  scoreRange: ScoreRange
  wantsSupport: boolean
  ctaUrl?: string
  logoUrl?: string
  unsubscribeUrl?: string
}
```

Update the component signature and body assembly:

```tsx
export function ResultsEmail({ firstName, score, scoreRange, wantsSupport, ctaUrl, logoUrl, unsubscribeUrl }: ResultsEmailProps) {
  const { subject } = EMAIL_COPY[scoreRange]
  const previewText = subject.replaceAll('[First name]', firstName)
  const resolved = buildEmailBody(scoreRange, wantsSupport)
    .replaceAll('[First name]', firstName)
    .replaceAll('[SCORE]', String(score))
  const blocks = resolved.split('\n\n')
```

(The rest of the component is unchanged.)

- [ ] **Step 7: Update the three email preview files**

In `src/emails/ResultsAtRisk.tsx`, `src/emails/ResultsStrong.tsx`, and `src/emails/ResultsUnderStrain.tsx`, add `wantsSupport={true}` to the `<ResultsEmail ... />` render so the previews still typecheck. Example for `ResultsAtRisk.tsx`:

```tsx
    <ResultsEmail firstName="Sarah" score={22} scoreRange="at_risk" wantsSupport={true} ctaUrl="https://example.com/book" />
```

Do the same for Strong (`score={52} scoreRange="strong"`) and UnderStrain (`score={38} scoreRange="under_strain"`), keeping their existing scores.

- [ ] **Step 8: Thread `wantsSupport` through `send-results-email.ts`**

In `src/lib/send-results-email.ts`, add `wantsSupport` to the params type (after `scoreRange`):

```ts
  wantsSupport: boolean
```

And pass it into the `createElement(ResultsEmail, { ... })` call (after `scoreRange: params.scoreRange,`):

```ts
        wantsSupport: params.wantsSupport,
```

- [ ] **Step 9: Pass `wantsSupport` from the submit route**

In `src/app/api/submit/route.ts`, update the `sendResultsEmail` call:

```ts
    const sent = await sendResultsEmail({ firstName, email, score, scoreRange, wantsSupport, ctaUrl, logoUrl })
```

(`wantsSupport` is already destructured from `parsed.data` earlier in the route.)

- [ ] **Step 10: Save `wantsSupport` into the stored result at the gate**

In `src/app/gate/page.tsx`, update the `saveResult` call:

```tsx
      saveResult({ firstName, score: result.score, scoreRange: result.scoreRange, wantsSupport })
```

(`wantsSupport` is already in component state, read from `session.readiness`.)

- [ ] **Step 11: Use `buildResultsCopy` on the results page**

In `src/app/results/page.tsx`, change the questions import:

```tsx
import { CTA_LABEL, buildResultsCopy, SCORE_LABELS } from '@/lib/questions'
```

And in `renderCopy`, replace the `copy` assignment:

```tsx
  const copy = buildResultsCopy(result.scoreRange, Boolean(result.wantsSupport))
    .replaceAll('[First name]', result.firstName)
    .replaceAll('[SCORE]', String(result.score))
```

(The `[CTA BUTTON]` handling stays; for No respondents the token is simply absent. The CTA target changes in Task 6.)

- [ ] **Step 12: Typecheck, lint, and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (including the new copy test).

- [ ] **Step 13: Commit**

```bash
git add src/lib/questions.ts src/lib/questions-copy.test.ts src/emails/ResultsEmail.tsx src/emails/ResultsAtRisk.tsx src/emails/ResultsStrong.tsx src/emails/ResultsUnderStrain.tsx src/lib/send-results-email.ts src/app/api/submit/route.ts src/app/gate/page.tsx src/app/results/page.tsx
git commit -m "feat: gate Book-your-session CTA copy by readiness answer"
```

---

## Task 4: Notification email + `POST /api/book`

**Files:**
- Create: `src/lib/send-session-request-email.ts`
- Create: `src/app/api/book/route.ts`
- Test: `src/app/api/book/route.test.ts`

**Interfaces:**
- Consumes: `verifyBookingToken` (Task 1), `OWNER_EMAIL`, `createSupabaseAdmin`, `SCORE_LABELS`.
- Produces:
  - `sendSessionRequestEmail(params): Promise<{ success: boolean; id?: string; error?: string }>`
  - `POST /api/book` accepting `{ assessmentId, token }`.

- [ ] **Step 1: Implement the owner-notification sender**

Create `src/lib/send-session-request-email.ts`:

```ts
import { createResend, EMAIL_FROM, OWNER_EMAIL } from '@/lib/resend'
import { SCORE_LABELS } from '@/lib/questions'
import type { ScoreRange } from '@/types'

type SendSessionRequestParams = {
  firstName: string
  email: string
  phone: string | null
  score: number
  scoreRange: ScoreRange
  message: string
}

type SendResult = { success: boolean; id?: string; error?: string }

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// Emails the app owner (Ibironke) that a parent asked to book a session. Reply-To
// is the parent's email so she replies straight from Gmail. Never throws.
export async function sendSessionRequestEmail(p: SendSessionRequestParams): Promise<SendResult> {
  const resend = createResend()
  if (!resend) return { success: false, error: 'Email not configured (no RESEND_API_KEY)' }

  const band = SCORE_LABELS[p.scoreRange]
  const subject = `Session request: ${p.firstName} (${p.score}/80, ${band})`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1A1A1A">
  <p><strong>${escapeHtml(p.firstName)} would like to book a session.</strong></p>
  <p>Name: ${escapeHtml(p.firstName)}<br/>
     Email: ${escapeHtml(p.email)}<br/>
     Phone: ${escapeHtml(p.phone || 'Not provided')}<br/>
     Score: ${p.score}/80 (${escapeHtml(band)})</p>
  <hr/>
  <p style="white-space:pre-line">${escapeHtml(p.message)}</p>
  <p style="color:#666">Reply to this email to reach ${escapeHtml(p.firstName)} directly.</p>
</div>`

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: OWNER_EMAIL,
      replyTo: p.email,
      subject,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

- [ ] **Step 2: Write the failing route guard test**

Create `src/app/api/book/route.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/app/api/book/route.test.ts`
Expected: FAIL — route module does not exist yet.

- [ ] **Step 4: Implement the booking endpoint**

Create `src/app/api/book/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyBookingToken } from '@/lib/booking-token'
import { sendSessionRequestEmail } from '@/lib/send-session-request-email'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { ScoreRange } from '@/types'

const bookSchema = z.object({
  assessmentId: z.string().min(1),
  token: z.string().min(1),
})

const DEFAULT_MESSAGE =
  '[First name] took the Family Connection Diagnosis and would like to book a session.'

export async function POST(request: Request) {
  const parsed = bookSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }

  const { assessmentId, token } = parsed.data
  if (!verifyBookingToken(assessmentId, token)) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 })
  }

  const { data: a, error } = await supabase
    .from('assessments')
    .select('id, first_name, email, phone, score, score_range, session_request_at')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !a) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  // Idempotent: never notify twice for the same assessment.
  if (a.session_request_at) {
    return NextResponse.json({ success: true, alreadySent: true })
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('whatsapp_message_template')
    .eq('id', 1)
    .maybeSingle()

  const message = (settings?.whatsapp_message_template || DEFAULT_MESSAGE)
    .replaceAll('[First name]', a.first_name)
    .replaceAll('[SCORE]', String(a.score))

  const sent = await sendSessionRequestEmail({
    firstName: a.first_name,
    email: a.email,
    phone: a.phone,
    score: a.score,
    scoreRange: a.score_range as ScoreRange,
    message,
  })

  if (!sent.success) {
    return NextResponse.json({ success: false, error: 'Send failed' }, { status: 502 })
  }

  // Stamp only after a successful send so a failed send can be retried.
  await supabase
    .from('assessments')
    .update({ session_request_at: new Date().toISOString() })
    .eq('id', assessmentId)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Run the route test to verify it passes**

Run: `npx vitest run src/app/api/book/route.test.ts`
Expected: PASS — both guard cases return 400 before any Supabase call.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/send-session-request-email.ts src/app/api/book/route.ts src/app/api/book/route.test.ts
git commit -m "feat: session-request notification email and /api/book endpoint"
```

---

## Task 5: Email CTA → booking URL + `/book` confirmation page

**Files:**
- Modify: `src/app/api/submit/route.ts`
- Create: `src/app/book/page.tsx`
- Create: `src/app/book/BookConfirm.tsx`

**Interfaces:**
- Consumes: `buildBookingUrl`, `signBookingToken` (Task 1); `POST /api/book` (Task 4).
- Produces: submit response gains `assessmentId` and `bookToken`; the results-email CTA target becomes the booking URL.

- [ ] **Step 1: Swap the email CTA target and return booking identifiers from submit**

In `src/app/api/submit/route.ts`:

Replace the WhatsApp import:

```ts
import { buildBookingUrl, signBookingToken } from '@/lib/booking-token'
```

(Remove the `import { buildWhatsAppUrl } from '@/lib/whatsapp'` line.)

Add a `bookToken` holder next to the existing `let ctaUrl = ''` / `let logoUrl` declarations:

```ts
  let bookToken: string | undefined
```

Replace the settings fetch + WhatsApp URL build (the block that selects `whatsapp_number, whatsapp_message_template, logo_url` and calls `buildWhatsAppUrl`) with a logo-only fetch plus the booking URL/token, built from the new assessment id:

```ts
    const { data: settings } = await supabase
      .from('settings')
      .select('logo_url')
      .eq('id', 1)
      .maybeSingle()
    if (settings?.logo_url) logoUrl = settings.logo_url

    if (assessmentId) {
      ctaUrl = buildBookingUrl(assessmentId)
      bookToken = signBookingToken(assessmentId)
    }
```

Update the final response to include the identifiers:

```ts
  return NextResponse.json({ success: true, score, scoreRange, assessmentId, bookToken })
```

(The `sendResultsEmail` call already passes `ctaUrl`, which is now the booking URL; the email CTA renders only for `wants_support` respondents thanks to Task 3.)

- [ ] **Step 2: Create the confirmation client component**

Create `src/app/book/BookConfirm.tsx`:

```tsx
'use client'

import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function BookConfirm({
  assessmentId,
  token,
  firstName,
}: {
  assessmentId: string
  token: string
  firstName: string
}) {
  const [state, setState] = useState<State>('idle')

  async function send() {
    setState('sending')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, token }),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <>
        <h1 className="font-display text-2xl">Your request is on its way</h1>
        <p className="mt-3 text-brand-muted">
          Ibironke will reach out to you by email shortly. Thank you{firstName ? `, ${firstName}` : ''}.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="font-display text-2xl">Book your session</h1>
      <p className="mt-3 text-brand-muted">
        {firstName ? `${firstName}, ` : ''}send your request to Ibironke and she will reach out to you by
        email.
      </p>
      <button className="btn-primary mt-6" type="button" onClick={send} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send my request to Ibironke'}
      </button>
      {state === 'error' && (
        <p className="mt-3 text-sm text-[#b91c1c]">Something went wrong. Please try again.</p>
      )}
    </>
  )
}
```

- [ ] **Step 3: Create the `/book` page**

Create `src/app/book/page.tsx`:

```tsx
import { verifyBookingToken } from '@/lib/booking-token'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { BookConfirm } from './BookConfirm'

export const dynamic = 'force-dynamic'

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; t?: string }>
}) {
  const { a, t } = await searchParams
  const valid = Boolean(a && t && verifyBookingToken(a, t))

  let firstName = ''
  if (valid && a) {
    const supabase = createSupabaseAdmin()
    if (supabase) {
      const { data } = await supabase
        .from('assessments')
        .select('first_name')
        .eq('id', a)
        .maybeSingle()
      firstName = data?.first_name ?? ''
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-10 text-brand-black">
      <section className="w-full max-w-[480px] rounded-[18px] bg-brand-white p-[30px] text-center shadow-[0_10px_32px_rgba(26,26,26,0.08)]">
        {valid && a && t ? (
          <BookConfirm assessmentId={a} token={t} firstName={firstName} />
        ) : (
          <>
            <h1 className="font-display text-2xl">This link has expired</h1>
            <p className="mt-3 text-brand-muted">
              Please retake the assessment or reply to your results email to reach Ibironke.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `npx tsc --noEmit && npx eslint src/app/book/page.tsx src/app/book/BookConfirm.tsx "src/app/api/submit/route.ts" && npx next build`
Expected: no type/lint errors; build succeeds (the new `/book` route appears).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/submit/route.ts" src/app/book/page.tsx src/app/book/BookConfirm.tsx
git commit -m "feat: results email CTA books via /book confirmation page"
```

---

## Task 6: Results-page CTA becomes a booking button

**Files:**
- Modify: `src/app/gate/page.tsx`
- Modify: `src/app/results/page.tsx`

**Interfaces:**
- Consumes: submit response `assessmentId` + `bookToken` (Task 5); `POST /api/book` (Task 4).

- [ ] **Step 1: Store the booking identifiers at the gate**

In `src/app/gate/page.tsx`, widen the response type and pass the identifiers into `saveResult`:

```tsx
      const result = (await response.json()) as {
        score: number
        scoreRange: 'at_risk' | 'under_strain' | 'strong'
        assessmentId?: string
        bookToken?: string
      }
      saveResult({
        firstName,
        score: result.score,
        scoreRange: result.scoreRange,
        wantsSupport,
        assessmentId: result.assessmentId,
        bookToken: result.bookToken,
      })
```

- [ ] **Step 2: Replace the results page WhatsApp CTA with a booking button**

Replace the entire contents of `src/app/results/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CTA_LABEL, buildResultsCopy, SCORE_LABELS } from '@/lib/questions'
import { loadResult } from '@/lib/quiz-store'
import { cn } from '@/lib/utils'
import type { QuizResult, ScoreRange } from '@/types'

const BADGE_VARIANT: Record<ScoreRange, string> = {
  at_risk: 'bg-[#fde2e2] text-[#991b1b]',
  under_strain: 'bg-[#fef3c7] text-[#92400e]',
  strong: 'bg-[#dcfce7] text-[#166534]',
}

type BookState = 'idle' | 'sending' | 'sent' | 'error'

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [bookState, setBookState] = useState<BookState>('idle')

  useEffect(() => {
    const storedResult = loadResult()
    if (!storedResult) {
      router.replace('/')
      return
    }
    setResult(storedResult)
  }, [router])

  if (!result) return null

  async function book() {
    if (!result?.assessmentId || !result?.bookToken) return
    setBookState('sending')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: result.assessmentId, token: result.bookToken }),
      })
      setBookState(res.ok ? 'sent' : 'error')
    } catch {
      setBookState('error')
    }
  }

  const copy = buildResultsCopy(result.scoreRange, Boolean(result.wantsSupport))
    .replaceAll('[First name]', result.firstName)
    .replaceAll('[SCORE]', String(result.score))
  const sections = copy.split('\n\n')

  return (
    <main className="min-h-screen bg-brand-offwhite px-5 py-[52px] text-brand-black">
      <section className="mx-auto w-full max-w-[680px]">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
          Your Family Connection Score
        </p>
        <p className="my-[6px] mb-[10px] font-display text-[64px] leading-none">
          {result.score} / 80
        </p>
        <span
          className={cn(
            'inline-block rounded-full px-[10px] py-[6px] text-xs font-bold',
            BADGE_VARIANT[result.scoreRange]
          )}
        >
          {SCORE_LABELS[result.scoreRange]}
        </span>
        <div className="mt-[30px]">
          {sections.map((section, index) => {
            if (section === '[CTA BUTTON]') {
              if (bookState === 'sent') {
                return (
                  <p
                    key={index}
                    className="my-[10px] mb-[26px] rounded-[10px] bg-[#dcfce7] px-4 py-3 text-[15px] font-medium text-[#166534]"
                  >
                    Your request is on its way to Ibironke. She will reply to your email shortly.
                  </p>
                )
              }
              return (
                <div key={index} className="my-[10px] mb-[26px]">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={book}
                    disabled={bookState === 'sending' || !result.assessmentId}
                  >
                    {bookState === 'sending' ? 'Sending…' : CTA_LABEL}
                  </button>
                  {bookState === 'error' && (
                    <p className="mt-2 text-sm text-[#b91c1c]">Something went wrong. Please try again.</p>
                  )}
                </div>
              )
            }
            return (
              <p key={index} className="mb-[18px] whitespace-pre-line text-[16px] leading-[1.75]">
                {section}
              </p>
            )
          })}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `npx tsc --noEmit && npx eslint src/app/results/page.tsx src/app/gate/page.tsx && npx next build`
Expected: no errors; build succeeds. (Note: `src/lib/whatsapp.ts` and `/api/settings` may now be unused by the parent flow; leave them — Settings admin still uses them elsewhere. Do not delete.)

- [ ] **Step 4: Commit**

```bash
git add src/app/gate/page.tsx src/app/results/page.tsx
git commit -m "feat: results page Book-your-session fires the owner notification"
```

---

## Task 7: Admin — "Requested a session" on dashboard + respondent detail

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/admin/(panel)/page.tsx`
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx`

**Interfaces:**
- Consumes: `get_dashboard_stats()` now returns `session_requests` (Task 2); `assessments.session_request_at` (Tasks 1/2).

- [ ] **Step 1: Add `session_requests` to `DashboardStats`**

In `src/types/index.ts`, add to `DashboardStats`:

```ts
  session_requests: number
```

- [ ] **Step 2: Add the dashboard card + fix the stats default + grid**

In `src/app/admin/(panel)/page.tsx`:

Update the stats fallback default to include the new key:

```tsx
  const stats: DashboardStats = statsData ?? {
    total: 0,
    at_risk: 0,
    under_strain: 0,
    strong: 0,
    wants_support_yes: 0,
    wants_support_no: 0,
    session_requests: 0,
  }
```

Update the `cards` array to add "Requested a session" after "Would love a session":

```tsx
  const cards = [
    { label: 'Total respondents', value: stats.total },
    { label: 'Would love a session', value: stats.wants_support_yes },
    { label: 'Requested a session', value: stats.session_requests },
    { label: 'Connection at risk', value: stats.at_risk },
    { label: 'Connection under strain', value: stats.under_strain },
    { label: 'Connection is strong', value: stats.strong },
  ]
```

Update the stat-cards grid wrapper to lay 6 cards as 2 rows of 3 on large screens:

```tsx
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
```

- [ ] **Step 3: Show "Requested a session" on the respondent detail page**

In `src/app/admin/(panel)/respondents/[id]/page.tsx`:

Add `session_request_at` to the assessment select:

```tsx
    .select('id, first_name, email, phone, score, score_range, wants_support, session_request_at, answers, submitted_at')
```

Add a line in the profile card immediately after the existing "Wants guided support" line:

```tsx
        <p className="mt-2 text-xs text-brand-muted">
          Requested a session:{' '}
          <span className="font-medium text-brand-black">
            {respondent.session_request_at
              ? `Yes (${formatDate(respondent.session_request_at)})`
              : 'No'}
          </span>
        </p>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts "src/app/admin/(panel)/page.tsx" "src/app/admin/(panel)/respondents/[id]/page.tsx"
git commit -m "feat: surface Requested a session on dashboard and respondent detail"
```

---

## Task 8: Verification + cutover

**Files:** none (operational).

- [ ] **Step 1: Full suite + build**

Run: `npx vitest run && npx next build`
Expected: all tests pass; build succeeds with the new `/book` and `/api/book` routes.

- [ ] **Step 2: USER ACTION — apply migration 007**

In the Supabase SQL Editor (`familydiagnosticquiz`), paste `supabase/migrations/007_session_requests.sql` and Run. Verify:

```sql
select column_name from information_schema.columns
  where table_name = 'assessments' and column_name = 'session_request_at';
select public.get_dashboard_stats();
```

Expected: the column exists and the stats JSON includes `session_requests`.

- [ ] **Step 3: Confirm prod env**

Confirm in Vercel that `EMAIL_REPLY_TO` (ronkesemowo@gmail.com) and `NEXT_PUBLIC_APP_URL` (https://familyassessment.ibironkeosemowo.com) are set — the notification "to" address and the email CTA link both depend on them. `OWNER_EMAIL` is optional (defaults to `EMAIL_REPLY_TO`).

- [ ] **Step 4: Deploy**

Push `main`; Vercel auto-deploys.

- [ ] **Step 5: End-to-end smoke test**

- Take the quiz answering **Yes** to Q17 → results page shows "Book your session"; click it → confirmation appears and Ibironke's inbox receives the notification with Reply-To = the parent's email. The results email also shows the CTA; clicking it lands on `/book` and its button sends.
- Take the quiz answering **No** → no CTA on the results page or in the email; copy still reads well.
- Confirm the dashboard "Requested a session" count and the respondent detail "Requested a session: Yes (date)" reflect the click; confirm a second click does not send a duplicate.
- Clean up the smoke-test rows afterward.

---

## What you (the user) need to do

1. **Apply migration 007** in the Supabase SQL Editor (Task 8, Step 2).
2. **Confirm Vercel env** `EMAIL_REPLY_TO` and `NEXT_PUBLIC_APP_URL` are set (Task 8, Step 3).
3. Everything else (code, tests, commits, deploy, smoke test) I can do — including clearing any smoke-test rows via the service key.
