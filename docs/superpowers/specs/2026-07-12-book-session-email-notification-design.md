# Design: "Book your session" → instant email to Ibironke

**Date:** 2026-07-12
**Status:** Approved (pending spec review)

## Summary

Change the "Book your session" call-to-action from a WhatsApp deep link into an
instant email notification to the app owner (Ibironke). When a Yes-respondent
clicks the CTA, the server emails Ibironke the parent's details and message, with
Reply-To set to the parent's email so she replies straight from Gmail. The CTA is
shown only to parents who answered **Yes** to the Q17 readiness question; **No**
respondents see the results/email without the CTA (and without its session-pitch
lead-in), so the copy still reads well. The admin gains two visible signals: a
"Requested a session" count on the dashboard and a per-respondent indicator.

## Goals

- Replace the WhatsApp CTA with a server-sent email notification to Ibironke.
- Fire the notification from both the results-page CTA and the results-email CTA.
- Gate the CTA on the readiness answer: Yes shows it, No hides it (copy stays clean).
- Reply-To the parent so Ibironke replies directly from her inbox.
- Never double-notify for the same assessment.
- Surface "Requested a session" on the admin dashboard and respondent detail.

## Non-goals

- No change to the parent's instant results email *content* other than the CTA
  gating and the CTA target (still sent at submit time).
- No calendar/booking-slot integration — this is a lead notification, not scheduling.
- No removal of the WhatsApp settings columns; they simply stop feeding the CTA.
- No Resend audience/segment work (unrelated).

## Decisions (confirmed with user)

1. **Mechanism:** auto-send from the server on click (not `mailto:`).
2. **WhatsApp:** fully replaced by the email notification for the CTA.
3. **Destination inbox:** `ronkesemowo@gmail.com` (the existing `EMAIL_REPLY_TO`
   value); Reply-To on the notification is the parent's email.
4. **CTA gating:** Yes → CTA on results page + email; No → no CTA on either,
   with the session-pitch lead-in also removed.
5. **Email CTA safety:** the email CTA lands on a small confirmation page with a
   single "Send my request to Ibironke" button (a physical click), to defeat
   inbox link-scanner prefetch that would otherwise fire false notifications. The
   results-page CTA is a direct click (live browser session, no prefetch risk) and
   sends immediately with inline confirmation.
6. **Admin surfacing:** "Requested a session" count on the dashboard AND a
   per-respondent indicator on the respondent detail page.

## Terminology

- **wants_support** (existing): the Q17 answer. `true` = "Would love a session".
- **session_request_at** (new): timestamp set when the parent actually clicks the
  CTA and the notification is sent. Drives "Requested a session".

## Copy: gating the CTA by readiness

Each score band's results copy and email copy currently ends with a
**session-pitch block** (one or two paragraphs pitching a session) immediately
followed by the `[CTA BUTTON]` marker, then a warm closing line. For No
respondents we omit the pitch block *and* the button, keeping everything before it
(results, focus-area bullets) and the closing line.

Represent each band's copy as three parts so assembly is explicit and testable:

- `intro` — everything up to the pitch (paragraphs, bullets).
- `ctaLead` — the session-pitch paragraph(s) that precede the button.
- `closing` — the warm final line(s) (email closings include `Warmly,\nIbironke`).

Assembly (a pure helper, one for results, one for email body):

- **Yes:** `intro` + `\n\n` + `ctaLead` + `\n\n[CTA BUTTON]\n\n` + `closing`
- **No:** `intro` + `\n\n` + `closing`

The existing results-page renderer already splits on `\n\n` and swaps the
`[CTA BUTTON]` token for the button, so the No string (which contains no token)
renders correctly with no renderer change. The `RESULTS_COPY` / `EMAIL_COPY`
constants are refactored from single strings into these three-part shapes; helpers
`buildResultsCopy(band, wantsSupport)` and `buildEmailBody(band, wantsSupport)`
assemble the final string. No em dashes introduced.

Worked example — "Connection at risk" results, **No** version:
> …→ Making space for your child's emotions without rushing to fix them
>
> You showed up for this diagnosis. That already tells me something important about the kind of parent you are. Don't let that courage go to waste.

## Booking mechanism

### Identity token
Reuse the HMAC-signed-token pattern already used for unsubscribe links
(`src/lib/unsubscribe-token.ts`). Add `src/lib/booking-token.ts` with
`buildBookingToken(assessmentId)` and `verifyBookingToken(token) → assessmentId | null`,
signed with the same secret source (`UNSUBSCRIBE_SECRET` ?? service-role key). The
token encodes the assessment id; the booking URL is
`${APP_URL}/book?token=<token>`.

### At submit time (`/api/submit`)
After inserting the assessment, generate the booking token from the new
assessment id. Use it two ways:
- Return it to the client (add `bookToken` to the JSON response) so the results
  page can fire the notification on click.
- Build the booking URL and pass it to `sendResultsEmail` as the CTA target
  (replacing the WhatsApp URL), but only render the CTA when `wants_support` is
  true.

### The notification endpoint (`POST /api/book`)
Input: `{ token }`. Steps:
1. `verifyBookingToken(token)` → assessment id (else 400).
2. Load the assessment (first_name, email, phone, score, score_range,
   wants_support, session_request_at).
3. If `session_request_at` is already set → return `{ success: true, alreadySent: true }`
   (idempotent; no second email).
4. Load `settings.whatsapp_message_template` (reused as the parent's first-person
   message body) and render `[First name]`/`[SCORE]`.
