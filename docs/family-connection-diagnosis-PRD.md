# Product Requirements Document
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™  
**Client:** Ibironke O. Semowo — Mindful Parenting Educator  
**Built by:** TechieKraft  
**Version:** 1.0  
**Date:** June 2026  
**Status:** Ready for development

---

## 1. Overview

A self-hosted, branded web application that delivers a 12-question scored diagnostic quiz to parents, shows them a personalised results page, sends an instant results email, and gives Ibironke a private admin dashboard to view respondents, compose and schedule email broadcasts, and manage basic settings.

No dependency on Typeform, Scoreapp, Mailchimp, or any third-party quiz or CRM platform.

---

## 2. Goals

- Convert website visitors into leads by offering a valuable, diagnostic experience
- Capture parent contact details (name, email, phone) in exchange for personalised results
- Deliver a professional, on-brand experience that reflects ibironkeosemowo.com
- Give Ibironke full visibility of her respondent list and the ability to follow up by email — without technical help
- Lay the foundation for a growing, contactable parent community

---

## 3. Users

### 3.1 Respondent (parent)
A parent visiting `quiz.ibironkeosemowo.com` who takes the quiz to understand the state of their relationship with their child. They are not logged in. They have no account. They interact with the app once — from intro screen to results page — and then receive an email.

### 3.2 Admin (Ibironke)
Ibironke is the sole admin. She logs in at `/admin` with an email and password. She uses the dashboard to monitor respondents, compose email broadcasts, and manage her settings. She has no technical background — all actions must be achievable through a clean UI with no code required.

---

## 4. Scope

### In scope
- Quiz with intro screen, 12 questions, lead capture gate, and results page
- Instant automated results email per respondent
- Admin dashboard: respondents list, broadcast email composer, settings
- Email delivery and open tracking
- Scheduled broadcast sending via Vercel Cron

### Out of scope
- Automated follow-up emails (per-user triggers post-submission)
- Multiple quizzes or quiz builder
- Public user accounts or respondent login
- Payment or subscription features
- Mobile app
- Multi-admin or team access

---

## 5. Domain and Hosting

| Item | Value |
|---|---|
| URL | `quiz.ibironkeosemowo.com` |
| Hosting | Vercel |
| Admin route | `quiz.ibironkeosemowo.com/admin` |
| DNS | Subdomain CNAME record pointing to Vercel |

---

## 6. Brand

The quiz application must feel like a native extension of ibironkeosemowo.com. No logo on the quiz or results pages.

| Element | Value |
|---|---|
| Primary background | Deep black — `#1A1A1A` |
| Accent / CTA colour | Warm gold — `#F0C040` |
| Content surface | White — `#FFFFFF` |
| Page background | Warm off-white — `#F5F0E8` |
| Typography | Match existing site (clean sans-serif) |
| Logo usage | Email broadcasts only (optional, uploadable) |

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Email sending | Resend + React Email |
| Rich text editor | Tiptap |
| Broadcast scheduling | Vercel Cron |
| Hosting | Vercel |

---

## 8. Modules

---

### Module 1 — Quiz Engine

**Route:** `quiz.ibironkeosemowo.com`

#### 8.1.1 Intro screen
The first thing a visitor sees. Contains:
- Headline: *"Discover the State of Your Family Connection"* (or copy TBD by Ibironke)
- Short description (2–3 sentences, copy TBD)
- A single CTA button: **"Start the Diagnosis"**
- No logo. No navigation. Clean, focused, on-brand.

#### 8.1.2 Question screens
- One question per screen
- Section label shown above the question (e.g. *Communication patterns*)
- Progress bar at the top showing completion (e.g. Question 3 of 12)
- 1–5 scale presented as a clearly labelled button row:
  - 1 = Never
  - 2 = Rarely
  - 3 = Sometimes
  - 4 = Often
  - 5 = Always
- Selecting an answer automatically advances to the next question (no separate Next button needed, but a back button should be available)
- Questions are hardcoded — see Appendix A

#### 8.1.3 Lead capture gate (after Q12)
Shown immediately after the final question, before results are revealed.

Fields:
- First name (required)
- Email address (required)
- Phone number (optional)

Submit button: **"See My Results"**

On submit:
1. Score is calculated client-side (sum of all 12 answers)
2. POST request sent to `/api/submit` with `{ firstName, email, phone, score, answers }`
3. API route saves to Supabase and sends the results email via Resend
4. User is redirected to the results page

