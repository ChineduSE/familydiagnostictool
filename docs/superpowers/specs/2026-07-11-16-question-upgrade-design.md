# Design: 16-Question Upgrade + Readiness Router

**Date:** 2026-07-11
**Status:** Approved (pending spec review)
**Source of truth:** `docs/Family Connection Diagnosis Toolkit - Updated Version.docx`

## Summary

The Family Connection Diagnosis toolkit grows from **12 scored questions across 6
areas** to **16 scored questions across 8 areas**, changing the max score from 60
to 80 and shifting the three score bands. A new, **unscored** readiness question
(Q17) is added purely as a Yes/No identifier for whether a parent wants guided
support. The Yes/No answer drives an **admin-only** view (dashboard count +
respondents filter) and does not change the parent-facing results page or email.
The results CTA is relabelled to "Book your session" while still opening the same
WhatsApp link with the same pre-filled message.

## Goals

- Replace the 12-question assessment with the 16-question version.
- Update scoring bands to the /80 scale.
- Add Q17 readiness as an unscored router, stored per assessment.
- Surface readiness Yes/No to the admin: a dashboard count and a respondents filter.
- Relabel the CTA to "Book your session" (WhatsApp link + message unchanged).
- Remove all em dashes from new and existing copy.
- Migrate the score check constraint and add readiness columns/stats.

## Non-goals (explicitly out of scope)

- No Resend property-based send segments for Yes/No (free-tier does not support it,
  same reason band targeting was disabled). Yes/No is Supabase/CRM-side only.
- No separate results-page or email variant for "No" responders. Everyone gets the
  same band-based copy, all with the "Book your session" CTA.
- No change to the WhatsApp phone number or pre-filled message copy.
- No archiving of the old docx. The updated docx is the working source.

## Decisions (confirmed with user)

1. **Q17 placement:** Option A — a dedicated final screen in the quiz flow, shown
   after Q16, styled like a question but with the two Yes/No options instead of the
   1–5 scale. Advances to `/gate` afterward.
2. **Q17 routing:** Admin-only split. Parent-facing copy is identical for Yes and No.
3. **Historical data:** User will delete the existing test rows so the /80 scale is
   not mixed with old /60 rows.
4. **CTA:** Label becomes "Book your session"; link + WhatsApp message unchanged.
5. **Em dashes:** None anywhere, including newly imported copy.

## The 16 questions and 8 areas

Q1–Q12 keep their existing wording (already em-dash-cleaned). New material:

- **Section: Parental capacity & bandwidth**
  - Q13 — "On most days, do you have enough unhurried time and mental energy left
    (after work and other demands) to be fully present with your child, not just
    physically in the room?"
  - Q14 — "When work or other pressures are heaviest, do you have a way to protect
    at least some one-on-one time with your child, rather than letting it be the
    first thing to go?"
- **Section: Conflict resolution**
  - Q15 — "During a disagreement with your child, are you able to stay calm enough
    to address the issue without raising your voice or shutting the conversation
    down?"
  - Q16 — "After a conflict is resolved, do you and your child talk about what
    happened (so the same disagreement is less likely to repeat) rather than just
    moving on?"

All new copy uses commas/parentheses instead of em dashes, matching Q1–Q12.

## Score bands (/80)

| Band | Range | Label |
|------|-------|-------|
| `at_risk` | 16–39 | Connection at risk |
| `under_strain` | 40–61 | Connection under strain |
| `strong` | 62–80 | Connection is strong |

`getScoreRange()`: `score <= 39 → at_risk`; `score <= 61 → under_strain`; else `strong`.

## Q17 readiness question (unscored)

Prompt: "Building real connection with your child usually takes more than
information, it takes support and accountability. Is that something you're open to
investing in right now?"

Options:
- Yes → "Yes, I'd welcome guided support" (`wants_support = true`)
- No → "Not right now, I'd like to start with resources I can use on my own"
  (`wants_support = false`)

Stored as a boolean `wants_support` on `assessments`. Never enters the scored
`QUESTIONS` array or the score sum.

## Components and changes

### `src/lib/questions.ts`
- Add Q13–Q16 to `QUESTIONS` (array becomes length 16). Downstream code that reads
  `QUESTIONS.length` (quiz store, submit schema, quiz page progress) adapts
  automatically.
