# 16-Question Upgrade + Readiness Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the diagnostic from 12 to 16 scored questions (max score 60 to 80, new bands), add an unscored Yes/No readiness router (Q17) surfaced only in the admin, and relabel the results CTA to "Book your session" (WhatsApp link unchanged).

**Architecture:** The scored `QUESTIONS` array drives the whole app (quiz length, progress, schema length, scoring). Adding four questions and shifting `getScoreRange()` thresholds propagates automatically to most call sites. The readiness answer rides alongside as a separate boolean (`wants_support`) through session -> gate -> submit route -> `assessments` row, then feeds a dashboard count and a respondents filter. A single new SQL migration widens the score check, adds the column, and updates the stats function.

**Tech Stack:** Next.js (App Router), TypeScript, Zod, Supabase (Postgres + RLS), Vitest, Tailwind.

## Global Constraints

- **No em dashes** (`—`) anywhere in quiz questions, results copy, or email copy. Use commas/parentheses/periods.
- **Score scale is /80** in all user-facing copy and UI (never `/60`).
- **Score bands:** `at_risk` 16-39, `under_strain` 40-61, `strong` 62-80.
- **Readiness (Q17) is never scored** and never enters the `QUESTIONS` array or the score sum.
- **Parent-facing copy is identical for Yes and No** readiness answers (admin-only split).
- **CTA label:** `"Book your session"`; the WhatsApp URL and pre-filled message are unchanged.
- **No Resend send-segments** for Yes/No — Supabase/CRM-side only.
- Supabase project: `familydiagnosticquiz` (ref `lobsyoxlllfyafpfbqcp`).

---

## Task 1: Questions, bands, CTA label, readiness constant, /80 copy

**Files:**
- Modify: `src/lib/questions.ts`
- Test: `src/lib/questions.test.ts`

**Interfaces:**
- Consumes: `ScoreRange` from `@/types`.
- Produces:
  - `QUESTIONS` — array of length 16, each `{ id: string; section: string; text: string }`.
  - `READINESS_QUESTION: { prompt: string; options: ReadonlyArray<{ value: boolean; label: string }> }`.
  - `getScoreRange(score: number): ScoreRange` — thresholds 39 / 61.
  - `CTA_LABEL: string` = `"Book your session"`.
  - `EMAIL_COPY`, `RESULTS_COPY` — unchanged shape, `/80` in text.

- [ ] **Step 1: Update the failing tests first**

Replace the whole body of `src/lib/questions.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { getScoreRange, QUESTIONS, READINESS_QUESTION } from '@/lib/questions'

// The quiz is 16 questions scored 1–5, so totals run from 16 to 80.
const MIN_SCORE = QUESTIONS.length * 1
const MAX_SCORE = QUESTIONS.length * 5

describe('getScoreRange band boundaries', () => {
  it('treats the minimum possible score as at risk', () => {
    expect(getScoreRange(MIN_SCORE)).toBe('at_risk')
  })

  it('is at_risk at the top of the at-risk band (39)', () => {
    expect(getScoreRange(39)).toBe('at_risk')
  })

  it('flips to under_strain at 40', () => {
    expect(getScoreRange(40)).toBe('under_strain')
  })

  it('is under_strain at the top of that band (61)', () => {
    expect(getScoreRange(61)).toBe('under_strain')
  })

  it('flips to strong at 62', () => {
    expect(getScoreRange(62)).toBe('strong')
  })

  it('treats the maximum possible score as strong', () => {
    expect(getScoreRange(MAX_SCORE)).toBe('strong')
  })
})

describe('quiz shape', () => {
  it('has 16 questions', () => {
    expect(QUESTIONS).toHaveLength(16)
  })

  it('does not include the readiness question in the scored set', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(ids).not.toContain('Q17')
    expect(ids).not.toContain('readiness')
  })

  it('exposes a readiness question with two options', () => {
    expect(READINESS_QUESTION.options).toHaveLength(2)
    expect(READINESS_QUESTION.options.map((o) => o.value)).toEqual([true, false])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/questions.test.ts`
