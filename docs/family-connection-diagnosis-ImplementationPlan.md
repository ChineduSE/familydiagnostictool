# Implementation Plan
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™
**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Version:** 1.0
**Date:** June 2026
**Companion documents:** PRD v1.0 · AppFlow v1.0 · TechStack v1.0 · Content Guidelines v1.0 · Backend Schema v1.0

---

## How to use this document

This plan sequences the entire build from project initialisation to live deployment. It is structured as:

- **Phases** — major milestones, each representing a shippable, testable increment of the application
- **Tasks** — individual Claude Code prompts within each phase. Each task is a single focused conversation with Claude Code.
- **Verification checklists** — must be completed in full before moving to the next phase. Do not skip.

### Rules for every Claude Code session

1. At the start of every session, paste this instruction:
   > *"Read the following documents before writing any code: PRD, AppFlow, TechStack, Content Guidelines, Backend Schema. All copy, UI strings, colours, fonts, and data structures are defined there. Do not invent, paraphrase, or substitute anything defined in those documents."*

2. Reference the specific task number when starting (e.g. *"We are on Phase 2, Task 3"*).

3. If Claude Code produces something that conflicts with a document, stop it and reference the document explicitly.

4. Complete all verification checklist items before starting the next phase. Partial phases create compounding errors.

---

## Phase overview

| Phase | Name | Focus | Side |
|---|---|---|---|
| 0 | Project foundation | Scaffold, config, Supabase, env | Infrastructure |
| 1 | Database and backend | Schema, migrations, API routes | Backend |
| 2 | Quiz engine | Intro, questions, progress, localStorage | Public |
| 3 | Gate and results | Lead capture, scoring, results page | Public |
| 4 | Email — instant results | React Email templates, Resend send | Public |
| 5 | Admin foundation | Auth, login, middleware, sidebar layout | Admin |
| 6 | Admin respondents | List, filters, sorting, detail page | Admin |
| 7 | Broadcast composer | Rich text, audience, schedule, draft save | Admin |
| 8 | Broadcast sending | Send now, Cron job, recipient tracking | Admin |
| 9 | Email tracking | Webhook handler, delivery stats, open rate | Admin |
| 10 | Admin dashboard and settings | Stats home, settings page, logo upload | Admin |
| 11 | Polish and QA | Responsive, empty states, error states, transitions | Full app |
| 12 | Deployment | Vercel, domain, DNS, go-live | Infrastructure |

---

## Phase 0 — Project foundation

**Goal:** A running Next.js project with all dependencies installed, environment variables configured, and Supabase project connected. Nothing is built yet — this phase is purely setup.

---

### Task 0.1 — Scaffold the Next.js project

**Claude Code prompt:**
```
Scaffold a new Next.js 14.2.15 project called family-connection-diagnosis using the following command exactly:

npx create-next-app@14.2.15 family-connection-diagnosis \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

After scaffolding, confirm the following are present:
- src/app/layout.tsx
- src/app/page.tsx
- tailwind.config.ts
- tsconfig.json
- package.json with next: 14.2.15
```

---

### Task 0.2 — Install all dependencies

**Claude Code prompt:**
```
Install all project dependencies as defined in the TechStack document.

Production dependencies:
npm install \
  @supabase/supabase-js@2.45.4 \
  @supabase/ssr@0.5.1 \
  resend@4.0.1 \
  @react-email/components@0.0.25 \
  @tiptap/react@2.8.0 \
  @tiptap/pm@2.8.0 \
  @tiptap/starter-kit@2.8.0 \
  @tiptap/extension-link@2.8.0 \
  @tiptap/extension-placeholder@2.8.0 \
  react-hook-form@7.53.1 \
  zod@3.23.8 \
  @hookform/resolvers@3.9.1 \
  date-fns@3.6.0 \
  clsx@2.1.1 \
  tailwind-merge@2.5.4 \
  svix

Dev dependencies:
npm install --save-dev \
  prettier@3.3.3 \
  eslint-config-prettier@9.1.0 \
  eslint-plugin-prettier@5.2.1 \
  react-email@3.0.1

Confirm all packages are in package.json after install.
```

---

### Task 0.3 — Configure TypeScript, Tailwind, ESLint, and Prettier

**Claude Code prompt:**
```
Apply the following configuration files exactly as defined in the TechStack document:

1. Replace tsconfig.json with the strict mode config from the TechStack document.

2. Replace tailwind.config.ts with the brand config from the TechStack document. This includes:
   - brand colour tokens: black (#1A1A1A), gold (#F0C040), white (#FFFFFF), offwhite (#F5F0E8)
   - font family tokens: display (var(--font-display)) and sans (var(--font-sans))
   - content paths for src/app and src/components

3. Create .eslintrc.json with the config from the TechStack document.

4. Create .prettierrc with the config from the TechStack document.

5. Create .prettierignore with the content from the TechStack document.

6. Add the following scripts to package.json:
   "lint": "next lint"
   "lint:fix": "next lint --fix"
   "format": "prettier --write ."
   "format:check": "prettier --check ."
   "email": "email dev --dir src/emails --port 3001"
```

---

### Task 0.4 — Set up Supabase clients and environment variables

**Claude Code prompt:**
```
Create the Supabase client files and environment variable setup:

1. Create src/lib/supabase/client.ts — browser client using createBrowserClient from @supabase/ssr

2. Create src/lib/supabase/server.ts — server client using createServerClient from @supabase/ssr with cookie handling for Next.js App Router

3. Create src/middleware.ts — basic stub that imports createServerClient. We will fill in the full auth logic in Phase 5. For now it should just pass all requests through.

4. Create .env.local with all variables from the TechStack document (with empty values as placeholders):
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   RESEND_API_KEY=
   RESEND_WEBHOOK_SECRET=
   CRON_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000

5. Create .env.example with the same keys (no values). This file IS committed to git.

6. Create .gitignore and ensure .env.local is listed.
```

---

### Task 0.5 — Set up font configuration and global styles

**Claude Code prompt:**
```
Set up typography and global styles:

1. Update src/app/layout.tsx to:
   - Import Playfair_Display and Inter from next/font/google
   - Configure Playfair_Display with variable --font-display, weights 400/500/600/700, subset latin, display swap
   - Configure Inter with variable --font-sans, weights 300/400/500/600/700, subset latin, display swap
   - Apply both font variables as CSS variables on the html element
   - Set the body to use font-sans by default

2. Update src/app/globals.css to:
   - Keep Tailwind directives (@tailwind base/components/utilities)
   - Add base body styles: bg-brand-offwhite text-brand-black antialiased
   - Remove all default Next.js placeholder styles

3. Create src/lib/utils.ts with the cn() utility function using clsx and tailwind-merge.
```

---

### Task 0.6 — Create folder structure

**Claude Code prompt:**
```
Create the complete folder structure for the project. Create empty index files or .gitkeep files to establish the directories. Do not write any component logic yet — just the folders.

src/
├── app/
│   ├── page.tsx                        (intro screen — empty for now)
│   ├── quiz/page.tsx                   (empty)
│   ├── gate/page.tsx                   (empty)
│   ├── results/page.tsx                (empty)
│   ├── admin/
│   │   ├── page.tsx                    (empty)
│   │   ├── login/page.tsx              (empty)
│   │   ├── respondents/page.tsx        (empty)
│   │   ├── respondents/[id]/page.tsx   (empty)
│   │   ├── broadcasts/page.tsx         (empty)
│   │   ├── broadcasts/new/page.tsx     (empty)
│   │   ├── broadcasts/[id]/page.tsx    (empty)
│   │   ├── broadcasts/[id]/confirm/page.tsx (empty)
│   │   ├── broadcasts/[id]/edit/page.tsx    (empty)
│   │   └── settings/page.tsx           (empty)
│   └── api/
│       ├── submit/route.ts             (empty)
│       ├── broadcasts/send/route.ts    (empty)
│       ├── webhooks/resend/route.ts    (empty)
│       └── cron/send-broadcasts/route.ts (empty)
├── components/
│   ├── quiz/                           (empty)
│   ├── results/                        (empty)
│   └── admin/                          (empty)
├── emails/                             (empty)
├── lib/
│   ├── supabase/                       (already created)
│   ├── schemas/                        (empty)
│   └── utils.ts                        (already created)
└── types/                              (empty)
```

---

### Task 0.7 — Run Supabase migration

