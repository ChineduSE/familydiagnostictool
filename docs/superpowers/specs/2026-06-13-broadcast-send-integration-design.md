# Broadcast Send Integration — Design Spec

**Date:** 2026-06-13
**Phase:** completes the deferred sending half of Phase 5 (the "Send now" path of Phase 7)
**Status:** approved, ready for implementation plan

## Goal

Let Ibironke press **Send now** on a saved broadcast draft and have Resend deliver
it to **everyone** (all consented parents) or to **one score band**, with each
parent's first name merged in and a working unsubscribe link — without leaving
the admin.

## Scope

**In v1:**
- "Send now" to **All respondents** or a single **band** (at_risk / under_strain / strong).
- A **confirm screen** with a live recipient count and a **"Send a test to myself"** safety button.
- Sync consented contacts into a Resend **audience** (with a `score_band` property) at send time.
- Persist `resend_broadcast_id` + status; show a read-only **broadcast detail** for sent broadcasts.

**Deferred (explicitly out of v1):**
- **Schedule for later** (`scheduledAt`) — next slice. The "Schedule" button stays disabled.
- **Open/click tracking** (the `/api/webhooks/resend` endpoint) — Phase 6.

## Verified platform facts (installed `resend@6.12.4` + current docs)

- `broadcasts.create` accepts **`RequireAtLeastOne<SegmentOptions>`** where
  `SegmentOptions = { segmentId; audienceId /* deprecated but functional */ }`,
  plus render options (`html`/`react`/`text`), base options (`from`, `subject`,
  `name`, `replyTo`), and send options (`send`, `scheduledAt`).
- `contacts.create` accepts `{ email, firstName, lastName, unsubscribed, properties, segments[], topics[] }`.
- Merge tags: **`{{{contact.first_name|there}}}`** (name + fallback) and
  **`{{{RESEND_UNSUBSCRIBE_URL}}}`** (unsubscribe). Merge substitution happens
  for **broadcasts**, not transactional `emails.send`.
- Free tier includes Audiences + Broadcasts + 1,000 marketing contacts + scheduling.

## Segmentation approach (chosen: A)

**One audience + a `score_band` property + 3 dashboard segments.** "All" sends to
the whole audience (`audienceId`); a band sends to its segment (`segmentId`).
Rejected: four-audiences (duplicates contacts, must move them on re-quiz) and
throwaway-audience-per-send (clutter + contact-cap risk).

## Architecture / components

New, isolated, independently testable units:

- **`src/lib/broadcast-merge.ts`** (pure) — `toResendMergeFields(text)`: convert
  `[First name]` → `{{{contact.first_name|there}}}` in subject + body. Also
  `toSampleText(text, name)` for the test-send preview (literal substitution,
  since transactional sends don't merge). Unit-tested.
- **`src/lib/broadcast-targets.ts`** (pure) — given the settings (audience id + 3
  segment ids) and a `BroadcastAudience`, return the Resend target
  (`{ audienceId }` for "all" or `{ segmentId }` for a band) or a typed error if
  the required id isn't configured yet. Unit-tested.
- **`src/lib/resend-audience.ts`** — `syncConsentedContacts(supabase, resend)`:
  upsert every consented, non-unsubscribed contact into the audience (set
  `firstName`, `score_band` property, `unsubscribed`), storing `resend_contact_id`
  back on the row. Idempotent. Returns counts. Tested against a mocked Resend client.
- **`src/lib/resend-broadcast.ts`** — `sendBroadcastNow({ supabase, resend, broadcast })`:
  resolve target → sync → assemble HTML (`buildBroadcastHtml` + merge tags +
  `{{{RESEND_UNSUBSCRIBE_URL}}}` footer) → `broadcasts.create({..., send: true})`
  → persist `resend_broadcast_id`, `status: 'sent'`, `sent_at`. Guards against
  re-sending an already-sent broadcast. `sendTestToSelf(...)` uses `emails.send`
  with sample-substituted text to a given address.
- **Server action / route** (admin-only): `POST send` and `POST test-send` for a
  broadcast id. Auth via existing admin middleware.

## Pages / routes

- **`/admin/broadcasts/[id]/confirm`** — confirm screen: audience label, live
  recipient count, from / reply-to, rendered preview, "Send a test to myself"
  button, and a primary **"Send to N parents"** button. Reached from the composer's
  now-enabled "Send now".
- **`/admin/broadcasts/[id]`** — show the **read-only detail** when status ≠ draft
  (sent: subject, audience, recipient count, sent_at, resend_broadcast_id, preview);
  keep the composer when status = draft.
- **Composer** — enable "Send now" (only for a saved draft) → navigates to confirm.
  "Schedule" stays disabled (deferred).

## Data / settings changes

- **Migration:** add to `settings`: `resend_audience_id text`,
  `segment_at_risk_id text`, `segment_under_strain_id text`, `segment_strong_id text`.
  (DB change — flag per the Supabase workflow before applying.)
- **Settings UI:** fields to paste the audience id (or auto-created on first sync)
  and the 3 segment ids.
- `contacts.resend_contact_id` (already exists) is populated by the sync.
- `broadcasts.resend_broadcast_id` / `status` / `sent_at` (already exist) are written on send.

## Data flow (Send now)

1. Composer "Send now" → `/admin/broadcasts/[id]/confirm`.
2. Admin optionally clicks **"Send a test to myself"** → `sendTestToSelf` → real
   email to her own inbox with a sample first name.
3. Admin clicks **"Send to N parents"** → send action:
   a. `resolveTarget` (settings) — error early if a needed segment id is missing.
   b. `syncConsentedContacts` — audience is complete + properties fresh.
   c. `sendBroadcastNow` — create broadcast with `send: true`, merge tags, unsubscribe footer.
   d. Persist `resend_broadcast_id` + `status: 'sent'` + `sent_at`; redirect to detail.

## Error handling

- Missing segment id for a chosen band → block at the confirm screen with a clear
  "configure this in Settings" message (never a silent failure).
- Sync failure → abort before creating the broadcast; surface the error; draft stays a draft.
- Broadcast create failure → keep `status: 'draft'`; show error; nothing persisted as sent.
- Already-sent (has `resend_broadcast_id`, status `sent`) → the send action refuses to re-send.
- Email never blocks the UI thread unexpectedly; actions return typed results.

## Testing strategy

- **Unit (Vitest):** `toResendMergeFields` / `toSampleText`; `resolveTarget`
  (all/band/missing-id); `syncConsentedContacts` + `sendBroadcastNow` against a
  mocked Resend client (asserts payload shape, idempotency guard, persistence calls).
- **Manual / Playwright:** confirm flow with **test-send to own inbox** (never a
  real parent list during dev), then a real all-send to a tiny seeded audience of
  the developer's own addresses.

## One-time operator setup (documented for go-live)

1. First send auto-creates (or you create) the Resend **audience**; its id is saved in Settings.
2. In the Resend dashboard, create 3 **segments** filtering `score_band` =
   `at_risk` / `under_strain` / `strong`; paste their ids into `/admin/settings`.
3. Confirm `EMAIL_FROM` / `EMAIL_REPLY_TO` are set in the environment.

## Out of scope / non-goals

Scheduling, open/click tracking, audience analytics, "send to specific
individuals", and any paid-tier features. All deferred or rejected per locked decisions.
