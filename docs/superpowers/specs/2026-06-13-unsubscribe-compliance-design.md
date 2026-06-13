# Unsubscribe Compliance — Design Spec

**Date:** 2026-06-13
**Status:** approved, ready for implementation plan

## Goal

Make broadcast unsubscribes actually stick: never re-subscribe someone who opted
out, and reflect Resend-side unsubscribes back into our database so admin counts
are accurate and Ibironke can see who opted out.

## Background / problem

- Broadcasts already include Resend's hosted unsubscribe link, and Resend
  suppresses unsubscribed contacts on send. Good.
- **Bug:** `syncConsentedContacts` sets `unsubscribed: false` on every contact
  create *and* update. On update this overwrites a Resend opt-out — effectively
  re-subscribing someone who just unsubscribed. This is the core compliance hole.
- Our `contacts.unsubscribed_at` is never updated from Resend, so admin counts
  (which filter on `unsubscribed_at`) overstate the audience.

## Scope

**In:**
- Stop re-subscribing: update path omits `unsubscribed`; create keeps `unsubscribed: false`.
- `reconcileUnsubscribes`: pull Resend audience opt-outs into `contacts.unsubscribed_at` at send time.
- Small "Unsubscribed" badge on the admin respondent detail page.
- **Custom unsubscribe for the results email** (added per product decision — because
  the opt-out model auto-enrols parents, the first/transactional email should also
  offer an opt-out): a signed unsubscribe link in the results email footer → a
  public confirmation page → marks the contact unsubscribed in our DB and Resend.

**Out (explicitly):**
- Real-time webhook (`/api/webhooks/resend`) — deferred to Phase 6 (chosen: pull-at-send).
- Changing the broadcast unsubscribe — broadcasts keep Resend's hosted unsubscribe link.

## Custom unsubscribe for the results email (option 2)

**Flow:** results email footer shows an "Unsubscribe" link carrying the parent's
email + an HMAC-signed token → opens a public `/unsubscribe` page that **verifies
the token and shows a confirmation** (chosen over instant one-click, so email
security scanners can't auto-unsubscribe people) → on confirm, a POST handler
marks the contact unsubscribed in our DB and (best-effort) in Resend → success page.

**Security:** the link is signed with HMAC-SHA256 over the email using a server
secret (`UNSUBSCRIBE_SECRET`, falling back to `SUPABASE_SERVICE_ROLE_KEY` so **no
new env var is required**). Tampered or wrong-email links fail verification, so
nobody can unsubscribe someone else. No new DB column — the token is stateless.

**Components:**
- `src/lib/unsubscribe-token.ts` (pure) — `signUnsubscribeToken`, `verifyUnsubscribeToken`, `buildUnsubscribeUrl`.
- `src/lib/unsubscribe-contact.ts` — `unsubscribeContact(supabase, resend, email)`: set `unsubscribed_at` (if null) and best-effort `resend.contacts.update({ unsubscribed: true })` when the contact is already in the audience.
- `src/app/unsubscribe/page.tsx` (public) — verify token; show confirmation, success (`?done=1`), or invalid-link states.
- `src/app/api/unsubscribe/route.ts` (public POST) — verify token, `unsubscribeContact`, redirect to the success page.
- Modify `BaseEmail` (+ `ResultsEmail`, `sendResultsEmail`) to render the unsubscribe footer link from a `buildUnsubscribeUrl(email)`.

Both `/unsubscribe` and `/api/unsubscribe` sit outside the `/admin` middleware
matcher, so they're publicly reachable by recipients.

## Verified platform facts (installed `resend@6.12.4`)

- `resend.contacts.list({ audienceId })` returns `Contact[]` where each `Contact`
  has `email: string`, `first_name: string | null`, `unsubscribed: boolean`.

## Design

All changes live in `src/lib/resend-audience.ts` (plus one admin component).

### 1. `syncConsentedContacts` — stop re-subscribing
- **Update path:** remove `unsubscribed: false`; omit the field so Resend's
  subscription state is never touched. (Keep `audienceId`, `id`, `firstName`, `properties`.)
- **Create path:** keep `unsubscribed: false` — a newly synced contact (loaded
  via `unsubscribed_at IS NULL`) is subscribed by definition.

### 2. `reconcileUnsubscribes(supabase, resend, audienceId)` — pull opt-outs back
- List the audience's Resend contacts.
- For each with `unsubscribed === true`, set `unsubscribed_at = now()` on the
  matching `contacts` row, matched by `email`, **only when `unsubscribed_at IS NULL`**
  (so the original opt-out time is preserved and the write is idempotent).
- Returns the number of newly-reconciled rows. Per-contact failures are logged
  and counted, never thrown (resilient, like the existing sync).

### 3. Send-flow ordering (inside `syncConsentedContacts`)
1. `ensureAudience`
2. `ensureScoreBandProperty`
3. **`reconcileUnsubscribes`** ← pull Resend opt-outs into our DB first
4. Load contacts `WHERE unsubscribed_at IS NULL` (now excludes the reconciled opt-outs)
5. Loop create/update (update no longer forces `unsubscribed: false`)

Putting reconciliation before the load means a freshly-detected opt-out is
excluded from this very send's sync — we never re-touch them in Resend.

### 4. Admin visibility
- `BroadcastStatusBadge` is broadcast-specific; add a tiny inline "Unsubscribed"
  pill on the **respondent detail page** (`/admin/respondents/[id]`) shown when
  the contact's `unsubscribed_at` is set. No new component needed beyond a small
  conditional badge (reuse existing badge styling).

## Data flow (a real opt-out)

1. Parent clicks unsubscribe in a broadcast → Resend marks them `unsubscribed` and stops sending to them.
2. Next broadcast send → `reconcileUnsubscribes` sees `unsubscribed: true` → sets `unsubscribed_at` on our row.
3. That row is now excluded from the sync load and from `fetchAudienceCounts` → counts drop by one; respondent detail shows the badge.
4. The contact is never re-subscribed because the update path no longer sets `unsubscribed: false`.

## Error handling

- `reconcileUnsubscribes` failures are non-fatal: log and continue; a failed
  reconcile must not block a send (Resend still suppresses opt-outs regardless).
- Resend list pagination: at current scale (well under 100 contacts) a single
  page covers the audience; handling additional pages is a future concern noted
  but not implemented now (YAGNI).

## Testing strategy (Vitest, mocked clients)

- `syncConsentedContacts`: the update call for an existing contact does **not**
  include `unsubscribed: false` (asserts the field is absent/not false).
- `reconcileUnsubscribes`: given a Resend list containing an unsubscribed contact,
  it issues a DB update setting `unsubscribed_at` for that email; a contact that is
  not unsubscribed is left untouched.
- Existing sync tests updated for the new fake (`contacts.list`) and the removed
  `unsubscribed: false` on update.
- `unsubscribe-token`: sign→verify round-trip passes; a tampered token fails; a
  token signed for one email fails for another.
- `unsubscribe-contact`: sets `unsubscribed_at` for the email; best-effort Resend
  update is attempted only when the contact has a `resend_contact_id` + audience id.

## Out of scope / non-goals

Open/click tracking, the webhook endpoint, a resubscribe UI, and pagination of very
large audiences. Broadcasts keep Resend's hosted unsubscribe (we are not replacing
it). All deferred or rejected per decisions above.