**Claude Code prompt:**
```
Create the Supabase migration file and provide instructions to run it.

1. Create supabase/migrations/001_initial_schema.sql containing the complete SQL migration from Section 13 of the Backend Schema document. Copy it exactly — do not modify any table definitions, constraints, indexes, functions, triggers, RLS policies, or seed data.

2. Also create supabase/migrations/002_storage.sql containing only the storage bucket creation and storage RLS policies from Section 9 of the Backend Schema document.

After creating the files, display the following instructions:
"To apply this migration:
Option A (Supabase CLI): Run supabase db push
Option B (Dashboard): Open Supabase project → SQL Editor → paste contents of 001_initial_schema.sql → Run, then repeat for 002_storage.sql"
```

---

### Phase 0 verification checklist

Before moving to Phase 1, confirm every item:

- [ ] `npm run dev` starts without errors at `localhost:3000`
- [ ] `npm run lint` passes with no errors
- [ ] `npm run format:check` passes
- [ ] `tsconfig.json` has `"strict": true`
- [ ] `tailwind.config.ts` has all four brand colour tokens
- [ ] `src/lib/utils.ts` exports `cn()`
- [ ] `src/app/layout.tsx` applies `--font-display` and `--font-sans` CSS variables
- [ ] `.env.local` exists and is in `.gitignore`
- [ ] `.env.example` exists and is committed
- [ ] All folders in the structure above exist
- [ ] `supabase/migrations/001_initial_schema.sql` exists and matches Backend Schema Section 13
- [ ] Migration has been run — all 6 tables exist in Supabase dashboard
- [ ] `settings` table has exactly one row (id = 1)
- [ ] Supabase URL and anon key are filled in `.env.local`

---

## Phase 1 — Zod schemas, types, and data layer

**Goal:** All TypeScript types, Zod validation schemas, and data constants are defined. No UI yet. This gives Claude Code a typed foundation for every subsequent phase.

---

### Task 1.1 — TypeScript types

**Claude Code prompt:**
```
Create src/types/index.ts containing TypeScript types for every data shape in the application. Base these exactly on the Backend Schema document column definitions.

Types to create:
- Respondent (matches respondents table)
- Answer (matches the jsonb answer object: { id, section, value })
- Broadcast (matches broadcasts table, status as union type)
- BroadcastRecipient (matches broadcast_recipients table)
- EmailEvent (matches email_events table, event_type as union type)
- Settings (matches settings table)
- AdminProfile (matches admin_profiles table)
- ScoreRange (union type: 'at_risk' | 'under_strain' | 'strong')
- BroadcastStatus (union type: 'draft' | 'scheduled' | 'sent')
- EmailEventType (union type: 'delivered' | 'opened')
- AudienceType (union type: 'all' | 'at_risk' | 'under_strain' | 'strong' | 'individuals')
- DashboardStats (matches get_dashboard_stats() return shape)
```

---

### Task 1.2 — Zod schemas

**Claude Code prompt:**
```
Create the following Zod validation schemas. Each should be in its own file under src/lib/schemas/.

1. src/lib/schemas/submit.ts
   - submitSchema: validates the POST /api/submit request body
   - Fields: firstName (min 1), email (email format), phone (optional string), score (int, 12–60), scoreRange (enum), answers (array of 12 answer objects, each with id string, section string, value int 1–5)
   - Export type GateFormData from the schema (fields used in the gate form: firstName, email, phone only)

2. src/lib/schemas/broadcast.ts
   - broadcastSchema: validates broadcast composer form
   - Fields: subject (min 1, max 150), bodyHtml (min 1), ctaLabel (optional), ctaUrl (optional, url format when present), includeLogo (boolean), audienceType (enum), audienceIds (optional array of uuids), scheduledAt (optional datetime string)

3. src/lib/schemas/settings.ts
   - settingsSchema: validates PATCH /api/admin/settings
   - Fields: whatsappCtaUrl (optional, url format when present), logoUrl (optional), logoStoragePath (optional)
```

---

### Task 1.3 — Quiz data constants

**Claude Code prompt:**
```
Create src/lib/questions.ts containing all quiz constants. These values come from the Content Guidelines document and must not be paraphrased or altered.

Export:
1. QUESTIONS — array of 12 question objects, each with:
   { id: 'Q1'–'Q12', section: string, text: string }
   Use the exact section labels and question text from the Content Guidelines document Part 1.

2. SCALE_LABELS — map of value to label:
   { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Often', 5: 'Always' }

3. SCORE_RANGES — array of range objects:
   { key: ScoreRange, min: number, max: number, label: string }
   Using the exact range labels from the Content Guidelines document.

4. getScoreRange(score: number): ScoreRange — function that returns the range key for a given score.

5. RESULTS_COPY — object keyed by ScoreRange, each containing the full results page copy string from Content Guidelines Part 2. These are long multi-paragraph strings — copy them exactly, preserving line breaks, em dashes, and → arrows.

6. EMAIL_COPY — object keyed by ScoreRange, each containing:
   { subject: string, body: string }
   From Content Guidelines Part 3. Copy exactly.
```

---

### Phase 1 verification checklist

- [ ] `src/types/index.ts` exports all 12 types listed above
- [ ] All three schema files exist under `src/lib/schemas/`
- [ ] `src/lib/questions.ts` exports QUESTIONS, SCALE_LABELS, SCORE_RANGES, getScoreRange, RESULTS_COPY, EMAIL_COPY
- [ ] QUESTIONS array has exactly 12 items
- [ ] RESULTS_COPY has keys: at_risk, under_strain, strong
- [ ] EMAIL_COPY has keys: at_risk, under_strain, strong with subject and body
- [ ] `npx tsc --noEmit` passes with no type errors

---

## Phase 2 — Quiz engine (public side)

**Goal:** The complete quiz experience is functional — intro screen, all 12 question screens with progress bar, localStorage persistence, and back navigation. No gate or results yet.

---

### Task 2.1 — Quiz state management

**Claude Code prompt:**
```
Create src/lib/quiz-store.ts — a client-side module that manages quiz state using localStorage.

Functions to export:
- saveAnswer(questionIndex: number, value: number): void — saves a single answer to localStorage
- saveProgress(currentIndex: number): void — saves the current question index
- loadSession(): { answers: (number | null)[], currentIndex: number } | null — loads existing session or returns null
- clearSession(): void — removes all quiz data from localStorage
- isSessionComplete(answers: (number | null)[]): boolean — returns true if all 12 answers are non-null

localStorage keys:
- 'fcd_answers' — JSON array of 12 nullable numbers
- 'fcd_current_index' — current question index (0-based)

This is a plain module, not a React context or Zustand store.
```

---

### Task 2.2 — Progress bar component

**Claude Code prompt:**
```
Create src/components/quiz/ProgressBar.tsx

Props: { current: number, total: number }
- current is 1-based (current question number)
- total is always 12

Renders:
- Label text: "Question [current] of [total]" — exact string from Content Guidelines Section 4.2
- Track: full-width, height h-1.5, bg-white/20, rounded-full
- Fill: brand gold (#F0C040), width = (current/total * 100)%, transition-all duration-300
- Label uses: text-xs font-sans font-400 text-white/60

Use the cn() utility for class merging.
This is a pure presentational component — no state.
```

---

### Task 2.3 — Answer scale component

**Claude Code prompt:**
```
Create src/components/quiz/AnswerScale.tsx

Props: { selectedValue: number | null, onSelect: (value: number) => void }

Renders 5 buttons in a row (values 1–5), each displaying:
- The number value
- The label from SCALE_LABELS in src/lib/questions.ts (Never, Rarely, Sometimes, Often, Always)

Button states from Content Guidelines Section 7.7:
- Default: border border-white/30 text-white bg-transparent rounded-lg
- Hover: hover:border-brand-gold hover:text-brand-gold
- Selected: border-brand-gold text-brand-black bg-brand-gold

On mobile: buttons stack or wrap cleanly — use a flex-wrap or grid layout.
Clicking a button calls onSelect(value) immediately.
```

---

### Task 2.4 — Question card component

**Claude Code prompt:**
```
Create src/components/quiz/QuestionCard.tsx

Props: {
  question: { id: string, section: string, text: string }
  selectedValue: number | null
  onSelect: (value: number) => void
  onBack: () => void
  showBack: boolean
  current: number
  total: number
}

Layout (full screen, dark background brand-black):
1. ProgressBar component at top (current, total)
2. Section label: exact styling from Content Guidelines 7.2 — text-xs font-sans font-600 uppercase tracking-widest, text-white/60
3. Question text: text-xl font-sans font-400 text-white, leading-relaxed
4. AnswerScale component below question
5. Back button (shown only when showBack = true): "← Back" — exact string from Content Guidelines 4.2

The card should be vertically centred on screen.
Max width max-w-xl, centred horizontally with px-4 padding on mobile.
```