- New exported `READINESS_QUESTION` constant: `{ prompt, options: [{ value: true,
  label }, { value: false, label }] }`. Kept separate from `QUESTIONS`.
- `getScoreRange()` thresholds → 39 / 61.
- `CTA_LABEL` → `"Book your session"`.
- `EMAIL_COPY` and `RESULTS_COPY`: `[SCORE]/60` → `[SCORE]/80`; import any wording
  tweaks from the updated docx; strip all em dashes.

### Quiz flow (Option A)
- `src/types` `QuizSession`: add `readiness: boolean | null`.
- `src/lib/quiz-store.ts` `createSession()`: initialise `readiness: null`. Session
  validity check unchanged (answers length still derives from `QUESTIONS.length`).
- `src/app/quiz/page.tsx`: after the last scored question (`currentIndex ===
  QUESTIONS.length - 1`), advance to a readiness step rather than straight to
  `/gate`. Render the readiness screen (2 options) when the flow reaches the
  readiness step; selecting an option stores `readiness` and routes to `/gate`.
  Keep the existing back-button behaviour.
- `src/app/gate/page.tsx`: read `readiness` from the session; block/redirect if the
  session is incomplete OR readiness is unset; include `wantsSupport` in the POST
  body to `/api/submit`.

### `src/lib/submit-schema.ts`
- `answers` length continues to derive from `QUESTIONS.length` (now 16).
- Add `wantsSupport: z.boolean()`.

### `src/app/api/submit/route.ts`
- Persist `wants_support` on the `assessments` insert.
- Score sum and per-section structured answers already adapt to 16 questions.
- Email send path unchanged apart from the copy update.

### Database — new migration `006_16_question_upgrade.sql`
- `assessments.score` check: drop `between 12 and 60`, add `between 16 and 80`.
- `assessments` add column `wants_support boolean`.
- Replace `get_dashboard_stats()` to also return `wants_support_yes` and
  `wants_support_no` (count filters over `assessments`).
- Update the default WhatsApp message template seed text `/60` → `/80`. Note: the
  live value in `settings` is admin-editable and may need a manual bump if already
  customised.

### Admin dashboard — `src/app/admin/(panel)/page.tsx`
- Add a card "Would love a session" bound to `stats.wants_support_yes`.
- Fix hardcoded `{r.score} / 60` → `/ 80`.
- `DashboardStats` type gains `wants_support_yes` / `wants_support_no`.

### Respondents — list + detail
- `src/app/admin/(panel)/respondents/page.tsx`: add a `support=all|yes|no` filter
  (validated like `range`/`sort`), applied as `.eq('wants_support', …)` when not
  `all`. Select `wants_support` in the query.
- `RespondentsControls`: add the support filter control.
- `RespondentRow` + respondent detail page: show the Yes/No value; fix `/ 60` → `/ 80`.

### Other `/60` display fixes
- `src/app/results/page.tsx`: `{result.score} / 60` → `/ 80`.

### Tests
- `src/lib/questions.test.ts`: expect 16 questions; assert new band thresholds
  (e.g. 39/40 and 61/62 boundaries); assert readiness is absent from `QUESTIONS`.
- `src/lib/submit-schema.test.ts`: expect 16 answers; `wantsSupport` required and
  boolean; a case asserting the score is computed only from the 16 answers.

## Data flow

1. Parent answers Q1–Q16 (scored) → Q17 readiness (unscored) in the quiz.
2. `/gate` collects name/email/phone; POSTs `{ firstName, email, phone,
   marketingConsent, answers[16], wantsSupport }`.
3. `/api/submit` sums the 16 answers, derives the band, upserts the contact,
   inserts the assessment (with `wants_support`), sends the results email, returns
   `{ score, scoreRange }`.
4. Results page shows the /80 score, band copy, and the "Book your session" CTA
   (WhatsApp link unchanged).
5. Admin dashboard shows band counts + "Would love a session" count; respondents
   list filters by Yes/No.

## Manual step for the user (not code)

Before/at cutover, delete the historical test rows so scales don't mix:
`email_messages`, then `assessments`, then `contacts` (respecting FK order).

## Risks / notes

- Any live respondent submitting during deploy is fine; the schema change is
  additive plus a widened score range. Old rows are being deleted anyway.
- The `settings` live WhatsApp message template is admin-editable; the migration
  only fixes the default seed, so an already-customised value with `/60` needs a
  manual edit in Settings.
