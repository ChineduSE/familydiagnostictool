# Family Connection Diagnosis™ — Implementation Plan (Build Plan)

**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Status:** For sign-off
**Date:** 2026-06-05

> This is the working build plan we will actually follow. It supersedes the original
> `docs/family-connection-diagnosis-ImplementationPlan.md` where they differ, because a
> first slice has already been built and several product decisions are now locked.
> Copy comes from `docs/Family-Connection-Toolkit-SOURCE.txt` (Ibironke's original toolkit),
> which overrides the PRD/ContentGuidelines wherever they conflict.

---

## 1. Product in one paragraph

A free, branded web app. Parents visit `quiz.ibironkeosemowo.com`, answer 12 questions across
6 areas, enter their contact details, and get a personalised Family Connection Score (one of three
bands) on screen plus an instant results email. Every results/email call-to-action opens Ibironke's
**personal WhatsApp chat**, where she personally welcomes them and shares the community
("Parents' Lounge Circle") invite. Behind it, Ibironke has a private admin to view respondents,
see their answers and email activity, and send email broadcasts to everyone or to a score band.

---

## 2. Locked decisions (these override the spec docs)

| Decision | Choice |
|---|---|
| Copy source of truth | `docs/Family-Connection-Toolkit-SOURCE.txt` (the .docx Ibironke provided) |
| CTA | One configurable link → Ibironke's **personal WhatsApp** (`wa.me` click-to-chat, free; not the paid WhatsApp Business API) |
| Stack | Keep the existing **Next.js 16 + React 19** scaffold; **add Tailwind** + brand tokens. Do **not** downgrade to Next 14 |
| Email / scheduling | **Resend** for both instant emails and **Resend Broadcasts + Audiences** for campaigns. **No Vercel Cron** |
| Broadcast audiences | Everyone + the three score bands. "Send to specific individuals" is deferred (optional, later) |
| Budget | **Zero spend** — Vercel Hobby, Supabase free, Resend free |
| Child age | Not collected. Non-clinical disclaimer shown |
| Data model | Separate `contacts` vs `assessments` (repeat submissions); explicit marketing consent before any broadcast |

### Brand tokens
`black #1A1A1A` · `gold #F0C040` · `white #FFFFFF` · `offwhite #F5F0E8`

---

## 3. What already exists (the "first slice")

- Public pages: `/` intro, `/quiz`, `/gate`, `/results` (functional, localStorage resume, sessionStorage result hand-off).
- **Server-side scoring** in `/api/submit` (score is computed on the server — clients can't tamper).
- All 12 questions + results copy + score-range logic; a marketing-consent checkbox on the gate.
- A database migration with a good shape (`contacts`, `assessments`, `email_messages`, `email_events`, `broadcasts`, `settings`).
- `GET /api/settings`, a service-role Supabase admin client.

### What it is missing (the work this plan covers)
- No Tailwind (hand-written CSS) and none of the planned dependencies (Resend, React Email, Tiptap, `@supabase/ssr`, react-hook-form, svix, date-fns, clsx).
- No emails sent at all. No admin side at all (auth, dashboard, respondents, broadcasts, settings UI). No webhook tracking.
- Schema missing `admin_profiles`, RLS policies, helper functions, Storage bucket. `contacts` table not yet written to on submit.
- Email copy not yet in the codebase; minor results-copy duplication and a quiz-resume edge case to fix.

---

## 4. Which phase builds which surface

| Surface | Phases | Done & testable after |
|---|---|---|
| **Parent quiz** (intro, quiz, gate, results, instant email) | **0 – 2** | Phase 2 |
| **Ibironke's admin** (login, dashboard, respondents, broadcasts, settings, tracking) | **3 – 6** | Phase 6 |
| Hardening + launch | 7 | Phase 7 |

---

## 5. Phases

Each phase is a shippable, testable increment. "Pages" lists the user-visible routes touched.

### Phase 0 — Foundation reconciliation
**Goal:** the existing quiz looks and behaves the same, but now on the real design system and toolchain.
- Add Tailwind + brand tokens + fonts; configure `next.config` image patterns for Supabase Storage.
- Install dependencies: `@supabase/ssr`, `resend`, `@react-email/components` (+ `react-email` dev), `@tiptap/*`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `clsx`, `tailwind-merge`, `svix`.
- Port `/`, `/quiz`, `/gate`, `/results` from bespoke CSS to Tailwind. Add `cn()` util.
- **Pages:** intro, quiz, gate, results (restyled).
- **Verify:** `npm run build`, `lint`, `type-check` pass; pages look on-brand at 375px and desktop.

### Phase 1 — Data layer + locked copy
**Goal:** typed, secure data foundation and the authoritative copy in the code.
- Reconcile the migration: keep current tables; **add** `admin_profiles`, RLS policies, `is_active_admin()`, `updated_at`/count triggers, `get_dashboard_stats()`, and the `logos` Storage bucket + policies.
- Complete TypeScript types and Zod schemas (submit, broadcast, settings).
- Load exact toolkit copy: `QUESTIONS`, `RESULTS_COPY`, and new `EMAIL_COPY` (3 emails). Fix the "under strain" score-duplication and the resume-on-fresh-session edge case.
- **Pages:** none new (results copy corrected).
- **Verify:** `type-check` passes; migration applies cleanly; all 6 tables + RLS exist in Supabase.

### Phase 2 — Contacts + instant results email  → **parent journey complete**
**Goal:** a real parent can finish the quiz and receive the correct email.
- On submit: upsert into `contacts` (consent, `latest_score_range`), insert the `assessment`, record an `email_messages` row.
- React Email base template + 3 results templates (at risk / under strain / strong) using toolkit copy, gold CTA → WhatsApp link from settings. `sendResultsEmail()` wired into `/api/submit` so an email failure never blocks the results page.
- **Pages:** results (CTA live), + email templates (previewable via `npm run email`).
- **Verify:** end-to-end quiz → results → email arrives; respondent row saved even if email fails.

### Phase 3 — Admin foundation  → **admin begins**
**Goal:** Ibironke can log in to a protected, branded shell.
- `@supabase/ssr` client/server helpers; auth middleware protecting `/admin/*`; one-time admin-account script.
- Login page; admin layout with sidebar (Dashboard / Respondents / Broadcasts / Settings) + logout; mobile drawer.
- **Pages:** `/admin/login`, `/admin` shell.
- **Verify:** unauthenticated `/admin/*` redirects to login; valid login lands on dashboard; logout works.

### Phase 4 — Respondents CRM + dashboard + settings
**Goal:** Ibironke can see and understand her leads, and configure the two settings.
- Dashboard stats (totals + per-band counts, recent respondents, empty state with quiz-link copy button).
- Respondents list (filter by band, sort, count label, range badges, email status) and detail page (profile, 12 answers grouped by section, email activity).
- Settings: WhatsApp CTA link + logo upload (Supabase Storage).
- **Pages:** `/admin`, `/admin/respondents`, `/admin/respondents/[id]`, `/admin/settings`.
- **Verify:** counts add up; filters/sort work; detail shows all 12 answers; settings save with toasts.

### Phase 5 — Broadcasts (Resend Broadcasts model)
**Goal:** Ibironke can email everyone or a score band, now or scheduled — without leaving the platform.
- Sync consented contacts into a Resend audience; composer with Tiptap (subject, rich body, optional logo, optional CTA); audience selector (all + 3 bands) with live recipient count.
- Create/schedule/send via the Resend Broadcast API; store `resend_broadcast_id` + status. Confirm screen; broadcast list + detail.
- **Pages:** `/admin/broadcasts`, `/admin/broadcasts/new`, `/admin/broadcasts/[id]`, `/admin/broadcasts/[id]/confirm`, `[id]/edit`.
- **Verify:** draft saves; "send now" delivers; a near-future schedule fires via Resend; status reflects correctly.

### Phase 6 — Tracking + consent/compliance
**Goal:** delivery/open data shows in the admin, and marketing is responsible.
- `/api/webhooks/resend` (svix-verified, idempotent) writing `delivered`/`opened`/`clicked` events; surface per-broadcast stats + per-respondent email history.
- Unsubscribe handling (Resend footer link) + suppression on send; short privacy note/policy link; basic data-retention position.
- **Pages:** broadcast detail (stats), respondent detail (email activity) — both gain live data.
- **Verify:** sending + opening a test email increments counts; duplicate opens not double-counted; unsubscribed contacts are skipped.

### Phase 7 — QA, tests, deployment
**Goal:** live at `quiz.ibironkeosemowo.com`, emails from her domain, zero cost.
- Small Vitest suite for the high-value logic: scoring boundaries (29/30/46/47), submit validation, webhook idempotency, audience resolution.
- Responsive + empty/error-state pass; copy verification against the toolkit.
- Vercel deploy + `quiz` CNAME; Resend domain verification (SPF/DKIM/DMARC) + webhook endpoint; create admin account; set WhatsApp link.
- **Verify:** full production smoke test (quiz → email in inbox; admin login; broadcast send + schedule; tracking).

---

## 6. Constraints to keep in view (all manageable, zero-cost)

1. **Resend free tier:** ~100 results-emails/day, ~3,000/month, ~1,000 marketing contacts, 1 domain, 1 webhook. Fine for launch; only a problem at 100+ submissions in one day (results email would fail that day — never breaks the page). Upgrade ($20/mo) only if volume grows.
2. **DNS access needed once:** `quiz` CNAME → Vercel, plus Resend's SPF/DKIM/DMARC records on `ibironkeosemowo.com`.
3. **Admin:** single Supabase Auth account (email+password), no self-signup.

---

## 7. Open copy details (do not block the build)

- **WhatsApp CTA button label.** Toolkit body says "Book your session" but the link opens a WhatsApp chat. Default will be WhatsApp-clear (e.g. "Message Ibironke"); Ibironke can change wording.
- **Exact WhatsApp number** and **sending email address** (e.g. `hello@ibironkeosemowo.com`) — needed before go-live (Phase 7), not before building.

---

## 8. Sign-off

- [ ] Phasing approved (parent quiz = Phases 0–2; admin = Phases 3–6)
- [ ] Copy source of truth = toolkit `.docx` confirmed
- [ ] CTA → personal WhatsApp confirmed
- [ ] Stack (Next 16 + Tailwind), Resend Broadcasts, zero-budget confirmed
- [ ] Approved to start Phase 0