Expected: FAIL — `READINESS_QUESTION` is undefined and `QUESTIONS` has length 12.

- [ ] **Step 3: Add Q13–Q16 to `QUESTIONS`**

In `src/lib/questions.ts`, inside the `QUESTIONS` array, after the existing Q12 object (before the closing `] as const`), add:

```ts
  {
    id: 'Q13',
    section: 'Parental capacity & bandwidth',
    text: 'On most days, do you have enough unhurried time and mental energy left (after work and other demands) to be fully present with your child, not just physically in the room?',
  },
  {
    id: 'Q14',
    section: 'Parental capacity & bandwidth',
    text: 'When work or other pressures are heaviest, do you have a way to protect at least some one-on-one time with your child, rather than letting it be the first thing to go?',
  },
  {
    id: 'Q15',
    section: 'Conflict resolution',
    text: 'During a disagreement with your child, are you able to stay calm enough to address the issue without raising your voice or shutting the conversation down?',
  },
  {
    id: 'Q16',
    section: 'Conflict resolution',
    text: 'After a conflict is resolved, do you and your child talk about what happened (so the same disagreement is less likely to repeat) rather than just moving on?',
  },
```

- [ ] **Step 4: Add the readiness constant**

In `src/lib/questions.ts`, immediately after the `QUESTIONS` array (before `SCALE_LABELS`), add:

```ts
// Q17 readiness router — NOT scored, never part of QUESTIONS or the score sum.
// A pure Yes/No identifier used admin-side to see who wants guided support.
export const READINESS_QUESTION = {
  prompt:
    "Building real connection with your child usually takes more than information, it takes support and accountability. Is that something you're open to investing in right now?",
  options: [
    { value: true, label: "Yes, I'd welcome guided support" },
    { value: false, label: 'Not right now, I would like to start with resources I can use on my own' },
  ],
} as const
```

- [ ] **Step 5: Shift the band thresholds**

In `src/lib/questions.ts`, replace the body of `getScoreRange`:

```ts
export function getScoreRange(score: number): ScoreRange {
  if (score <= 39) return 'at_risk'
  if (score <= 61) return 'under_strain'
  return 'strong'
}
```

- [ ] **Step 6: Relabel the CTA**

In `src/lib/questions.ts`, change the `CTA_LABEL` constant to:

```ts
export const CTA_LABEL = 'Book your session'
```

Leave the comment above it, but update it to read: `// Label for the call-to-action button shown on the results page and in emails. The button still opens Ibironke's personal WhatsApp with the pre-written, personalised message (number + template set in admin settings).`

- [ ] **Step 7: Change /60 to /80 in the copy**

In `src/lib/questions.ts`, in `EMAIL_COPY`, update the three body strings so each `[SCORE]/60` reads `[SCORE]/80`:
- `at_risk`: `Your score of [SCORE]/80 places you in the Connection at Risk range.`
- `under_strain`: `Your score of [SCORE]/80 places you in the Connection Under Strain range.`
- `strong`: `Your Family Connection Score of [SCORE]/80 places you in the Connection is Strong range.`