#### 8.1.4 Scoring logic
- Each question scores 1–5
- Total possible: 60 points
- Ranges:
  - 12–29 → Connection at risk
  - 30–46 → Connection under strain
  - 47–60 → Connection is strong

---

### Module 2 — Results Page

**Route:** `/results` (score and range passed via query params or state)

Displays:
- Score (e.g. **38 / 60**)
- Range label (e.g. *Connection under strain*)
- Full personalised results copy for that range (see Appendix B)
- CTA button — **"Join the Community"** (or label TBD) linking to Ibironke's WhatsApp link (configurable from admin settings)

Design:
- Three visually distinct page variants — one per score range
- Branded in black and gold
- No logo
- No navigation back to the quiz (prevent re-taking immediately)

---

### Module 3 — Instant Results Email

Triggered automatically on every quiz submission via `/api/submit`.

Sent via Resend from Ibironke's custom domain email address.

Each email contains:
- Respondent's first name in the subject line
- Their score (e.g. 38/60) and range label
- Full results copy for their range
- CTA button linking to the WhatsApp link
- Branded HTML template — black header, gold CTA button
- Optional logo in header (uses whatever logo is set in admin settings — if none set, header shows text only)

Three email templates — one per score range. All body copy is pre-written (see Appendix C).

Subject lines:
- *Your Family Connection results, [First name]*  (same for all three ranges)

---

### Module 4 — Admin Dashboard

**Route:** `/admin`  
**Access:** Email + password login via Supabase Auth. Single admin account only.

#### 8.4.1 Login page
- Email and password fields
- No public registration — account created once during setup

#### 8.4.2 Respondents view (default view after login)

A full-width data table showing all quiz respondents.

Columns:
- First name
- Email address
- Phone number
- Score (e.g. 38/60)
- Score range (badge: at risk / under strain / strong)
- Date submitted

Features:
- Filter by score range (dropdown or tab)
- Sort by date submitted (newest first by default) or by score
- Click any row to expand and view all 12 individual answers
- Summary stats bar at the top:
  - Total respondents
  - Count per score range

#### 8.4.3 Navigation
Simple sidebar or top nav linking to:
- Respondents
- Broadcasts
- Settings

---

### Module 5 — Broadcast Email Composer

**Route:** `/admin/broadcasts`

Ibironke can compose, preview, save, schedule, and send custom emails to her respondent list.

#### 8.5.1 Broadcast list view
Shows all past and scheduled broadcasts with:
- Subject line
- Audience (e.g. "All respondents", "Connection at risk")
- Status badge: Draft / Scheduled / Sent
- Scheduled or sent date
- For sent broadcasts: delivered count, opened count, open rate %

#### 8.5.2 Composer
Fields:
- **Subject line** (required, plain text)
- **Body** (required, rich text editor via Tiptap — bold, italic, links, bullet lists, paragraph breaks)
- **CTA button** (optional):
  - Button label (text)
  - Destination URL
- **Logo** (optional):
  - Toggle to include logo in email header
  - Uses logo uploaded in Settings — if no logo uploaded, toggle is disabled

#### 8.5.3 Audience selector
Options:
- All respondents
- Connection at risk (12–29)
- Connection under strain (30–46)
- Connection is strong (47–60)
- Select individuals (searchable multi-select by name or email)

Recipient count shown live as audience is selected (e.g. *"This will send to 34 people"*).

#### 8.5.4 Send options
- **Send now** — fires immediately on confirm
- **Schedule** — date + time picker; broadcast saved with `status = 'scheduled'` and fires automatically via Vercel Cron when the scheduled time is reached

#### 8.5.5 Preview
Before sending or scheduling, Ibironke can view a rendered preview of the email as it will appear in an inbox.

#### 8.5.6 Draft saving
Ibironke can save a broadcast as a draft at any point and return to finish it later. Drafts appear in the broadcast list with a Draft badge.

---

### Module 6 — Email Delivery Tracking

Powered by Resend webhooks. When Resend fires a `delivered` or `email.opened` event, a webhook hits `/api/webhooks/resend` and writes the event to the `email_events` table in Supabase.

Visible in the admin as:
- Per-broadcast stats: delivered, opened, open rate %
- Per-respondent: delivery and open status visible on their row in the respondents table

---

### Module 7 — Admin Settings

**Route:** `/admin/settings`

A simple settings page for Ibironke to manage the small number of things that should be configurable without touching code.