---

### Task 2.5 — Intro screen

**Claude Code prompt:**
```
Build the intro screen at src/app/page.tsx.

This is a server component. On load it checks for a localStorage quiz session — but since this is server-rendered, the localStorage check must happen client-side. Use a small client wrapper component.

Create src/components/quiz/IntroScreen.tsx as a client component that:
1. On mount, calls loadSession() from quiz-store
2. If a session exists AND has at least one answer saved, immediately calls router.push('/quiz')
3. If no session, renders the intro screen

Intro screen content (exact strings from Content Guidelines Section 4.1):
- Background: bg-brand-black, full screen
- Headline: "Discover the State of Your Family Connection" — text-5xl font-display font-700 text-white
- Subheadline: exact subheadline string from Content Guidelines 4.1 — text-base font-sans font-400 text-white/70
- Time estimate: "Takes about 5 minutes" — text-sm text-white/50
- CTA button: "Start the Diagnosis" — bg-brand-gold text-brand-black font-600 rounded-full

On clicking CTA:
- Call saveProgress(0) to initialise session
- router.push('/quiz')

No logo. No navigation. No footer.
```

---

### Task 2.6 — Quiz page

**Claude Code prompt:**
```
Build the quiz page at src/app/quiz/page.tsx as a client component.

Behaviour:
1. On mount, load session from localStorage via loadSession()
2. If no session found, redirect to /
3. Set current question index from saved progress
4. Pre-fill any saved answers

State:
- answers: (number | null)[] — array of 12, initialised from session or nulls
- currentIndex: number — 0-based

Question display:
- Render QuestionCard for QUESTIONS[currentIndex]
- Pass selectedValue as answers[currentIndex]
- showBack = currentIndex > 0

On answer select:
- Call saveAnswer(currentIndex, value)
- Update answers state
- If currentIndex < 11: call saveProgress(currentIndex + 1), advance to next question with a 300ms delay and fade transition
- If currentIndex === 11 (Q12): call saveProgress(11), router.push('/gate')

On back:
- Call saveProgress(currentIndex - 1)
- Go to previous question with reverse fade transition

Question transition: use a simple opacity fade — question fades out over 150ms, then fades in at 150ms. Use CSS transition classes.
```

---

### Phase 2 verification checklist

- [ ] Visiting `/` shows the intro screen with correct copy
- [ ] Clicking "Start the Diagnosis" navigates to `/quiz`
- [ ] Q1 shows no back button
- [ ] Q2–Q12 show the back button
- [ ] Selecting an answer on Q1–Q11 auto-advances to next question after ~300ms
- [ ] Selecting an answer on Q12 navigates to `/gate`
- [ ] Back button returns to previous question with answer pre-selected
- [ ] Progress bar fills correctly at each question
- [ ] Section labels match Content Guidelines exactly
- [ ] Question text matches Content Guidelines exactly (spot check Q1, Q6, Q12)
- [ ] Closing and reopening the browser resumes at the last question
- [ ] Saved answers are pre-selected on resume
- [ ] `/quiz` visited directly with no session redirects to `/`
- [ ] No TypeScript errors (`npx tsc --noEmit`)

---

## Phase 3 — Gate screen and results page

**Goal:** The gate form captures name, email, and phone. The results page renders the correct copy variant. The API route saves to Supabase (email send comes in Phase 4).

---

### Task 3.1 — Gate form component

**Claude Code prompt:**
```
Create src/components/quiz/GateForm.tsx as a client component.

Use react-hook-form with the GateFormData type and the Zod submitSchema (firstName, email, phone fields only) via @hookform/resolvers/zod.

Fields (exact labels, placeholders, and helper text from Content Guidelines Section 4.3):
- First name (required)
- Email address (required)
- Phone number (optional, with "Optional" helper text)
- Submit button: "See My Results" default, "Getting your results…" when loading
- Privacy note below button

Validation error messages must match Content Guidelines Section 4.3 exactly.

Props: {
  onSubmit: (data: GateFormData) => Promise<void>
  isLoading: boolean
  error: string | null
}

When isLoading = true: disable all inputs and button.
When error is non-null: show error message below button. Exact string: "Something went wrong. Please try again."

Input styling from Content Guidelines Section 7.7:
- Default: border border-gray-300 bg-white rounded-md
- Focus: focus:ring-2 focus:ring-brand-gold focus:border-transparent
- Error state: border-red-500
```

---

### Task 3.2 — Gate page

**Claude Code prompt:**
```
Build src/app/gate/page.tsx as a client component.

On mount:
1. Load session from localStorage
2. If session doesn't have all 12 answers, redirect to /
3. Calculate score: sum of all 12 answer values
4. Determine scoreRange using getScoreRange() from src/lib/questions.ts

Render GateForm component.

On form submit:
1. Set isLoading = true
2. Build the full request body matching submitSchema:
   - firstName, email, phone from form data
   - score (calculated)
   - scoreRange (determined)
   - answers: map localStorage answers to structured format using QUESTIONS from questions.ts
3. POST to /api/submit
4. On success:
   - Store { firstName, score, scoreRange } in sessionStorage as 'fcd_results'
   - Call clearSession() to remove localStorage quiz data
   - router.push('/results')
5. On failure:
   - Set error to "Something went wrong. Please try again."
   - Set isLoading = false

Page layout:
- Background: bg-brand-offwhite
- Centred card, max-w-md, rounded-xl, shadow-sm, bg-white, p-6
- Headline: "Your results are ready" — text-2xl font-display font-500
- Subheadline: exact string from Content Guidelines 4.3
```

---

### Task 3.3 — API route: /api/submit (save only, no email yet)

**Claude Code prompt:**
```
Build src/app/api/submit/route.ts

This is a Next.js App Router API route (POST).

Logic:
1. Parse request body
2. Validate with submitSchema from src/lib/schemas/submit.ts — return 400 with error message if invalid
3. Create Supabase server client using service role key
4. Insert row into respondents table with all fields from the request body
5. Fetch settings row (id = 1) to get whatsapp_cta_url — we will use this in Phase 4 for email
6. For now, return { success: true, scoreRange: body.scoreRange }
7. On any error: return 500 with { success: false, error: 'Internal server error' }

Use the SUPABASE_SERVICE_ROLE_KEY environment variable (not the anon key).
Do not add email sending yet — that comes in Phase 4.
```

---

### Task 3.4 — Results page

**Claude Code prompt:**
```
Build src/app/results/page.tsx as a client component.

On mount:
1. Read 'fcd_results' from sessionStorage
2. If not found, redirect to /
3. Destructure { firstName, score, scoreRange }

Render the results page for the given scoreRange.

Three variants — at_risk, under_strain, strong — as defined in Content Guidelines Section 7.3 (colour treatments) and Part 2 (copy).

Shared layout for all three:
- Score display: "[score] / 60" — large, text-4xl font-display font-600
- Range badge using badge colours from Content Guidelines Section 7.3
- Full results copy block from RESULTS_COPY[scoreRange] in src/lib/questions.ts
  - Replace [First name] with firstName from sessionStorage
  - Render → arrows as plain text (not icons)
  - Preserve paragraph breaks with proper spacing
- CTA button: "Join the Community" — exact string from Content Guidelines 4.4
  - Links to whatsapp_cta_url fetched from /api/settings (GET) on page load
  - If no URL is set: do not render the button
  - Opens in new tab

No logo. No navigation. No back button.
No retake link.

Also create a simple GET /api/settings route that returns the settings row for client use.
```

---

### Phase 3 verification checklist

- [ ] Visiting `/gate` without completing the quiz redirects to `/`
- [ ] Gate form shows all three fields with correct labels and placeholders
- [ ] First name and email are required — validation errors match Content Guidelines exactly
- [ ] Phone field shows "Optional" helper text
- [ ] Submit button shows "Getting your results…" while loading
- [ ] Successful submission navigates to `/results`
- [ ] `/results` visited directly without sessionStorage redirects to `/`
- [ ] Results page shows correct score (e.g. 38 / 60)
- [ ] Results page shows correct range badge for the score
- [ ] Results copy is complete and unmodified — spot check opening paragraph for each range
- [ ] [First name] is replaced with the submitted first name
- [ ] → arrows render as plain text
- [ ] CTA button opens WhatsApp URL in a new tab (set a test URL in settings first)
- [ ] Supabase respondents table has a new row after each test submission
- [ ] localStorage is cleared after successful gate submission
- [ ] No TypeScript errors

---

## Phase 4 — Email: instant results

**Goal:** The instant results email is sent automatically on every quiz submission using Resend and React Email templates.

