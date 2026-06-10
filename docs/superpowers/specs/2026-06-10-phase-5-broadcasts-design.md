# Phase 5 — Broadcasts (Drafts) — Design

**Date:** 2026-06-10
**Project:** Family Connection Diagnosis™ (familydiagnostictool)
**Status:** Approved design, pre-implementation

## Goal

Give Ibironke a working broadcast **composer and draft manager** in the admin
dashboard at `/admin/broadcasts`. She can write a formatted email, choose an
audience (all consented contacts or a single score band), see how many people it
would reach, preview it, and **save it as a draft**.

This phase ships the complete UI and persistence for drafts. Actual email
delivery and scheduling are intentionally deferred to **Phase 7**, when the live
Resend account is connected. `Send now` and `Schedule` are visible but disabled
with a "Live sending activates in Phase 7" note.

## Scope

### In scope
- Broadcast list page (replaces the current stub).
- Broadcast composer for creating and editing drafts.
- Tiptap rich-text body (bold, italic, link, bullet list).
- Optional CTA button (label + URL), with a "Use my WhatsApp link" helper that
  prefills from Settings.
- Optional logo inclusion (uses the logo configured in Settings).
- Audience selector (All / At risk / Under strain / Strong) with **live
  recipient counts**.
- Email preview of the assembled message.
- Save draft, edit draft, delete draft.

### Out of scope (Phase 7)
- Real Resend sending and scheduling.
- Resend Audiences sync.
- Recipient-level email tracking (`email_messages` rows for broadcasts).
- `[First name]` → Resend merge-tag substitution at send time.

## Key decisions

- **Editor:** Tiptap WYSIWYG (`@tiptap/react`, `@tiptap/starter-kit`,
  `@tiptap/extension-link`). Chosen for the most familiar "email composer" feel
  for a non-technical user. Outputs clean HTML into `broadcasts.body_html`.
- **Send/Schedule pre-Resend:** buttons shown but **disabled** in Phase 5 with a
  Phase 7 note. Only drafts can be saved. The send path is built in Phase 7.
- **No database work:** the `broadcasts` table, `Broadcast` type, and
  `broadcastSchema` (Zod) already exist. `broadcasts` already has admin RLS
  (select/insert/update/delete-drafts) and an `updated_at` trigger
  (migration 002). Recipient counts come from `count` queries on `contacts`,
  so **no new migration is required**.
- **Data access pattern:** client components using the Supabase browser client,
  matching the existing Settings page. Admin is authenticated and RLS permits
  the CRUD.

## Architecture

### Pages

1. **`/admin/broadcasts` — list** (replaces stub `page.tsx`)
   - Table: Subject · Audience · Status badge · Recipients · Last updated.
     ("Recipients" is derived live from the row's `audience_type` using current
     `contacts` counts — there is no stored count column.)
   - Whole row clickable → opens that broadcast (mirrors `RespondentRow`).
   - "New broadcast" button → `/admin/broadcasts/new`.
   - Empty state when no broadcasts exist.
   - Reads `broadcasts` ordered by `updated_at desc`.

2. **`/admin/broadcasts/new`** and **`/admin/broadcasts/[id]`** — composer
   - Both render a single `BroadcastComposer`.
   - `new` starts blank; after the first save it `insert`s and redirects to
     `/admin/broadcasts/[id]` so subsequent saves `update` the same row.
   - `[id]` loads the existing draft for editing.

### Components / units

| Unit | Responsibility | Depends on |
|---|---|---|
| `BroadcastComposer` (client) | Owns form state, validates with `broadcastSchema`, saves/updates/deletes via Supabase, redirects after first save | Supabase client + the below |
| `RichTextEditor` (client) | Wraps Tiptap; `value`/`onChange` of an HTML string; toolbar (B, I, link, bullets) | Tiptap packages |
| `AudienceSelector` (client) | Radio of All / 3 bands, each with a live recipient count; emits `audienceType` | `useAudienceCounts` |
| `EmailPreview` (client) | Renders the assembled HTML (logo + body + CTA) in a framed, email-like box | `buildBroadcastHtml` |
| `BroadcastStatusBadge` | Colored pill for draft/scheduled/sent/cancelled/failed (sibling of `RangeBadge`) | — |
| `useAudienceCounts` (hook) | Returns `{ all, at_risk, under_strain, strong }` from `contacts` count queries | Supabase client |
| `buildBroadcastHtml` (lib, pure) | Assembles final email HTML from body + optional CTA + optional logo. Shared with Phase 7 sending. | — |

### Composer fields

- **Subject** — text, required. Supports literal `[First name]` token.
- **Body** — `RichTextEditor` → `body_html`. Supports literal `[First name]` token.
- **CTA button** (optional) — `cta_label` + `cta_url`. Helper: "Use my WhatsApp
  link" prefills from Settings.
- **Include logo** — `include_logo` toggle; uses the Settings logo.
- **Audience** — `audience_type`: `all` | `at_risk` | `under_strain` | `strong`,
  each with a live recipient count. (`individuals` is deprioritized and not
  offered.)
- **Preview** — `EmailPreview` of the assembled email.
- **Actions** — `Save draft` (enabled); `Send now` / `Schedule` (disabled, Phase 7
  note); `Delete` (drafts only, on `[id]`).

## Data flow

- **Recipient counts:** `useAudienceCounts` runs `count`-only (`head: true`)
  queries on `contacts` where `marketing_consent = true` and
  `unsubscribed_at is null` — one for the total, one per `latest_score_range`.
  No RPC, no migration.
- **Save draft:** validate with `broadcastSchema`, then `insert` (new) or
  `update` (`[id]`) into `broadcasts` with `status: 'draft'`. After a `new`
  insert, redirect to `/admin/broadcasts/[id]`.
- **List:** read `broadcasts` ordered by `updated_at desc`.

## Personalization

Subject and body support a literal **`[First name]`** token, matching the
existing WhatsApp/results-email convention. In Phase 5 it is rendered verbatim in
the preview with a hint that it inserts each parent's first name when sent. The
mapping to Resend merge tags happens in Phase 7. No per-recipient `[SCORE]` token
(a band broadcast spans many scores).

## Validation & error handling

- Client-side validation via the existing `broadcastSchema`, with inline messages
  under fields.
- Adjust the schema so a **draft can save without a CTA or schedule**: `cta_url`
  empty/optional is allowed; `scheduled_at` is not required for drafts. (Stricter
  validation for actual sends lands in Phase 7.)
- Supabase errors surface via the existing toast pattern
  ("Could not save — please try again"); success shows "Draft saved".
- List and composer have explicit loading / empty / error states.

## Testing

- **Unit:** `buildBroadcastHtml` (logo on/off, CTA on/off, `[First name]`
  passthrough) and the audience count-query builder.
- **Static:** `tsc` type-check + ESLint (the gate used in prior phases).
- **Manual:** create → save → reopen → edit → delete a draft; recipient counts
  match `contacts`; preview matches inputs; `Send now` / `Schedule` disabled.

## Dependencies added

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` (free, MIT).

## References

- Locked product decisions: audiences = all + 3 score bands; "select
  individuals" deprioritized; WhatsApp CTA convention.
- Existing patterns: Settings page (`src/app/admin/(panel)/settings/page.tsx`),
  `RespondentRow`, `RangeBadge`, toast.
- Existing data layer: `broadcasts` table (migration 001), admin RLS
  (migration 002), `Broadcast` type (`src/types/index.ts`), `broadcastSchema`
  (`src/lib/broadcast-schema.ts`).