Settings:
| Setting | Description |
|---|---|
| WhatsApp CTA link | The URL used on the results page CTA button and in the instant results email. Can be a WhatsApp community link, group invite, or personal DM link. |
| Logo | Upload an image file (PNG or JPG) to be used optionally in broadcast emails. Can be replaced at any time. If no logo is uploaded, the logo option in the email composer is disabled. |

---

## 9. Data Model (Supabase)

### `respondents`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| first_name | text | Required |
| email | text | Required |
| phone | text | Nullable |
| score | int | 12–60 |
| score_range | enum | `at_risk`, `under_strain`, `strong` |
| answers | jsonb | Array of 12 integers (1–5) |
| submitted_at | timestamptz | Auto-set on insert |

### `broadcasts`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| subject | text | Required |
| body_html | text | Required |
| cta_label | text | Nullable |
| cta_url | text | Nullable |
| include_logo | boolean | Default false |
| audience | jsonb | Audience config object |
| status | enum | `draft`, `scheduled`, `sent` |
| scheduled_at | timestamptz | Nullable |
| sent_at | timestamptz | Nullable — set when broadcast fires |
| created_at | timestamptz | Auto-set on insert |

### `email_events`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| broadcast_id | uuid | FK → broadcasts. Nullable (for instant results emails, this is null) |
| respondent_id | uuid | FK → respondents |
| event_type | enum | `delivered`, `opened` |
| occurred_at | timestamptz | From Resend webhook payload |

### `settings`
| Column | Type | Notes |
|---|---|---|
| id | int | Always 1 — single row table |
| whatsapp_cta_url | text | Used on results page and instant email CTA |
| logo_url | text | Nullable — path to uploaded logo file |
| updated_at | timestamptz | Auto-updated on change |

---

## 10. API Routes

| Route | Method | Description |
|---|---|---|
| `/api/submit` | POST | Receives quiz submission, saves to Supabase, sends instant results email via Resend |
| `/api/broadcasts/send` | POST | Fires a broadcast immediately (called by Cron or by "Send now") |
| `/api/webhooks/resend` | POST | Receives delivery and open events from Resend, writes to `email_events` |

---

## 11. Scheduling

Vercel Cron runs a job every minute. It queries Supabase for any broadcast where:
- `status = 'scheduled'`
- `scheduled_at <= now()`

For each match, it calls `/api/broadcasts/send`, fires the emails via Resend, and updates the broadcast to `status = 'sent'` with `sent_at = now()`.

Ibironke does not interact with Resend directly. It is infrastructure only.

---

## 12. Email Infrastructure

- **Provider:** Resend
- **Sender address:** Custom domain email (e.g. `hello@ibironkeosemowo.com`) — requires one DNS record added to her domain registrar during setup. This is required for reliable inbox delivery.
- **Templates:** Built with React Email, compiled to HTML. Three templates for results emails (one per score range), one flexible template for broadcasts.
- **Tracking:** Resend's built-in open tracking + webhook events.

---

## 13. Security

- Admin route (`/admin`) is fully protected by Supabase Auth middleware — unauthenticated requests redirect to login
- Supabase Row Level Security (RLS) enabled on all tables
- Resend webhook endpoint validates Resend's signature header before processing
- Environment variables (Supabase keys, Resend API key) stored in Vercel — never committed to code

---

## 14. Project File Structure

```
family-connection-diagnosis/
├── app/
│   ├── page.tsx                    ← Intro screen
│   ├── quiz/page.tsx               ← Quiz engine (Q1–Q12)
│   ├── gate/page.tsx               ← Lead capture gate
│   ├── results/page.tsx            ← Results page
│   ├── admin/
│   │   ├── page.tsx                ← Respondents view
│   │   ├── broadcasts/page.tsx     ← Broadcast list
│   │   ├── broadcasts/new/page.tsx ← Composer
│   │   ├── settings/page.tsx       ← Settings
│   │   └── login/page.tsx          ← Admin login
│   └── api/
│       ├── submit/route.ts
│       ├── broadcasts/send/route.ts
│       └── webhooks/resend/route.ts
├── components/
│   ├── quiz/
│   │   ├── IntroScreen.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── GateForm.tsx
│   ├── results/
│   │   └── ResultsCard.tsx
│   └── admin/
│       ├── RespondentsTable.tsx
│       ├── BroadcastComposer.tsx
│       ├── AudienceSelector.tsx
│       └── StatsBar.tsx
├── emails/
│   ├── ResultsAtRisk.tsx
│   ├── ResultsUnderStrain.tsx
│   ├── ResultsStrong.tsx
│   └── Broadcast.tsx
├── lib/
│   ├── questions.ts                ← All 12 questions, hardcoded
│   ├── scoring.ts                  ← Score range logic
│   ├── supabase.ts                 ← Supabase client
│   └── resend.ts                   ← Resend client
├── vercel.json                     ← Cron job config
└── .env.local                      ← SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY
```