---

### Task 4.1 — React Email base template

**Claude Code prompt:**
```
Create src/emails/BaseEmail.tsx — a shared layout component used by all three results email templates.

Props: {
  children: React.ReactNode
  ctaLabel?: string
  ctaUrl?: string
  logoUrl?: string
}

Layout (exact specs from Content Guidelines Section 7.11):
- Email max width: 600px
- Outer background: #F5F0E8
- Inner container background: #FFFFFF
- Body padding: 40px horizontal, 48px vertical
- If logoUrl is provided: render a header section with bg-brand-black (#1A1A1A), 24px padding, logo max-height 48px
- CTA button (if ctaLabel and ctaUrl provided):
  - Background: #F0C040
  - Text: #1A1A1A, font-weight 600
  - Padding: 14px vertical, 28px horizontal
  - Border radius: 999px
- Footer: centered, 12px, #888888
  - Text: "© 2025 Ibironke O. Semowo · ibironkeosemowo.com"

Use only @react-email/components primitives (Html, Head, Body, Container, Section, Text, Button, Img, Hr).
```

---

### Task 4.2 — Three results email templates

**Claude Code prompt:**
```
Create three email template files. Each takes { firstName, score, ctaUrl, logoUrl? } as props and wraps BaseEmail.

1. src/emails/ResultsAtRisk.tsx — for score range at_risk (12–29)
2. src/emails/ResultsUnderStrain.tsx — for score range under_strain (30–46)
3. src/emails/ResultsStrong.tsx — for score range strong (47–60)

Each template:
- Subject line: "Your Family Connection results, [firstName]" — exact from Content Guidelines Part 3
- Body: full email body copy from EMAIL_COPY[scoreRange].body in src/lib/questions.ts
  - Replace [First name] with firstName prop
  - Replace [SCORE] with score prop
  - Render → arrows as plain text
  - Preserve paragraph breaks as separate Text components
- CTA button rendered via BaseEmail with ctaUrl and label "Join the Community"

Do not shorten, paraphrase, or alter any copy. These are the authoritative email texts.
```

---

### Task 4.3 — Resend client and send function

**Claude Code prompt:**
```
1. Create src/lib/resend.ts — initialises and exports the Resend client:
   export const resend = new Resend(process.env.RESEND_API_KEY!)

2. Create src/lib/send-results-email.ts — a server-side function:

async function sendResultsEmail({
  firstName,
  email,
  score,
  scoreRange,
  ctaUrl,
  logoUrl,
}: SendResultsEmailParams): Promise<{ success: boolean; error?: string }>

Logic:
- Select the correct template component based on scoreRange
- Render it to HTML using render() from @react-email/components
- Send via resend.emails.send() with:
  - from: 'Ibironke Semowo <hello@ibironkeosemowo.com>'
  - to: email
  - subject: EMAIL_COPY[scoreRange].subject with [First name] replaced by firstName
  - html: rendered template output
- Return { success: true } on success
- Return { success: false, error: message } on failure — do not throw
```

---

### Task 4.4 — Wire email into /api/submit

**Claude Code prompt:**
```
Update src/app/api/submit/route.ts to send the results email after saving the respondent.

After the Supabase insert succeeds:
1. Fetch settings (id = 1) to get whatsapp_cta_url and logo_url
2. Call sendResultsEmail() with respondent data and settings values
3. If email send fails: log the error but do NOT fail the API response — the respondent is already saved, so we return success regardless. Email failure should never block the results page.
4. Return { success: true, scoreRange } as before

The email send must not block the response unnecessarily — consider using a non-awaited call with a try/catch that only logs errors, or await it but handle failure gracefully.
```

---

### Task 4.5 — Test email preview

**Claude Code prompt:**
```
Create a preview entry for each email template so they can be viewed locally.

Run: npm run email

This starts the React Email preview server at localhost:3001.

Ensure all three templates (ResultsAtRisk, ResultsUnderStrain, ResultsStrong) appear in the preview with:
- firstName: "Sarah"
- score: 22 (at_risk), 38 (under_strain), 52 (strong)
- ctaUrl: "https://wa.me/test"
- logoUrl: undefined

If any template throws errors in preview, fix them before proceeding.
```

---

### Phase 4 verification checklist

- [ ] `npm run email` starts preview server at localhost:3001
- [ ] All three email templates render correctly in preview
- [ ] Subject line format is correct in all three templates
- [ ] Opening paragraph matches Content Guidelines exactly for each range (spot check)
- [ ] Score value is correctly injected
- [ ] First name is correctly injected
- [ ] CTA button renders with gold background
- [ ] Footer shows correct text
- [ ] Complete a quiz end-to-end — check that an email arrives in the submitted inbox
- [ ] Email lands in inbox, not spam (if sending from custom domain)
- [ ] If email send fails, the results page still loads (API does not fail)
- [ ] Supabase respondents table row is created regardless of email success/failure
- [ ] No TypeScript errors

---

## Phase 5 — Admin foundation

**Goal:** Ibironke can log in, see a protected layout with sidebar navigation, and log out. All admin routes are protected.

---

### Task 5.1 — Complete middleware

**Claude Code prompt:**
```
Replace the stub in src/middleware.ts with the full authentication middleware from the Backend Schema document Section 5.2.

The middleware must:
1. Run on all /admin/* routes
2. Call supabase.auth.getUser() on every request
3. If no user session: redirect to /admin/login
4. If session exists: query admin_profiles for a row where id = user.id AND is_active = true
5. If no active profile found: sign out and redirect to /admin/login
6. If valid profile: allow request through
7. If user is on /admin/login and already authenticated: redirect to /admin

Use the exact implementation from Backend Schema Section 5.2.
```

---

### Task 5.2 — Admin login page

**Claude Code prompt:**
```
Build src/app/admin/login/page.tsx as a client component.

Content (exact strings from Content Guidelines Section 4.5):
- Page title label: "Family Connection Diagnosis — Admin"
- Email field with label "Email address"
- Password field with label "Password" and show/hide toggle ("Show" / "Hide")
- Submit button: "Log in"

Use react-hook-form. On submit:
1. Call supabase.auth.signInWithPassword({ email, password })
2. On success: router.push('/admin')
3. On error:
   - Invalid credentials: show "Incorrect email or password" below form
   - Empty fields: show "Please enter your email" / "Please enter your password"
   - Network error: "Something went wrong. Please try again."

Layout: centred card on a dark background (bg-brand-black), card is bg-white rounded-2xl shadow-xl p-8, max-w-sm.
```

---

### Task 5.3 — Admin layout with sidebar

**Claude Code prompt:**
```
Create src/app/admin/layout.tsx — the shared layout for all admin pages.

This is a server component. It wraps all /admin/* pages except /admin/login.

Sidebar (always visible on desktop, hidden on mobile):
- Width: w-64, fixed left, full height, bg-brand-black
- App label at top: "Family Connection Diagnosis" — small, white, font-sans
- Navigation links (exact labels from Content Guidelines Section 4.15):
  - Dashboard → /admin
  - Respondents → /admin/respondents
  - Broadcasts → /admin/broadcasts
  - Settings → /admin/settings
- Active state: gold left border (border-l-2 border-brand-gold) and text-brand-gold
- Use Next.js usePathname() in a client component to determine active route
- At bottom: logged-in email address (fetched server-side) + "Log out" button

Log out:
- Create a small client component LogoutButton that calls supabase.auth.signOut() then router.push('/admin/login')

Mobile:
- Sidebar hidden by default (hidden lg:block)
- Hamburger button (top left of main area) opens sidebar as full-height overlay drawer
- Tapping outside the drawer or any nav link closes it

Main content area:
- On desktop: ml-64 to account for fixed sidebar
- On mobile: full width
- Padding: p-6 on desktop, p-4 on mobile

Create src/app/admin/login/layout.tsx as a separate empty layout so the login page does NOT get the sidebar.
```

---

### Task 5.4 — Create admin account

**Claude Code prompt:**
```
Create scripts/create-admin.ts using the exact implementation from Backend Schema Section 5.3.

After creating the file, display these instructions to run it:
"To create the admin account:
1. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local
2. Update the email and password in the script
3. Run: npx ts-node --project tsconfig.json scripts/create-admin.ts
4. Confirm success message
5. Delete the script immediately after running — do not commit it"
```

---

### Phase 5 verification checklist