(The existing `RESULTS_COPY` strings do not contain `/60`, so they stay as-is. The current copy is already the em-dash-cleaned version of the toolkit text; no wording changes needed.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/lib/questions.test.ts`
Expected: PASS (all boundary and shape tests green).

- [ ] **Step 9: Commit**

```bash
git add src/lib/questions.ts src/lib/questions.test.ts
git commit -m "feat: 16 questions, /80 bands, readiness constant, Book your session CTA"
```

---

## Task 2: Data contract — types, submit schema, session

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/submit-schema.ts`
- Modify: `src/lib/quiz-store.ts`
- Test: `src/lib/submit-schema.test.ts`

**Interfaces:**
- Consumes: `QUESTIONS` (length 16) from Task 1.
- Produces:
  - `submitSchema` now requires `wantsSupport: boolean` alongside the existing fields; `answers` length is 16.
  - `QuizSession` gains `readiness: boolean | null`.
  - `Assessment` gains `wants_support: boolean | null`.
  - `DashboardStats` gains `wants_support_yes: number` and `wants_support_no: number`.

- [ ] **Step 1: Update the failing schema tests first**

In `src/lib/submit-schema.test.ts`, change `validPayload` to include `wantsSupport`, and add two new cases. Replace the `validPayload` declaration:

```ts
const validPayload = {
  firstName: 'Ada',
  email: 'ada@example.com',
  phone: '08012345678',
  marketingConsent: true,
  answers: validAnswers,
  wantsSupport: true,
}
```

Then add these cases inside the `describe('submitSchema', ...)` block:

```ts
  it('accepts wantsSupport = false', () => {
    expect(submitSchema.safeParse({ ...validPayload, wantsSupport: false }).success).toBe(true)
  })

  it('rejects a missing wantsSupport', () => {
    const { wantsSupport, ...withoutReadiness } = validPayload
    void wantsSupport
    expect(submitSchema.safeParse(withoutReadiness).success).toBe(false)
  })

  it('rejects a non-boolean wantsSupport', () => {
    expect(submitSchema.safeParse({ ...validPayload, wantsSupport: 'yes' }).success).toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/submit-schema.test.ts`
Expected: FAIL — schema does not yet know `wantsSupport`; "rejects a missing wantsSupport" fails because the field is currently ignored.

- [ ] **Step 3: Add `wantsSupport` to the schema**

In `src/lib/submit-schema.ts`, add the field to the object (after `answers`):

```ts
export const submitSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  // Opt-out model: completing the quiz subscribes the parent. Kept in the schema
  // for record-keeping; defaults true if the client omits it.
  marketingConsent: z.boolean().default(true),
  answers: z.array(z.number().int().min(1).max(5)).length(QUESTIONS.length),
  // Q17 readiness router (unscored): true = "yes, I'd welcome guided support".
  wantsSupport: z.boolean(),
})
```

- [ ] **Step 4: Run the schema tests to verify they pass**

Run: `npx vitest run src/lib/submit-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `readiness` to `QuizSession`**

In `src/types/index.ts`, update `QuizSession`:

```ts
export type QuizSession = {
  answers: Array<number | null>
  currentIndex: number
  readiness: boolean | null
}
```

- [ ] **Step 6: Add `wants_support` to `Assessment` and the two stat fields to `DashboardStats`**

In `src/types/index.ts`, in the `Assessment` type add after `score_range`:

```ts
  wants_support: boolean | null
```

And replace `DashboardStats`:

```ts
export type DashboardStats = {
  total: number
  at_risk: number
  under_strain: number
  strong: number
  wants_support_yes: number
  wants_support_no: number
}
```

- [ ] **Step 7: Initialise `readiness` in `createSession`**

In `src/lib/quiz-store.ts`, update `createSession`:

```ts
export function createSession(): QuizSession {
  return {
    answers: Array.from({ length: QUESTIONS.length }, () => null),
    currentIndex: 0,
    readiness: null,
  }
}
```

Leave `loadSession` as-is (it already validates `answers.length`; a stored session missing `readiness` will surface as `undefined`, which the gate treats as "not answered" and redirects).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `tsc` reports the `readiness` field is required somewhere that builds a `QuizSession` literal, that is Task 3's `quiz/page.tsx` — expected and fixed there. If it blocks here, proceed; the next task resolves it.)

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/lib/submit-schema.ts src/lib/quiz-store.ts src/lib/submit-schema.test.ts
git commit -m "feat: add wantsSupport to schema, session, and admin types"
```

---

## Task 3: Quiz readiness step + gate wiring (Option A)

**Files:**
- Modify: `src/app/quiz/page.tsx`
- Modify: `src/app/gate/page.tsx`

**Interfaces:**
- Consumes: `READINESS_QUESTION` (Task 1), `QuizSession.readiness` (Task 2).
- Produces: the `/gate` POST body now includes `wantsSupport: boolean`.

- [ ] **Step 1: Add the readiness step to the quiz page**

Replace the entire contents of `src/app/quiz/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS, READINESS_QUESTION, SCALE_LABELS } from '@/lib/questions'
import { createSession, loadSession, saveSession } from '@/lib/quiz-store'
import { cn } from '@/lib/utils'
import type { QuizSession } from '@/types'

// currentIndex runs 0..QUESTIONS.length-1 for scored questions, and equals
// QUESTIONS.length for the final (unscored) readiness screen.
const READINESS_INDEX = QUESTIONS.length

export default function QuizPage() {
  const router = useRouter()
  const [session, setSession] = useState<QuizSession | null>(null)
  // True during the brief pause after a click, so the selected answer shows its
  // fill before we advance — and so a second click can't register mid-transition.
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    const storedSession = loadSession() ?? createSession()
    saveSession(storedSession)
    setSession(storedSession)
  }, [])

  if (!session) return null

  const onReadiness = session.currentIndex >= READINESS_INDEX

  function selectAnswer(value: number) {
    if (!session || advancing) return

    const answers = [...session.answers]
    answers[session.currentIndex] = value
    const currentIndex = session.currentIndex

    // 1. Show the selection on the CURRENT question (gold fill) right away.
    const answeredSession = { ...session, answers }
    saveSession(answeredSession)
    setSession(answeredSession)
    setAdvancing(true)

    // 2. After a short beat so the fill is visible, advance. After the last
    //    scored question this lands on READINESS_INDEX (the readiness screen).
    window.setTimeout(() => {
      const nextSession = { ...session, answers, currentIndex: currentIndex + 1 }
      saveSession(nextSession)
      setSession(nextSession)
      setAdvancing(false)
    }, 300)
  }

  function selectReadiness(value: boolean) {
    if (!session || advancing) return
    const nextSession = { ...session, readiness: value }
    saveSession(nextSession)
    setSession(nextSession)
    router.push('/gate')
  }

  function goBack() {
    if (!session || session.currentIndex === 0) return
    const nextSession = { ...session, currentIndex: session.currentIndex - 1 }
    saveSession(nextSession)
    setSession(nextSession)
  }

  if (onReadiness) {
    return (
      <main className="min-h-screen bg-brand-offwhite px-5 py-8 text-brand-black">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[640px] flex-col justify-center text-center">
          <h2 className="mb-6 font-display text-[clamp(22px,4.5vw,32px)] font-semibold text-brand-black">
            One last question
          </h2>

          <p className="mx-auto mb-8 mt-2 max-w-[560px] text-[clamp(19px,3.5vw,26px)] leading-[1.5]">
            {READINESS_QUESTION.prompt}
          </p>

          <div className="mx-auto grid w-full max-w-[560px] gap-[10px]">
            {READINESS_QUESTION.options.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => selectReadiness(option.value)}
                className="min-h-[58px] rounded-[10px] border border-[#d9d4cb] bg-brand-white px-5 py-[14px] text-[16px] text-brand-black transition-[transform,border-color,background-color] duration-150 hover:border-brand-gold hover:bg-brand-gold active:scale-95"
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            className="mx-auto mt-7 cursor-pointer border-0 bg-transparent p-0 text-brand-muted transition-colors hover:text-brand-black"
            type="button"
            onClick={goBack}
          >
            ← Back
          </button>
        </section>
      </main>
    )
  }

  const question = QUESTIONS[session.currentIndex]
  const current = session.currentIndex + 1

  return (
    <main className="min-h-screen bg-brand-offwhite px-5 py-8 text-brand-black">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[640px] flex-col justify-center text-center">
        {/* Section header — stands out above the progress bar */}
        <h2 className="mb-6 font-display text-[clamp(22px,4.5vw,32px)] font-semibold text-brand-black">
          {question.section}
        </h2>

        {/* Progress */}
        <div className="mx-auto w-full max-w-[440px]">
          <p className="mb-[10px] text-xs font-medium text-brand-muted">
            Question {current} of {QUESTIONS.length}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-[inherit] bg-brand-gold transition-[width] duration-300"
              style={{ width: `${(current / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <p className="mx-auto mb-7 mt-8 max-w-[560px] text-[clamp(19px,3.5vw,26px)] leading-[1.5]">
          {question.text}
        </p>

        {/* Answer scale */}
        <div className="mx-auto grid w-full max-w-[560px] grid-cols-5 gap-[9px] max-[620px]:grid-cols-1">
          {Object.entries(SCALE_LABELS).map(([value, label]) => {
            const numericValue = Number(value)
            const selected = session.answers[session.currentIndex] === numericValue

            return (
              <button
                className={cn(
                  'min-h-[82px] rounded-[10px] border px-[5px] py-[10px] transition-[transform,border-color,background-color] duration-150 active:scale-95',
                  'max-[620px]:flex max-[620px]:min-h-[52px] max-[620px]:items-center max-[620px]:justify-center max-[620px]:gap-[10px] max-[620px]:px-4',
                  selected
                    ? 'border-brand-gold bg-brand-gold text-brand-black'
                    : 'border-[#d9d4cb] bg-brand-white text-brand-black hover:border-brand-gold hover:bg-brand-gold'
                )}
                key={value}
                type="button"
                disabled={advancing}
                onClick={() => selectAnswer(numericValue)}
              >
                <span className="mb-2 block text-[19px] font-bold max-[620px]:mb-0">{value}</span>
                <span className="block text-[11px]">{label}</span>
              </button>
            )
          })}
        </div>

        {session.currentIndex > 0 && (
          <button
            className="mx-auto mt-7 cursor-pointer border-0 bg-transparent p-0 text-brand-muted transition-colors hover:text-brand-black"
            type="button"
            onClick={goBack}
          >
            ← Back
          </button>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Wire readiness through the gate**

In `src/app/gate/page.tsx`, make three edits.

(a) Add a `wantsSupport` state and read it from the session. Change the state block and the effect:

```tsx
  const [answers, setAnswers] = useState<number[] | null>(null)
  const [wantsSupport, setWantsSupport] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    const session = loadSession()
    if (!session || !isComplete(session) || session.readiness === null || session.readiness === undefined) {
      router.replace('/')
      return
    }

    setAnswers(session.answers as number[])
    setWantsSupport(session.readiness)
  }, [router])
```

(b) Guard the submit handler and include `wantsSupport` in the POST body. Change the top of `handleSubmit` and the `fetch` body:

```tsx
    if (!answers || wantsSupport === null) return
```

```tsx
        body: JSON.stringify({ firstName, email, phone, marketingConsent, answers, wantsSupport }),
```

(c) Update the early return guard at the bottom of the component:

```tsx
  if (!answers || wantsSupport === null) return null
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/quiz/page.tsx src/app/gate/page.tsx`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the quiz, answer all 16 questions, confirm the readiness screen appears as a 17th screen with two buttons and a Back link, pick one, and confirm you land on `/gate`. (Do not submit yet — the DB column arrives in Task 5; a submit before the migration will 500 on insert. This step only verifies the UI flow reaches the gate.)

- [ ] **Step 5: Commit**

```bash
git add src/app/quiz/page.tsx src/app/gate/page.tsx
git commit -m "feat: add readiness screen to quiz and pass wantsSupport through gate"
```

---

## Task 4: Persist `wants_support` in the submit route

**Files:**
- Modify: `src/app/api/submit/route.ts`

**Interfaces:**
- Consumes: `submitSchema` (now includes `wantsSupport`), `assessments.wants_support` column (created in Task 5).
- Produces: each `assessments` insert carries `wants_support`.

- [ ] **Step 1: Destructure and insert `wantsSupport`**

In `src/app/api/submit/route.ts`, add `wantsSupport` to the destructure:

```ts
  const { firstName, email, phone, marketingConsent, answers, wantsSupport } = parsed.data
```

Then in the `assessments` insert object, add the column (after `score_range: scoreRange,`):

```ts
        wants_support: wantsSupport,
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/submit/route.ts
git commit -m "feat: persist wants_support on assessment submissions"
```

---

## Task 5: Database migration (widen score, add column, stats, WhatsApp template)

**Files:**
- Create: `supabase/migrations/006_16_question_upgrade.sql`

**Interfaces:**
- Produces: `assessments.wants_support` column, widened score check (16–80), `get_dashboard_stats()` returning `wants_support_yes`/`wants_support_no`, and the settings WhatsApp template updated from `/60` to `/80`.

> **YOU (the user) run this one.** There is no Supabase CLI / psql / DB password in this environment, so I cannot apply DDL. After the file is written and committed, open the Supabase dashboard for project `familydiagnosticquiz` → SQL Editor → paste the file contents → Run. Confirm "Success" before executing later tasks that submit the quiz end to end.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/006_16_question_upgrade.sql`:

```sql
-- 006: 16-question upgrade + readiness router
-- Widens scoring to the /80 scale, adds the unscored readiness column,
-- extends dashboard stats with Yes/No readiness counts, and bumps the
-- default WhatsApp message from /60 to /80.

-- 1. Widen the score check for the /80 scale (16 questions × 1..5 = 16..80).
--    The inline check from migration 001 is auto-named assessments_score_check.
alter table public.assessments drop constraint if exists assessments_score_check;
alter table public.assessments
  add constraint assessments_score_check check (score between 16 and 80);

-- 2. Readiness router (Q17), unscored. true = "yes, I'd welcome guided support".
alter table public.assessments
  add column if not exists wants_support boolean;

-- 3. Dashboard stats now include readiness Yes/No counts.
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
    'wants_support_no',  count(*) filter (where wants_support is false)
  )
  from public.assessments;
$$;

-- 4. Bump the live WhatsApp message template from /60 to /80 (safe substring swap).
update public.settings
  set whatsapp_message_template = replace(whatsapp_message_template, '/60', '/80')
  where whatsapp_message_template like '%/60%';
```

- [ ] **Step 2: Commit the file**

```bash
git add supabase/migrations/006_16_question_upgrade.sql
git commit -m "feat: migration for /80 scale, wants_support, readiness stats"
```

- [ ] **Step 3: USER ACTION — apply the migration**

In the Supabase dashboard (`familydiagnosticquiz` → SQL Editor), paste the file contents and Run. Expected: `Success. No rows returned` (the final UPDATE may report the number of settings rows touched, 0 or 1). Verify with:

```sql
select column_name from information_schema.columns
  where table_name = 'assessments' and column_name = 'wants_support';
select public.get_dashboard_stats();
```

Expected: the column exists, and the stats JSON now has `wants_support_yes` / `wants_support_no` keys.

---

## Task 6: /80 display fixes + dashboard readiness card

**Files:**
- Modify: `src/app/admin/(panel)/page.tsx`
- Modify: `src/app/results/page.tsx`
- Modify: `src/components/admin/RespondentRow.tsx`
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx`

**Interfaces:**
- Consumes: `DashboardStats` (with `wants_support_yes`) from Task 2, `get_dashboard_stats()` from Task 5.

- [ ] **Step 1: Dashboard — /80 and readiness card**

In `src/app/admin/(panel)/page.tsx`:

Replace the stats default:

```tsx
  const stats: DashboardStats = statsData ?? {
    total: 0,
    at_risk: 0,
    under_strain: 0,
    strong: 0,
    wants_support_yes: 0,
    wants_support_no: 0,
  }
```

Replace the `cards` array:

```tsx
  const cards = [
    { label: 'Total respondents', value: stats.total },
    { label: 'Would love a session', value: stats.wants_support_yes },
    { label: 'Connection at risk', value: stats.at_risk },
    { label: 'Connection under strain', value: stats.under_strain },
    { label: 'Connection is strong', value: stats.strong },
  ]
```

Change the grid so five cards lay out cleanly — update the grid wrapper className:

```tsx
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
```

Change the recent-table score cell:

```tsx
                      <td className="px-4 py-3">{r.score} / 80</td>
```

- [ ] **Step 2: Results page — /80**

In `src/app/results/page.tsx`, change the score display:

```tsx
        <p className="my-[6px] mb-[10px] font-display text-[64px] leading-none">
          {result.score} / 80
        </p>
```

- [ ] **Step 3: RespondentRow — /80**

In `src/components/admin/RespondentRow.tsx`, change:

```tsx
      <td className="px-4 py-3">{r.score} / 80</td>
```

- [ ] **Step 4: Respondent detail — /80**

In `src/app/admin/(panel)/respondents/[id]/page.tsx`, change:

```tsx
          <span className="font-display text-2xl">{respondent.score} / 80</span>
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(panel)/page.tsx" src/app/results/page.tsx src/components/admin/RespondentRow.tsx "src/app/admin/(panel)/respondents/[id]/page.tsx"
git commit -m "feat: show /80 scale and add Would love a session dashboard card"
```

---

## Task 7: Respondents Yes/No filter + display

**Files:**
- Modify: `src/app/admin/(panel)/respondents/page.tsx`
- Modify: `src/components/admin/RespondentsControls.tsx`
- Modify: `src/components/admin/RespondentRow.tsx`
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx`

**Interfaces:**
- Consumes: `assessments.wants_support` column.
- Produces: `/admin/respondents?support=yes|no|all` filter; a "Support" column in the list and a readiness line on the detail page.

- [ ] **Step 1: Add the `support` param + query filter + select**

In `src/app/admin/(panel)/respondents/page.tsx`:

Add a valid-values constant near the top:

```tsx
const VALID_SUPPORT = ['all', 'yes', 'no']
```

Extend the `SearchParams` type and parsing:

```tsx
type SearchParams = Promise<{ range?: string; sort?: string; support?: string }>
```

```tsx
  const support = VALID_SUPPORT.includes(sp.support ?? '') ? (sp.support as string) : 'all'
```

Add `wants_support` to the select:

```tsx
    .select('id, first_name, email, phone, score, score_range, wants_support, submitted_at')
```

Apply the filter after the existing range filter:

```tsx
  if (range !== 'all') query = query.eq('score_range', range)
  if (support === 'yes') query = query.eq('wants_support', true)
  if (support === 'no') query = query.eq('wants_support', false)
```

Update the "isFiltered" flag and pass `support` to the controls:

```tsx
  const isFiltered = range !== 'all' || support !== 'all'
```

```tsx
        <RespondentsControls range={range} sort={sort} support={support} />
```

Add a "Support" column header (after the "Range" header):

```tsx
                <th className="px-4 py-3 font-medium">Range</th>
                <th className="px-4 py-3 font-medium">Support</th>
```

- [ ] **Step 2: Add the support control**

In `src/components/admin/RespondentsControls.tsx`, add a `SUPPORT` list under `SORTS`:

```tsx
const SUPPORT = [
  { key: 'all', label: 'Everyone' },
  { key: 'yes', label: 'Wants support' },
  { key: 'no', label: 'Self-guided' },
]
```

Change the component signature:

```tsx
export function RespondentsControls({
  range,
  sort,
  support,
}: {
  range: string
  sort: string
  support: string
}) {
```

Add a second pill group after the range group (before the sort `<select>`):

```tsx
      <div className="flex flex-wrap gap-1">
        {SUPPORT.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setParam('support', s.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              support === s.key
                ? 'bg-brand-black text-brand-white'
                : 'bg-black/5 text-brand-muted hover:bg-black/10'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
```

- [ ] **Step 3: Show support in the row**

In `src/components/admin/RespondentRow.tsx`, add `wants_support` to the `Respondent` type:

```tsx
type Respondent = {
  id: string
  first_name: string
  email: string
  phone: string | null
  score: number
  score_range: string
  wants_support: boolean | null
  submitted_at: string
}
```

Add a cell after the Range cell (the `<RangeBadge>` cell):

```tsx
      <td className="px-4 py-3 text-brand-muted">
        {r.wants_support === true ? 'Yes' : r.wants_support === false ? 'No' : '—'}
      </td>
```

- [ ] **Step 4: Show readiness on the detail page**

In `src/app/admin/(panel)/respondents/[id]/page.tsx`, add `wants_support` to the select:

```tsx
    .select('id, first_name, email, phone, score, score_range, wants_support, answers, submitted_at')
```

Add a readiness line inside the profile card, right after the `<p>` showing "Submitted …":

```tsx
        <p className="mt-2 text-xs text-brand-muted">
          Wants guided support:{' '}
          <span className="font-medium text-brand-black">
            {respondent.wants_support === true
              ? 'Yes'
              : respondent.wants_support === false
                ? 'No'
                : 'Not answered'}
          </span>
        </p>
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/admin/(panel)/respondents/page.tsx" src/components/admin/RespondentsControls.tsx src/components/admin/RespondentRow.tsx`
Expected: no errors.

- [ ] **Step 6: Manual verification (after Task 5 migration is applied)**

Run the quiz end to end twice — once choosing "Yes", once "No" — then in `/admin/respondents` toggle the Support pills and confirm filtering works, the Support column shows Yes/No, and the dashboard "Would love a session" count increments only for Yes.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(panel)/respondents/page.tsx" src/components/admin/RespondentsControls.tsx src/components/admin/RespondentRow.tsx "src/app/admin/(panel)/respondents/[id]/page.tsx"
git commit -m "feat: filter and display readiness (wants_support) in admin respondents"
```

---

## Task 8: Full verification + historical data reset

**Files:** none (operational).

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: all files pass (including the updated `questions.test.ts` and `submit-schema.test.ts`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: USER ACTION — delete historical test data**

Old rows were scored on the /60 scale and would mix with new /80 data. In the Supabase SQL Editor (project `familydiagnosticquiz`), run in this FK-safe order:

```sql
delete from public.email_messages;
delete from public.email_events;
delete from public.assessments;
delete from public.contacts;
```

(These are all test rows. `broadcasts` and `settings` are left intact.) If you'd rather I run this for you, I can — I have the service-role key and can issue the deletes over the API; just say the word and confirm you want the tables cleared.

- [ ] **Step 4: USER ACTION — confirm the live WhatsApp message**

The Task 5 migration already swapped `/60` → `/80` in the settings template. Open `/admin/settings` and eyeball the WhatsApp message to confirm it reads "/80" (or whatever you prefer). Adjust if you had custom wording.

- [ ] **Step 5: Final end-to-end sanity check**

On the deployed (or local) app: take the quiz fully, verify the results page shows `NN / 80`, the correct band, and a **"Book your session"** button that opens WhatsApp with the pre-filled message showing the /80 score. Confirm the results email arrives with `/80` in the body.

---

## Cutover runbook (ORDER MATTERS)

The final review flagged one operational risk: the old DB constraint is `score between 12 and 60`, and the new frontend produces scores up to 80. If the new frontend goes live *before* migration 006, any submission scoring 62–80 hits the old constraint, the insert fails, and that parent gets a 500 instead of results. Conversely, applying migration 006 while the *old* 12-question frontend is still live would reject an old score of 12–15 (now below the widened floor of 16). Either way there is a brief mismatched window, so do these in order and close together:

1. **Apply migration 006** in the Supabase SQL Editor for `familydiagnosticquiz` (Task 5, Step 3) — I cannot run DDL from here. This widens the score check to 16–80 and adds the readiness column/stats.
2. **Delete the historical test data** (Task 8, Step 3) — clears the old /60 rows (including any 12–15 scores) so nothing violates the widened floor. Tell me to run it via the service-role key, or do it in the dashboard.
3. **Deploy the frontend** (push to `main` → Vercel auto-deploy) — the 16-question quiz. Do this right after steps 1–2.
4. **Eyeball the WhatsApp settings message** reads /80 (Task 8, Step 4).
5. **End-to-end sanity check** (Task 8, Step 5) — take the quiz, confirm `NN / 80`, correct band, "Book your session" opens WhatsApp, results email shows /80.

Because the historical rows are test-only and traffic is effectively nil during a solo launch, the mismatched window is not a real concern here — but following this order removes it entirely.

Everything else (code, tests, commits) I can do.