---

## 15. Setup Checklist (Pre-launch)

- [ ] Create Supabase project, run schema migrations, create admin account
- [ ] Create Resend account, add DNS record to ibironkeosemowo.com domain, verify sender
- [ ] Deploy to Vercel, add environment variables
- [ ] Add CNAME record for `quiz.ibironkeosemowo.com` pointing to Vercel
- [ ] Add Resend webhook URL in Resend dashboard pointing to `/api/webhooks/resend`
- [ ] Set WhatsApp CTA link in admin settings
- [ ] Test full quiz flow end-to-end
- [ ] Test broadcast send and scheduling
- [ ] Confirm results emails land in inbox (not spam)

---

## Appendix A — The 12 Questions

All questions use a 1–5 scale: 1 = Never, 2 = Rarely, 3 = Sometimes, 4 = Often, 5 = Always.

**Section A: Communication patterns**
1. When your child comes to you upset or frustrated, do you stop what you're doing to listen — without immediately offering advice or solutions?
2. In a typical week, how often do you and your child have a real conversation — not about schedules, homework, or chores, but about how they're actually feeling?

**Section B: Emotional availability**
3. When your child is having a hard day, can they show you they're struggling — without worrying about your reaction or being told to "toughen up"?
4. After a difficult moment between you and your child — an argument, a punishment, a misunderstanding — do you find a way to reconnect before the day ends?

**Section C: Device habits**
5. During family meals or dedicated family time, are screens — yours and your child's — put away without negotiation?
6. When your child reaches for a screen, do they usually do so because they're genuinely bored or seeking entertainment — rather than avoiding you or an uncomfortable feeling?

**Section D: Family routines**
7. Does your family have at least one shared routine each day — a meal, a bedtime ritual, a morning check-in — that feels like genuine togetherness rather than just logistics?
8. When life gets busy or stressful, does your family maintain the habits and rituals that keep you close — or do they quietly disappear?

**Section E: Parent-child bonding**
9. Does your child seek you out — not because they need something, but simply because they want to be near you or share something with you?
10. Do you and your child share at least one activity — a hobby, a show, a walk, a joke — that belongs just to the two of you?

**Section F: Behaviour triggers**
11. When your child acts out, pushes back, or shuts down, do you find yourself able to pause and ask "what's behind this?" before reacting?
12. After setting a boundary or consequence, does your child understand why — and do they still feel loved by you?

---

## Appendix B — Results Page Copy

### Score 12–29 — Connection at risk