- [ ] Visiting `/admin` without being logged in redirects to `/admin/login`
- [ ] Visiting `/admin/respondents` without being logged in redirects to `/admin/login`
- [ ] Logging in with correct credentials redirects to `/admin`
- [ ] Logging in with wrong password shows "Incorrect email or password"
- [ ] Admin layout renders sidebar on desktop with all four nav links
- [ ] Active nav link has gold left border and gold text
- [ ] Hamburger opens sidebar drawer on mobile
- [ ] Log out button signs out and redirects to `/admin/login`
- [ ] After logging out, `/admin` redirects back to `/admin/login`
- [ ] Admin account exists in Supabase Auth dashboard
- [ ] `admin_profiles` table has one row with `is_active = true`
- [ ] No TypeScript errors

---

## Phase 6 — Admin respondents

**Goal:** Ibironke can view the full respondents list, filter and sort it, and view any individual respondent's answers and email history.

---

### Task 6.1 — Respondents list page

**Claude Code prompt:**
```
Build src/app/admin/respondents/page.tsx as a server component.

Fetch all respondents from Supabase ordered by submitted_at descending.

Render:
1. Page heading: "Respondents" — text-2xl font-display
2. Controls bar: filter dropdown and sort dropdown (client component for interactivity)
3. Summary count: "Showing [N] respondent[s]" — exact string from Content Guidelines 4.7
4. Respondents table

Table columns (exact from Content Guidelines 4.7):
- First name (links to /admin/respondents/[id])
- Email address
- Phone (shows "—" if null)
- Score (e.g. 38 / 60)
- Range badge (colour-coded — use badge colours from Content Guidelines 7.3)
- Date submitted (formatted with date-fns: "14 May 2026")
- Email status (shows last known event type or "—")

Make the table client-interactive for filtering and sorting without full page reload. Use URL search params to persist filter state.

Empty state (exact strings from Content Guidelines 4.7):
- Heading: "No respondents yet"
- Subtext + quiz URL + copy button

Empty state for filtered view with no results:
- "No respondents in this range yet"
```

---

### Task 6.2 — Respondent detail page

**Claude Code prompt:**
```
Build src/app/admin/respondents/[id]/page.tsx as a server component.

Fetch the respondent by id from Supabase. If not found, show "Respondent not found" with a back link.

Layout (exact strings from Content Guidelines Section 4.8):

1. Back link: "← Back to respondents" → /admin/respondents

2. Profile header card:
   - Full name (text-2xl font-display)
   - Email address (as mailto link)
   - Phone (or "Not provided")
   - Score badge: "[score] / 60 — [range label]"
   - Date submitted

3. Answers section:
   - Heading: "Diagnostic answers"
   - Group questions by section (A–F)
   - For each question: show section label, question text, and the answer given
   - Answer display: value number + label (e.g. "3 — Sometimes")
   - Visual indicator: 5 small dots or a short bar showing where 1–5 falls

4. Email activity section:
   - Heading: "Email activity"
   - Query email_events for this respondent
   - Show each event: type (delivered/opened), date, and broadcast subject (if applicable)
   - If instant results email: label as "Results email"
   - Empty state: "No email activity recorded yet"
```

---

### Phase 6 verification checklist

- [ ] `/admin/respondents` loads and shows all respondents
- [ ] Filter by score range works correctly
- [ ] Sort by date and score works correctly
- [ ] Count label updates when filter is applied
- [ ] Range badges show correct colours for each range
- [ ] Phone column shows "—" for respondents without phone
- [ ] Date is formatted correctly (e.g. "14 May 2026")
- [ ] Clicking a row navigates to `/admin/respondents/[id]`
- [ ] Detail page shows all 12 answers grouped by section
- [ ] Each answer shows value and label (e.g. "4 — Often")
- [ ] Back link returns to respondents list
- [ ] Visiting `/admin/respondents/invalid-id` shows "Respondent not found"
- [ ] Empty state shows when no respondents exist
- [ ] No TypeScript errors

---

## Phase 7 — Broadcast composer

**Goal:** Ibironke can compose a broadcast email, save it as a draft, and reach the confirmation screen. No actual sending yet.

---

### Task 7.1 — Tiptap rich text editor component

**Claude Code prompt:**
```
Create src/components/admin/RichTextEditor.tsx as a client component.

Use Tiptap with the following extensions:
- StarterKit (bold, italic, bullet list, numbered list, paragraphs)
- Link extension
- Placeholder extension: "Write your message here…" — exact string from Content Guidelines 4.10

Props: { value: string, onChange: (html: string) => void, placeholder?: string }

Toolbar buttons (above the editor): Bold, Italic, Bullet list, Numbered list, Link
- Active state: gold background on active formatting button
- Use editor.isActive() to determine active state

The editor outputs HTML via editor.getHTML() on every change.
Min height: 200px.
Border: border border-gray-300, rounded-md.
Focus: ring-2 ring-brand-gold.
```

---

### Task 7.2 — Audience selector component

**Claude Code prompt:**
```
Create src/components/admin/AudienceSelector.tsx as a client component.

Props: {
  value: { type: AudienceType, ids?: string[] }
  onChange: (value: { type: AudienceType, ids?: string[] }) => void
  respondents: { id: string, firstName: string, email: string, scoreRange: ScoreRange }[]
}

Renders (exact labels from Content Guidelines 4.10):
- Radio group with options: "All respondents", "Connection at risk (12–29)", "Connection under strain (30–46)", "Connection is strong (47–60)", "Select individuals"
- When "Select individuals" is selected: show a searchable multi-select list of respondents filtered by name or email input
- Live recipient count below selector: "This will send to [N] people" — exact string from Content Guidelines 4.10
- Warning when respondents with no email exist: "[N] respondent[s] in this audience have no email address and will be skipped" — exact string from Content Guidelines 4.10

Count calculation: filter the respondents array by the selected audience type, then count those with non-empty email addresses.
```

---

### Task 7.3 — Broadcast composer page

**Claude Code prompt:**
```
Build src/app/admin/broadcasts/new/page.tsx and src/app/admin/broadcasts/[id]/edit/page.tsx.

Both use a shared BroadcastComposerForm client component at src/components/admin/BroadcastComposerForm.tsx.

The composer has four sections (exact labels and strings from Content Guidelines Section 4.10):

Section 1 — Email content:
- Subject line input (required, character count "[N] / 150")
- RichTextEditor component for body (required)

Section 2 — Optional elements:
- Logo toggle: "Include logo at top of email"
  - If no logo in settings: toggle disabled with note "Upload a logo in Settings first"
  - Check logo existence by fetching /api/settings on mount
- CTA toggle: "Add a call-to-action button"
  - When toggled on: show "Button label" input and "Destination URL" input

Section 3 — Audience:
- AudienceSelector component
- Fetch all respondents from Supabase for the selector

Section 4 — Send options:
- Radio: "Send now" or "Schedule for later"
- When "Schedule for later": show date + time picker, show "WAT — West Africa Time" label

Bottom action buttons:
- "Save draft": saves to Supabase with status = 'draft', shows toast "Draft saved", stays on page
- "Preview": renders email preview in a modal (basic HTML preview is fine)
- "Continue": validates form with broadcastSchema, navigates to /admin/broadcasts/[id]/confirm

Auto-save: save draft silently every 60 seconds if any content exists. Show "Draft auto-saved" indicator briefly.

For the edit page: fetch existing broadcast on mount and pre-fill all fields.
```

---

### Phase 7 verification checklist

- [ ] Navigating to `/admin/broadcasts/new` loads the composer
- [ ] Subject character count updates as user types
- [ ] Rich text editor renders with toolbar
- [ ] Bold, italic, bullet list, numbered list formatting works
- [ ] Logo toggle is disabled when no logo is in settings
- [ ] CTA toggle shows/hides label and URL fields
- [ ] Audience selector shows all four range options
- [ ] "Select individuals" shows searchable respondent list
- [ ] Recipient count updates as audience selection changes
- [ ] Warning appears when selected audience contains respondents with no email
- [ ] "Send now" / "Schedule for later" radio works
- [ ] Date/time picker appears when "Schedule for later" selected
- [ ] "Save draft" saves to Supabase and shows toast "Draft saved"
- [ ] Draft appears in `/admin/broadcasts` list with "Draft" badge
- [ ] Editing a draft pre-fills all fields correctly
- [ ] "Continue" with empty subject shows validation error
- [ ] "Continue" with empty body shows validation error
- [ ] "Continue" with past scheduled time shows validation error
- [ ] Auto-save fires after 60 seconds with content present
- [ ] No TypeScript errors

---

## Phase 8 — Broadcast sending and scheduling

**Goal:** Broadcasts can be sent immediately or at a scheduled time. The Cron job fires scheduled broadcasts automatically.

---

### Task 8.1 — Broadcast send confirmation page

