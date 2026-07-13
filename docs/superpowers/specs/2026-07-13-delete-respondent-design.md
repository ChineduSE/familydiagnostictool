# Design: Delete a respondent from the admin

**Date:** 2026-07-13
**Status:** Approved (pending spec review)

## Summary

Add a "Delete respondent" action to the admin respondent detail page so the owner
can remove a person (typically test data) without touching SQL. Deleting removes
the whole person by email: their `contact` row, all their `assessments`, and the
related `email_messages`. A guarded `DELETE /api/admin/respondents/[id]` endpoint
does the work with the service-role client; the page shows a two-step inline
confirm button and redirects to the respondents list on success.

## Goals

- One-click (with confirm) removal of a test/unwanted respondent from the admin UI.
- Delete the whole person by email: contact + all their assessments + email_messages.
- Admin-only, server-side, safe against accidental clicks.

## Non-goals

- No delete control on the respondents list rows (detail page only, to reduce
  accidental deletes).
- No "just this submission" mode (whole-person only, per the owner's choice).
- No soft-delete / undo / archive — this is a hard delete of test data.
- No cleanup of `email_events` (Resend webhook logs keyed by `resend_email_id`,
  not respondent-linked; harmless as orphans).

## Decisions (confirmed with user)

1. **Scope:** whole person, keyed by the assessment's `email`.
2. **Placement:** respondent detail page only.
3. **Confirm UX:** two-step inline confirm (button → "Yes, delete permanently" +
   "Cancel"), not a native browser dialog.

## API — `DELETE /api/admin/respondents/[id]`

`[id]` is the assessment id (the detail page's route param). Pattern mirrors the
existing admin routes (`requireActiveAdmin()` + `createSupabaseAdmin()`).

Steps:
1. `const auth = await requireActiveAdmin(); if (!auth.ok) return auth.response` (401).
2. `createSupabaseAdmin()`; if null → 500 "Server not configured".
3. Load the assessment by `id`, selecting `id, email, contact_id`. If not found → 404.
4. Resolve the person:
   - `email` from the loaded assessment.
   - `assessmentIds` = all `assessments.id` where `email = <email>`.
5. Delete in FK-safe order:
   - `email_messages` where `assessment_id in (assessmentIds)`.
   - `email_messages` where `contact_id = <contact_id>` (if `contact_id` present),
     to catch any not linked to an assessment.
   - `assessments` where `email = <email>`.
   - `contacts` where `email = <email>`.
6. Return `{ success: true }`. On any delete error → 500 `{ success: false }`.

Notes:
- The service-role client bypasses RLS (deletes are otherwise blocked).
- FK behavior: `email_messages.assessment_id`/`contact_id` and
  `assessments.contact_id` are `on delete set null`, so order is not strictly
  required, but deleting children first keeps the data clean and avoids orphan
  rows lingering with null links.

## UI — `DeleteRespondentButton` (client component)

New file `src/components/admin/DeleteRespondentButton.tsx`, rendered at the bottom
of `src/app/admin/(panel)/respondents/[id]/page.tsx` with the assessment `id` and
the respondent's `first_name` (for the confirm copy).

Behavior:
- Idle: a muted-red text/button "Delete respondent".
- Click → confirm state: shows "Delete [First name] and all their data? This cannot
  be undone." with two buttons: "Yes, delete permanently" (red) and "Cancel".
- Confirm → `fetch('/api/admin/respondents/<id>', { method: 'DELETE' })`; button
  disabled while in flight ("Deleting...").
- Success → `router.push('/admin/respondents')`.
- Failure → inline error "Could not delete. Please try again." and return to idle.

Placement: below the "Email activity" section, visually separated (small, muted),
so it is not fat-fingered.

## Error handling & edge cases

- Unauthenticated/inactive admin → 401 (route guard); the button is only reachable
  behind admin login anyway.
- Assessment id not found (already deleted) → 404; UI shows the generic error.
- Partial delete failure → 500; the UI surfaces the error and the owner can retry
  (re-running is safe/idempotent — already-deleted rows simply match nothing).
- No PII in error responses (generic messages only).

## Testing

- `requireActiveAdmin` guard: an unauthenticated `DELETE` returns 401 without
  touching the database (mirrors the guard-test approach; if mocking the Supabase
  auth client in vitest is impractical, note it and rely on the manual check).
- Manual/live verification: create a throwaway respondent, delete via the button,
  confirm the row is gone from the list and the dashboard counts drop, and confirm
  other respondents are untouched.

## Files touched

- Create: `src/app/api/admin/respondents/[id]/route.ts` (DELETE handler).
- Create: `src/components/admin/DeleteRespondentButton.tsx`.
- Modify: `src/app/admin/(panel)/respondents/[id]/page.tsx` (render the button).