[Parent's first name], this score needs your attention now. And the fact that you're here, reading this, tells me you already sense that something important is slipping.

What your score tells us is that the distance between you and your child has been growing for a while — quietly, in the everyday moments. You may have noticed your child pulling away, conversations staying surface-level, or discipline that doesn't seem to stick no matter what you try.

That's not a parenting failure. That's a connection gap — and connection gaps can be closed.

But children don't wait for us to be ready. They grow, they pull away, and the window quietly narrows. The time to act is today, not someday.

Your three biggest areas to focus on right now:
- Creating one consistent daily ritual that belongs just to the two of you
- Responding to behaviour with curiosity before consequence
- Making space for your child's emotions without rushing to fix them

The next step is a 1-on-1 Family Connection Session with Ibironke, where we look closely at your specific score, identify the two or three changes that will make the biggest difference in your home, and build a practical reconnection plan together — starting now.

[CTA BUTTON]

You showed up for this diagnosis. That already tells me something important about the kind of parent you are. Don't let that courage go to waste.

---

### Score 30–46 — Connection under strain

[Parent's first name], you have real strengths here — and this score shows them.

But this is not the moment to exhale.

You're showing up in some important ways. What your score also tells us is that in certain areas, the connection is quietly under pressure. The strongest connections don't break all at once — they erode slowly, in the small moments that keep getting pushed aside. If those areas aren't addressed, they tend to compound over time.

The good news: you're not starting from zero. You have something worth protecting here, and right now you're close enough to turn this around with the right support.

Your three areas to strengthen:
- Protecting your shared routines when life gets busy — these are your connection anchors
- Reducing screen displacement during the moments that matter most
- Rebuilding the habit of reconnecting after difficult moments

Many parents in this score range find that two or three small, consistent changes shift the entire dynamic at home within weeks — before the distance becomes the new normal.

If you'd like a personalised look at exactly where to focus, a Family Connection Session with Ibironke will pinpoint exactly where the distance is growing and map out your next steps clearly.

[CTA BUTTON]

You're closer than you think — close enough that the right moves now make all the difference.

---

### Score 47–60 — Connection is strong

[Parent's first name], this is genuinely worth acknowledging.

A score in this range tells us that you've built something real at home — warmth, trust, and routines that hold. Your child knows you're there. That doesn't happen by accident.

What your score also shows us is that even the strongest connections need a community around them to stay that way. Consistency is easy when life is calm — it's the busy seasons, the hard days, and the unexpected transitions that test what you've built.

As your child grows and their needs shift, staying intentional becomes the work.

Your focus areas going forward:
- Staying curious as your child enters new developmental stages
- Protecting the rituals that have been holding your connection together
- Staying ahead of screen habits before they become the default

Parents with strong scores often find the most value in surrounding themselves with others who are equally committed — because staying consistent alone is harder than it looks.

[CTA BUTTON]

Well done for doing this. Your family feels the difference — even when they don't say it.

---

## Appendix C — Instant Results Email Copy

Subject line (all ranges): *Your Family Connection results, [First name]*

### Email body — Score 12–29

Hi [First name],

Thank you for taking the Family Connection Diagnosis™. I know it takes honesty to sit with those questions — and I want you to know that I don't take that lightly.

Your score of [SCORE]/60 places you in the Connection at Risk range.

I want to be straightforward with you: this score isn't about blame. It's about timing. The patterns that create distance between parents and children rarely happen because of one big moment — they build slowly, in the small decisions we make every day without realising their weight.

The encouraging truth is this: connection can be rebuilt. I've seen it happen in families where the gap felt enormous. It starts with understanding exactly where and why the distance formed — and then making a small number of deliberate changes.

Based on your responses, the areas I'd focus on first are:
- Communication — creating the conditions where your child feels safe to come to you
- Behaviour — learning to read what difficult behaviour is actually communicating
- Emotional availability — making your presence felt, not just your presence known

[CTA BUTTON]

I'm glad you're here, [First name]. This is the right direction.

Warmly,  
Ibironke

---

### Email body — Score 30–46

Hi [First name],

Your Family Connection Score is in — and I want to give you the full picture.

Your score of [SCORE]/60 places you in the Connection Under Strain range.

This is actually one of the most important scores to pay attention to — not because it signals crisis, but because it signals a window.

You have real strengths in your home. And you also have areas where, without some intentional attention, the distance will quietly widen.

Based on your responses, the areas under strain tend to be the ones that get deprioritised when life gets full — the routines, the repair moments after conflict, the device-free time that feels hard to protect.

These are fixable. Not with a complete overhaul, but with two or three consistent shifts.

If you'd like to know exactly what those shifts are for your family specifically, a Family Connection Session with me is the clearest next step.

[CTA BUTTON]

You're not far from where you want to be. Let's close the gap together.

Warmly,  
Ibironke

---

### Email body — Score 47–60

Hi [First name],

Your results are in — and they're worth celebrating.

Your Family Connection Score of [SCORE]/60 places you in the Connection is Strong range.

This tells me that you've been doing something right, consistently. The warmth, the routines, the willingness to show up even when it's hard — your child is experiencing that, even on the days it doesn't feel like enough.

I also want to be honest with you: a strong score today doesn't mean the work is done. Family connection is a living, moving thing. As children grow, their needs shift — and the habits that worked beautifully at one stage can quietly stop working at the next.

The parents I worry least about are the ones who are curious and proactive. The fact that you took this diagnosis tells me you're one of them.

If you'd like to understand your score in more depth — including the subtle areas to keep an eye on as your child moves through their next developmental stage — joining the community is a great place to stay ahead.

[CTA BUTTON]

Thank you for taking this seriously, [First name]. Your family is fortunate to have you.

Warmly,  
Ibironke