**Claude Code prompt:**
```
Build src/app/admin/broadcasts/[id]/confirm/page.tsx as a client component.

Fetch the broadcast by ID on mount.

Render (exact strings from Content Guidelines Section 4.11):
- Page heading: "Review before sending" or "Review before scheduling" based on send option
- Summary card:
  - Subject line
  - Audience: e.g. "All respondents (47 people)"
  - Send time: "Now" or "Scheduled for [DATE] at [TIME] WAT"
  - Skipped warning if applicable: "[N] respondent[s] have no email address and will be skipped. This will send to [N] people."
- Rendered email preview (HTML rendered in an iframe or sanitised div, scrollable)
- "← Back to edit" button → /admin/broadcasts/[id]/edit
- Confirm button: "Send now" or "Schedule" with loading state "Sending…" / "Scheduling…"

On confirm:
- POST to /api/broadcasts/send with { broadcastId }
- On success: router.push('/admin/broadcasts/[id]')
- On failure: show "Something went wrong. Your broadcast was not sent. Please try again." — exact string from Content Guidelines 4.11
```

---

### Task 8.2 — Broadcast send API route

**Claude Code prompt:**
```
Build src/app/api/broadcasts/send/route.ts (POST).

This route is called by:
a) The confirm page (admin session auth)
b) The Cron job (CRON_SECRET bearer token auth)

Auth check:
- First check Authorization header for Bearer CRON_SECRET
- If not present, verify Supabase admin session
- Reject if neither is valid

Logic:
1. Get broadcastId from request body
2. Fetch broadcast from Supabase — verify it exists and status is not already 'sent'
3. Call get_broadcast_audience(audience_type, audience_ids) Supabase function to get recipients
4. For each recipient with a valid email:
   a. Render broadcast email template (src/emails/Broadcast.tsx — create this)
   b. Send via Resend, capture the returned email ID
   c. Insert row into broadcast_recipients with resend_email_id
5. Update broadcast:
   - status → 'sent'
   - sent_at → now()
   - recipient_count → count of recipients attempted
6. Return { success: true, sent: count }

Create src/emails/Broadcast.tsx — the flexible broadcast email template that renders any subject, body_html, optional CTA, and optional logo using BaseEmail.
```

---

### Task 8.3 — Cron job route

**Claude Code prompt:**
```
Build src/app/api/cron/send-broadcasts/route.ts (GET).

Logic:
1. Verify Authorization: Bearer [CRON_SECRET] header — return 401 if missing or wrong
2. Query Supabase for broadcasts where status = 'scheduled' AND scheduled_at <= now()
3. For each result: POST to /api/broadcasts/send internally with { broadcastId }
4. Return { fired: count }

Also create vercel.json in the project root with the Cron configuration:
{
  "crons": [
    {
      "path": "/api/cron/send-broadcasts",
      "schedule": "* * * * *"
    }
  ]
}
```

---

### Task 8.4 — Broadcast detail / stats page

**Claude Code prompt:**
```
Build src/app/admin/broadcasts/[id]/page.tsx as a server component.

Fetch the broadcast and its stats.

For a SENT broadcast (exact strings from Content Guidelines 4.12):
- Subject line as heading
- Sent date and time
- Stats row: Recipients, Delivered, Opened, Open rate %
- If stats are 0 with sent_at set: show "Delivery data usually appears within a few minutes."
- Recipient breakdown table: name, email, delivered status, opened status
- Email preview (collapsible)

For a SCHEDULED broadcast:
- Subject as heading
- Status badge "Scheduled"
- Scheduled time
- Audience description + count
- "Edit broadcast" → /admin/broadcasts/[id]/edit
- "Cancel broadcast" → confirmation modal with exact strings from Content Guidelines 4.12
  - On confirm: update status to 'draft', redirect to /admin/broadcasts

For a DRAFT broadcast:
- Subject as heading
- Status badge "Draft"
- "Edit broadcast" button
- "Delete draft" → confirmation modal with exact strings from Content Guidelines 4.12
  - On confirm: delete broadcast row, redirect to /admin/broadcasts
```

---

### Phase 8 verification checklist

- [ ] Completing the composer and clicking "Continue" reaches the confirmation screen
- [ ] Confirmation screen shows correct subject, audience count, and send time
- [ ] Skipped warning appears when audience contains respondents without email
- [ ] "← Back to edit" returns to composer with all content preserved
- [ ] "Send now" sends the broadcast and redirects to the stats page
- [ ] Stats page shows recipient count immediately after send
- [ ] Broadcast row in Supabase has status = 'sent' and sent_at populated after send
- [ ] broadcast_recipients rows exist for each recipient after send
- [ ] Scheduled broadcast appears in list with "Scheduled" badge
- [ ] After the scheduled time passes, Cron fires the broadcast (test with a near-future time)
- [ ] Cancelling a scheduled broadcast saves it as a draft
- [ ] Deleting a draft removes it from the list
- [ ] `vercel.json` exists with the Cron config
- [ ] No TypeScript errors

---

## Phase 9 — Email tracking

**Goal:** Resend webhook events are received and stored. Delivery and open stats are visible in the admin.

---

### Task 9.1 — Webhook handler

**Claude Code prompt:**
```
Build src/app/api/webhooks/resend/route.ts (POST).

Use svix for signature verification:
- Import Webhook from 'svix'
- Verify using RESEND_WEBHOOK_SECRET environment variable
- Read svix-id, svix-timestamp, svix-signature from request headers
- If verification fails: return 400

Handle event types:
- 'email.delivered'
- 'email.opened'

For each valid event:
1. Extract resend_email_id from payload (payload.data.email_id)
2. Look up broadcast_recipients row by resend_email_id
3. If found: resolve broadcast_id and respondent_id
4. Insert row into email_events:
   - broadcast_id (nullable if not found)
   - respondent_id (nullable if not found)
   - resend_email_id
   - event_type ('delivered' or 'opened')
   - occurred_at (from payload timestamp)
   - raw_payload (full payload as jsonb)
5. If event = 'delivered':
   - Call increment_broadcast_count(broadcast_id, 'delivered_count') if broadcast_id found
6. If event = 'opened':
   - Check if an 'opened' event already exists for this resend_email_id
   - If NOT: call increment_broadcast_count(broadcast_id, 'opened_count') — de-duplicate
7. Return 200

Return 200 for all unhandled event types (do not return errors for events we don't track).
```

---

### Task 9.2 — Wire stats into broadcast detail page

**Claude Code prompt:**
```
Update src/app/admin/broadcasts/[id]/page.tsx to display live tracking data.

For the sent broadcast view:
1. Fetch delivered_count, opened_count, recipient_count from broadcasts table (already stored as denormalised counts)
2. Calculate open_rate = (opened_count / delivered_count * 100).toFixed(1) + '%' — show "—" if delivered_count is 0
3. Display stats row with all four values
4. Fetch broadcast_recipients joined with email_events for the per-recipient breakdown table
5. Per recipient: show first name, email, delivered tick/cross, opened tick/cross

For the respondent detail page (src/app/admin/respondents/[id]/page.tsx):
1. Fetch all email_events for this respondent
2. For each event: show type, date, and broadcast subject (join to broadcasts table if broadcast_id is not null)
3. Instant results email events: show "Results email" as the label
```

---

### Phase 9 verification checklist

- [ ] Resend webhook URL is configured in Resend dashboard pointing to `/api/webhooks/resend`
- [ ] `RESEND_WEBHOOK_SECRET` is set in `.env.local` and Vercel
- [ ] Sending a broadcast and waiting a few minutes shows delivered count increasing
- [ ] Opening the email shows opened count increasing (test with your own email)
- [ ] Open rate percentage calculates correctly
- [ ] Per-recipient breakdown shows correct delivered/opened status
- [ ] email_events rows exist in Supabase after delivery/open events
- [ ] Respondent detail page shows email activity for results email and broadcasts
- [ ] Duplicate opens are not double-counted (open a test email multiple times)
- [ ] Webhook returns 200 for unhandled event types
- [ ] No TypeScript errors

---

## Phase 10 — Admin dashboard home and settings

**Goal:** The dashboard home shows summary stats. The settings page lets Ibironke update the WhatsApp link and upload her logo.

---

### Task 10.1 — Dashboard home