5. Send the notification via a new `sendSessionRequestEmail(...)`:
   - `to`: `OWNER_EMAIL` (= `EMAIL_REPLY_TO`, i.e. ronkesemowo@gmail.com)
   - `from`: `EMAIL_FROM`
   - `replyTo`: the parent's email
   - `subject`: e.g. `Session request: [First name] (NN/80, [band label])`
   - body: a details block (name, email, phone, score/80, band) + the rendered
     first-person message.
6. On send success, set `assessments.session_request_at = now()`; return
   `{ success: true }`. On send failure, do **not** set the timestamp; return
   `{ success: false }` so a retry can work.

### Results-page CTA (Yes only)
The CTA becomes a button that POSTs `{ bookToken }` to `/api/book`, then swaps to a
confirmation state: "Your request is on its way to Ibironke. She'll reply to your
email shortly." Disable the button while in flight and after success to prevent
repeat clicks. On failure, show a retry message.

### Email CTA (Yes only) → confirmation page
The email CTA button links to `/book?token=<token>` (GET). That page is a small
branded screen showing the parent's name and one button, "Send my request to
Ibironke", which POSTs `{ token }` to `/api/book` and then shows the confirmation.
Requiring the physical button click means inbox link-scanners that prefetch the
GET link do not trigger a notification. If the token is invalid/expired the page
shows a friendly fallback ("This link has expired — please retake the assessment
or reply to your results email").

## Data / schema (new migration `007_session_requests.sql`)

- `alter table public.assessments add column if not exists session_request_at timestamptz;`
- Recreate `get_dashboard_stats()` to add
  `'session_requests', count(*) filter (where session_request_at is not null)`.

`DashboardStats` gains `session_requests: number`. `Assessment` gains
`session_request_at: string | null`.

## Admin surfacing

- **Dashboard:** add a "Requested a session" card bound to `stats.session_requests`
  (distinct from the existing "Would love a session" = `wants_support_yes`). The
  stat-cards grid grows from 5 to 6 cards; use `lg:grid-cols-6` (or a 3×2 layout).
- **Respondent detail:** below the existing "Wants guided support" line, add
  "Requested a session: Yes ({formatted date}) / No" driven by `session_request_at`.

## Environment

- `OWNER_EMAIL` — optional; the inbox that receives session-request notifications.
  Defaults to `EMAIL_REPLY_TO` when unset (currently ronkesemowo@gmail.com), so no
  new env var is required to ship. Documented for future change.

## Error handling & edge cases

- Missing `RESEND_API_KEY`: `/api/book` returns `{ success: false }`; results page
  shows a retry message; timestamp not set.
- Invalid/expired token: `/api/book` 400; `/book` page shows friendly fallback.
- Double click / double surface (results page then email): idempotent via
  `session_request_at` — at most one notification.
- No-respondent reaching `/api/book` with a valid token: allowed (a valid token
  means they intended to book); still deduped. The CTA is simply never shown to
  them in the UI.
- Email send is best-effort and isolated: a `/api/book` failure never corrupts the
  assessment; the parent can retry.
- Empty/unset `whatsapp_message_template`: fall back to a built-in default message
  (e.g. "[First name] took the Family Connection Diagnosis and would like to book a
  session.") so the notification is never blank.

## Testing

- `booking-token`: round-trip sign/verify; tampered token → null (mirror the
  unsubscribe-token tests).
- Copy assembly: `buildResultsCopy` / `buildEmailBody` — Yes output contains the
  `[CTA BUTTON]` marker and the pitch text; No output contains neither, still ends
  with the closing line; both contain the intro/bullets. One test per band.
- `/api/book` handler logic: invalid token → 400; already-sent → `alreadySent`
  without a second send; happy path sets the timestamp and sends once (Resend
  mocked).
- Submit route: response includes `bookToken`; the results email CTA target is the
  booking URL and is present only when `wants_support` is true.

## Files touched (summary)

- `src/lib/questions.ts` — refactor `RESULTS_COPY`/`EMAIL_COPY` into three-part
  shapes; add `buildResultsCopy` / `buildEmailBody`.
- `src/lib/booking-token.ts` (new) + test.
- `src/lib/send-session-request-email.ts` (new) — the owner notification sender.
- `src/lib/resend.ts` — add `OWNER_EMAIL` constant.
- `src/app/api/submit/route.ts` — return `bookToken`; pass booking URL + gating to
  the results email.
- `src/lib/send-results-email.ts` + `src/emails/ResultsEmail.tsx` — CTA gated by
  `wantsSupport`, target is the booking URL, body via `buildEmailBody`.
- `src/app/api/book/route.ts` (new) — the notification endpoint.
- `src/app/book/page.tsx` (new) — email confirmation page.
- `src/app/results/page.tsx` — CTA becomes a POST-to-`/api/book` button with
  confirmation state; copy via `buildResultsCopy`; gate on `wantsSupport`.
- `src/app/gate/page.tsx` + `src/lib/quiz-store.ts` + `src/types` — add
  `wantsSupport`/`bookToken` to the stored `QuizResult`.
- `src/types/index.ts` — `DashboardStats.session_requests`,
  `Assessment.session_request_at`.
- `supabase/migrations/007_session_requests.sql` (new).
- `src/app/admin/(panel)/page.tsx` — "Requested a session" card + grid.
- `src/app/admin/(panel)/respondents/[id]/page.tsx` — per-respondent indicator.