**Claude Code prompt:**
```
Build src/app/admin/page.tsx as a server component.

Call the get_dashboard_stats() Supabase function to get { total, at_risk, under_strain, strong }.

Render (exact strings from Content Guidelines Section 4.6):

1. Page heading: "Dashboard"

2. Four stat cards in a grid (2x2 on mobile, 4x1 on desktop):
   - "Total respondents" — total count
   - "Connection at risk" — at_risk count
   - "Connection under strain" — under_strain count
   - "Connection is strong" — strong count

3. Recent respondents section:
   - Heading: "Recent respondents"
   - Fetch 5 most recent respondents
   - Simple table: name, score, range badge, date
   - "View all respondents →" link → /admin/respondents

4. Broadcasts section:
   - Count of scheduled broadcasts: "You have [N] broadcast[s] scheduled" with link
   - Count of drafts: "You have [N] draft[s] in progress" with link
   - If none: "No broadcasts scheduled — compose one" with link to /admin/broadcasts/new

Empty state (no respondents):
- All stat cards show 0
- Heading: "No one has taken the quiz yet"
- Subtext: "Share your quiz link to get started:"
- Quiz URL: "quiz.ibironkeosemowo.com" with copy-to-clipboard button
- Copy button states: "Copy link" → "Copied!" (revert after 2 seconds)
```

---

### Task 10.2 — Settings page

**Claude Code prompt:**
```
Build src/app/admin/settings/page.tsx as a client component.

Fetch current settings (id = 1) on mount.

Render two sections (exact strings from Content Guidelines Section 4.13):

Section 1 — WhatsApp CTA link:
- Heading: "Results page CTA link"
- Description: exact string from Content Guidelines 4.13
- URL input pre-filled with current whatsapp_cta_url
- "Save" button beside input
- On save: PATCH /api/admin/settings with { whatsappCtaUrl }
- On success: show toast "CTA link updated"
- On invalid URL: show inline error "Please enter a valid URL"

Section 2 — Broadcast email logo:
- Heading: "Broadcast email logo"
- Description: exact string from Content Guidelines 4.13

If no logo:
- Dashed upload area: "Click to upload or drag and drop"
- File note: "PNG or JPG, max 2MB"
- On file select:
  a. Validate type (PNG or JPG) and size (max 2MB)
  b. Upload to Supabase Storage bucket 'logos' at path 'logo.[ext]'
  c. Get public URL
  d. PATCH /api/admin/settings with { logoUrl, logoStoragePath }
  e. Show toast "Logo uploaded"

If logo exists:
- Show preview image
- "Replace logo" button (opens file picker, same upload flow)
- "Remove logo" button → confirmation modal with exact strings from Content Guidelines 4.13
  - On confirm: delete from Supabase Storage, PATCH settings with { logoUrl: null, logoStoragePath: null }, show toast "Logo removed"

Error messages (exact from Content Guidelines 4.13):
- Wrong file type: "Please upload a PNG or JPG file"
- Too large: "File must be under 2MB"
```

---

### Task 10.3 — Settings API route

**Claude Code prompt:**
```
Build src/app/api/admin/settings/route.ts with two methods:

GET:
- Fetch settings row (id = 1) using service role client
- Return the full settings object
- This is used by the results page to get the CTA URL (public — no auth required for GET)

PATCH:
- Verify admin session
- Validate request body with settingsSchema
- Update settings row (id = 1) with provided fields
- Return updated settings object
```

---

### Phase 10 verification checklist

- [ ] Dashboard home loads with correct stat counts
- [ ] Range counts add up to total respondents
- [ ] Recent respondents table shows 5 most recent
- [ ] "View all respondents" link works
- [ ] Scheduled and draft broadcast counts show correctly
- [ ] Empty state shows when no respondents exist with quiz URL copy button
- [ ] Copy button copies URL and shows "Copied!" briefly
- [ ] Settings page loads with current values pre-filled
- [ ] Saving a valid WhatsApp URL shows "CTA link updated" toast
- [ ] Saving an invalid URL shows inline error
- [ ] Logo upload works — logo appears in preview
- [ ] Uploaded logo appears in email preview in broadcaster composer
- [ ] Logo replace replaces the existing file
- [ ] Logo remove shows confirmation modal and removes logo on confirm
- [ ] Results page CTA button uses the saved WhatsApp URL
- [ ] No TypeScript errors

---

## Phase 11 — Polish and quality assurance

**Goal:** The entire application is responsive, all empty states and error states are implemented, transitions are smooth, and copy is verified against the Content Guidelines.

---

### Task 11.1 — Responsive audit

**Claude Code prompt:**
```
Audit and fix responsive behaviour for every page in the application.

For each page, verify it matches the responsive spec in Content Guidelines Section 7.9:

Quiz side:
- Intro: full screen, centred on all viewports
- Quiz questions: centred card max-w-xl with px-4 on mobile
- Answer scale buttons: flex-wrap on small screens, no overflow
- Gate form: centred card max-w-md with px-4 on mobile
- Results page: centred card max-w-xl, full scroll on mobile

Admin side:
- Sidebar: hidden on mobile, hamburger opens full-height drawer
- Dashboard stats: 2-column grid on mobile, 4-column on desktop
- Respondents table: horizontal scroll on mobile overflow
- Broadcast composer: single column on all viewports
- Detail pages: stacked on mobile

Fix any layouts that break at 375px width (iPhone SE size).
```

---

### Task 11.2 — Complete all empty states

**Claude Code prompt:**
```
Verify and implement all empty states defined in the AppFlow document and Content Guidelines.

Check every page against the AppFlow Part 4 error and edge case reference table.

Specifically verify:
1. /admin — no respondents: "No one has taken the quiz yet" with quiz URL and copy button
2. /admin/respondents — no respondents: "No respondents yet" with quiz URL
3. /admin/respondents — filtered with no results: "No respondents in this range yet"
4. /admin/broadcasts — no broadcasts: "No broadcasts yet" with "Compose a broadcast" button
5. Broadcast detail — sent but no stats yet: "Delivery data usually appears within a few minutes."
6. Respondent detail — no email activity: "No email activity recorded yet"

Implement any that are missing. All strings must match Content Guidelines exactly.
```

---

### Task 11.3 — Complete all error states

**Claude Code prompt:**
```
Verify and implement all error states defined in the AppFlow document.

Specifically verify:
1. Gate form API failure: inline error "Something went wrong. Please try again." — form preserved, retry works
2. Admin login — bad credentials: "Incorrect email or password"
3. Admin login — network error: "Something went wrong. Please try again."
4. Broadcast send failure on confirm page: "Something went wrong. Your broadcast was not sent. Please try again."
5. /admin/respondents/[invalid-id]: "Respondent not found" with back link
6. /results accessed without sessionStorage: redirect to /
7. /gate accessed without quiz session: redirect to /

Test each error state manually. Fix any that are missing or show wrong messages.
```

---

### Task 11.4 — Animation and transition polish

**Claude Code prompt:**
```
Implement all transitions defined in Content Guidelines Section 7.10.

1. Quiz question advance/back: fade transition (opacity 0→1, 250ms)
2. Progress bar fill: transition-all duration-300
3. Admin sidebar mobile drawer: slide in from left, 200ms
4. Toast notifications: fade in + slide down from top, 200ms; fade out 150ms
5. Modal appear: fade in + scale from 95% to 100%, 200ms
6. Button hover/active transitions: transition-colors 150ms, active:scale-95 with transition-transform 100ms

Ensure NO bounce, spring, or decorative animations are used anywhere.
Use Tailwind transition utilities where possible. Use CSS keyframes only if Tailwind classes are insufficient.
```

---

### Task 11.5 — Copy verification pass

**Claude Code prompt:**
```
Do a complete copy audit of the entire application against the Content Guidelines document.

Check every visible string in the app against the Content Guidelines. Flag and fix any that differ.

Critical checks:
1. All 12 question texts — compare word for word
2. All 5 scale labels (Never, Rarely, Sometimes, Often, Always)
3. All three results page copy blocks — check opening paragraph, bullet points, closing line
4. All three email body copy blocks — check opening, score injection, closing
5. All button labels across the app
6. All empty state messages
7. All error messages
8. All toast messages
9. All confirmation modal copy

Report any discrepancy found before fixing it.
```

---

### Task 11.6 — Loading states

**Claude Code prompt:**
```
Implement skeleton loading states for all data-fetching admin pages.

Pages to add skeletons to:
- /admin (stat cards and recent respondents table)
- /admin/respondents (table rows)
- /admin/respondents/[id] (profile header and answers section)
- /admin/broadcasts (table rows)
- /admin/broadcasts/[id] (stats and recipient table)

Skeleton pattern: grey rounded rectangles (bg-gray-200 animate-pulse) matching the approximate size and shape of the real content.

Use Next.js loading.tsx convention (create loading.tsx alongside each page.tsx) for server component pages.
For client components: show skeletons while data is being fetched, then swap in real content.
```

---

### Phase 11 verification checklist

- [ ] All pages work correctly at 375px width (mobile)
- [ ] Admin sidebar hides on mobile and opens with hamburger
- [ ] Answer scale buttons do not overflow on small screens
- [ ] All 6 empty states render with correct copy
- [ ] All 7 error states render with correct messages and correct behaviour
- [ ] Quiz question fade transition is smooth and consistent
- [ ] Toast notifications appear and auto-dismiss
- [ ] Modals animate in correctly
- [ ] No bounce or spring animations anywhere
- [ ] All 12 question texts verified against Content Guidelines
- [ ] All three results copy blocks verified — no missing paragraphs, no altered text
- [ ] All button labels verified across every page
- [ ] All toast messages verified
- [ ] Skeleton loaders appear on all admin data pages
- [ ] No TypeScript errors
- [ ] `npm run lint` passes with no errors

---

## Phase 12 — Deployment

**Goal:** The application is live at `quiz.ibironkeosemowo.com`, emails send from a custom domain, and all production environment variables are set.

---

### Task 12.1 — Prepare for deployment

**Claude Code prompt:**
```
Prepare the project for production deployment.

1. Run npm run build — fix any build errors before continuing.

2. Verify vercel.json exists with the Cron config:
{
  "crons": [{ "path": "/api/cron/send-broadcasts", "schedule": "* * * * *" }]
}

3. Confirm .env.example has all required variable keys (no values).

4. Confirm .env.local is in .gitignore.

5. Run npx tsc --noEmit — fix any type errors.

6. Run npm run lint — fix any lint errors.

7. Run npm run format:check — fix any formatting issues.

Only proceed when npm run build completes successfully with no errors.
```

---

### Task 12.2 — Vercel deployment

**Techie action (not Claude Code — manual steps):**

```
1. Push project to GitHub repository.

2. Go to vercel.com → New Project → Import from GitHub.

3. Select the family-connection-diagnosis repository.

4. Framework: Next.js (auto-detected).

5. Add all environment variables from .env.local:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - RESEND_API_KEY
   - RESEND_WEBHOOK_SECRET
   - CRON_SECRET
   - NEXT_PUBLIC_APP_URL → set to https://quiz.ibironkeosemowo.com

6. Deploy.

7. Confirm deployment succeeds and the default Vercel URL loads the intro screen.
```

---

### Task 12.3 — Custom domain setup

**Techie action (manual steps):**

```
1. In Vercel project → Settings → Domains → Add domain: quiz.ibironkeosemowo.com

2. In the domain registrar for ibironkeosemowo.com:
   Add a CNAME record:
   - Host: quiz
   - Value: cname.vercel-dns.com
   - TTL: 3600 (or Auto)

3. Wait for DNS propagation (usually 5–30 minutes).

4. Verify quiz.ibironkeosemowo.com loads the application.
```

---

### Task 12.4 — Resend domain verification

**Techie action (manual steps):**

```
1. Go to resend.com → Domains → Add domain: ibironkeosemowo.com

2. Resend will provide 3 DNS records (SPF, DKIM, DMARC).
   Add all three to the domain registrar.

3. Click "Verify" in Resend dashboard. Wait for verification (can take up to 24 hours but usually minutes).

4. Once verified, confirm the from address in sendResultsEmail and Broadcast template is:
   'Ibironke Semowo <hello@ibironkeosemowo.com>'

5. Set up Resend webhook:
   - Resend dashboard → Webhooks → Add endpoint
   - URL: https://quiz.ibironkeosemowo.com/api/webhooks/resend
   - Events: email.delivered, email.opened
   - Copy the webhook signing secret → add to Vercel as RESEND_WEBHOOK_SECRET
   - Redeploy on Vercel after adding the new env variable
```

---

### Task 12.5 — Production smoke test

**Techie action (full end-to-end test on production):**

```
Run through this complete checklist on the live production URL:

Quiz side:
- [ ] quiz.ibironkeosemowo.com loads the intro screen
- [ ] "Start the Diagnosis" begins the quiz
- [ ] All 12 questions load with correct text
- [ ] Progress bar advances correctly
- [ ] Back navigation works
- [ ] Closing and reopening resumes at correct question
- [ ] Gate form validates correctly
- [ ] Submitting the gate form shows the results page
- [ ] Results copy is complete and correct
- [ ] CTA button opens the WhatsApp URL
- [ ] Results email arrives in the submitted inbox within 1 minute
- [ ] Email is delivered to inbox, not spam
- [ ] Email copy is complete and correct for the score range

Admin side:
- [ ] quiz.ibironkeosemowo.com/admin redirects to login
- [ ] Login works with correct credentials
- [ ] Dashboard shows correct stats after the test submission
- [ ] Respondents list shows the test respondent
- [ ] Respondent detail page shows all 12 answers
- [ ] Composing and sending a broadcast works
- [ ] Broadcast email arrives in the target inbox
- [ ] Delivery count increments on the stats page
- [ ] Scheduling a broadcast for 2 minutes in the future fires automatically
- [ ] Settings page saves WhatsApp URL and shows toast
- [ ] Logo upload works and logo appears in email preview

Infrastructure:
- [ ] HTTPS is active on quiz.ibironkeosemowo.com
- [ ] Vercel Cron job appears in Vercel dashboard → Settings → Cron Jobs
- [ ] Supabase tables have correct data after all test actions
```

---

### Phase 12 verification checklist

- [ ] `npm run build` passes with zero errors
- [ ] Application loads at `quiz.ibironkeosemowo.com`
- [ ] HTTPS certificate is active
- [ ] All environment variables are set in Vercel
- [ ] Admin login works in production
- [ ] Complete quiz flow works end-to-end in production
- [ ] Results email arrives in inbox (not spam)
- [ ] Broadcast email arrives in inbox (not spam)
- [ ] Resend domain shows "Verified" in dashboard
- [ ] Resend webhook is configured and receiving events
- [ ] Vercel Cron job is listed in Vercel dashboard
- [ ] Scheduled broadcast fires at correct time
- [ ] All production environment variables are set and correct
- [ ] No console errors in browser on any page

---

## Appendix A — Document reference map

When starting each phase, Claude Code should be given these documents:

| Phase | Must read |
|---|---|
| 0 | TechStack |
| 1 | Backend Schema, TechStack |
| 2 | Content Guidelines (Parts 1, 7), AppFlow (Part 1) |
| 3 | Content Guidelines (Parts 2, 3, 4), AppFlow (Part 1), Backend Schema (8.1) |
| 4 | Content Guidelines (Parts 3, 7.11), Backend Schema (8.1) |
| 5 | AppFlow (Part 2, Screens 2.1–2.3), Backend Schema (5.1–5.4), Content Guidelines (4.5, 4.15) |
| 6 | AppFlow (2.3, 2.4), Content Guidelines (4.7, 4.8), Backend Schema (tables) |
| 7 | AppFlow (2.6), Content Guidelines (4.10), Backend Schema (broadcasts table) |
| 8 | AppFlow (2.7, 2.8), Content Guidelines (4.11, 4.12), Backend Schema (8.2, 8.3) |
| 9 | Backend Schema (8.3, email_events table), AppFlow (2.8) |
| 10 | AppFlow (2.2, 2.9), Content Guidelines (4.6, 4.13), Backend Schema (settings table, 8.6) |
| 11 | Content Guidelines (7.7–7.11), AppFlow (Part 4) |
| 12 | TechStack (Section 13) |

---

## Appendix B — Phase completion summary

| Phase | Deliverable | Testable at |
|---|---|---|
| 0 | Running project, configured toolchain, Supabase connected | localhost:3000 |
| 1 | All types, schemas, and quiz data constants | `npx tsc --noEmit` |
| 2 | Complete quiz flow from intro through Q12 | localhost:3000 |
| 3 | Gate form + results page + Supabase insert | localhost:3000 |
| 4 | Results email sends on submission | Email inbox |
| 5 | Admin login + protected layout + sidebar | localhost:3000/admin |
| 6 | Respondents list and detail pages | localhost:3000/admin/respondents |
| 7 | Broadcast composer with draft saving | localhost:3000/admin/broadcasts |
| 8 | Broadcast sending, scheduling, Cron job | localhost:3000/admin/broadcasts + email inbox |
| 9 | Email tracking stats visible in admin | localhost:3000/admin/broadcasts/[id] |
| 10 | Dashboard stats + settings page | localhost:3000/admin |
| 11 | Fully polished, responsive, verified | Full app |
| 12 | Live at quiz.ibironkeosemowo.com | Production URL |
