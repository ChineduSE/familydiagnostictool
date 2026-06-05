# AppFlow Document
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™
**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Version:** 1.0
**Date:** June 2026
**Companion document:** Family Connection Diagnosis™ PRD v1.0

---

## How to read this document

This document maps every screen, page, state, and transition in the application. It is the single source of truth for how users move through the product — what they see, what they can do, where they go next, and what happens when things go wrong.

It covers two distinct sides of the application:

- **The quiz side** — public-facing, no login, experienced by parents
- **The admin side** — private, login-required, used exclusively by Ibironke

Each screen is described with its route, purpose, content, actions, transitions, empty states, and error states where applicable.

---

## Application map (overview)

```
PUBLIC (quiz side)
├── / ................................. Intro screen
├── /quiz ............................. Question screens (Q1–Q12)
├── /gate ............................. Lead capture (name, email, phone)
└── /results .......................... Personalised results page

ADMIN (private)
├── /admin/login ...................... Login
├── /admin ............................ Dashboard home (summary stats)
├── /admin/respondents ................ Respondents list
├── /admin/respondents/[id] ........... Respondent detail
├── /admin/broadcasts ................. Broadcast list
├── /admin/broadcasts/new ............. Broadcast composer
├── /admin/broadcasts/[id]/confirm .... Send confirmation screen
├── /admin/broadcasts/[id] ............ Broadcast detail / stats
└── /admin/settings ................... Settings
```

---

## Part 1 — The Quiz Side (Public)

---

### Screen 1.1 — Intro Screen

**Route:** `/`
**User:** Parent (anonymous)

#### Purpose
First impression. Communicates the value of the diagnosis and prompts the parent to begin. No distractions. No navigation.

#### Layout and content
- Full-page, centred layout
- Headline: *"Discover the State of Your Family Connection"* (or copy confirmed by Ibironke)
- Subheadline: 2–3 sentence description of what the diagnosis does and what the parent will receive (copy TBD by Ibironke)
- Estimated time: *"Takes about 5 minutes"*
- Single CTA button: **"Start the Diagnosis"**
- No logo
- No navigation bar
- No footer links
- Brand colours: deep black background, gold CTA button, white text

#### On-load behaviour
Before rendering the intro, the app silently checks `localStorage` for a saved quiz session:

- **If a session exists (parent was mid-quiz):** Do not show the intro. Redirect immediately to `/quiz` at the question they left off. The intro is skipped entirely.
- **If no session exists:** Show the intro screen normally.

#### Actions
| Action | Result |
|---|---|
| Click "Start the Diagnosis" | Navigate to `/quiz` — Q1 loads, progress bar initialises at 0%, localStorage session created |

#### Error states
None. This is a static screen with no data dependencies.

---

### Screen 1.2 — Quiz Screen

**Route:** `/quiz`
**User:** Parent (anonymous)

#### Purpose
Delivers the 12 diagnostic questions one at a time. Tracks progress. Allows backward navigation. Saves answers to localStorage continuously.

#### Layout and content
- Progress bar at the top — fills proportionally as questions are answered (e.g. Q3 = 25% full). Shows label: *"Question 3 of 12"*
- Section label above the question text (e.g. *Communication patterns*)
- Question text — large, readable, centred
- Answer scale — 5 horizontally arranged buttons, clearly labelled:
  - 1 — Never
  - 2 — Rarely
  - 3 — Sometimes
  - 4 — Often
  - 5 — Always
- Back button (top left or below question) — available from Q2 onwards. Not shown on Q1.
- No forward/Next button. Selecting an answer auto-advances to the next question after a brief moment (approx. 300ms) so the selection registers visually before the transition.

#### Session persistence (localStorage)
Every answer is saved to localStorage immediately on selection. Saved state includes:
- Current question index
- All answers given so far

If the parent closes the browser and returns to `/`, the intro is bypassed and they resume from their last answered question. Their previously selected answer for that question is pre-filled.

Clearing localStorage (e.g. clearing browser data) resets the quiz entirely.

#### Actions
| Action | Result |
|---|---|
| Select an answer (Q1–Q11) | Answer saved to localStorage, auto-advance to next question |
| Select an answer (Q12) | Answer saved to localStorage, navigate to `/gate` |
| Click Back (Q2–Q12) | Return to previous question, existing answer pre-selected |
| Click Back (Q1) | Back button not shown |

#### Transitions
- Question-to-question: smooth slide or fade transition (left-to-right forward, right-to-left back)
- Q12 answer selected → navigates to `/gate`

#### Error states
None. This screen has no network calls — all logic is local.

---

### Screen 1.3 — Gate Screen (Lead Capture)

**Route:** `/gate`
**User:** Parent (anonymous, has completed Q12)

#### Purpose
Captures the parent's contact details before revealing their results. The parent has earned their results — this is the exchange. Copy must reinforce that they are one step away.

#### Access control
If a parent navigates directly to `/gate` without having completed the quiz (no localStorage session with 12 answers), redirect them to `/`.

#### Layout and content
- Headline: *"Your results are ready"*
- Subtext: *"Enter your details below to see your Family Connection Score"* (or similar — copy TBD)
- Form fields:
  - First name (required)
  - Email address (required)
  - Phone number (optional — labelled as *"Optional"*)
- Submit button: **"See My Results"**
- Privacy note below button: *"Your information is safe. We do not share your details."*
- No back button — the quiz is complete
- No navigation

#### On submit behaviour
1. Client-side validation runs first (name and email required, email format check)
2. If validation passes: button changes to a loading state (*"Getting your results…"*) and is disabled to prevent double submission
3. Score is calculated client-side: sum of all 12 localStorage answers
4. Score range is determined (12–29 / 30–46 / 47–60)
5. POST request sent to `/api/submit` with `{ firstName, email, phone, score, scoreRange, answers }`
6. On success:
   - localStorage quiz session is cleared
   - Parent is redirected to `/results` with score and range passed via query params or sessionStorage
7. On failure: see error states below

#### Validation messages (inline, below each field)
| Field | Condition | Message |
|---|---|---|
| First name | Empty on submit | *"Please enter your first name"* |
| Email | Empty on submit | *"Please enter your email address"* |
| Email | Invalid format | *"Please enter a valid email address"* |

#### Error states

**API failure (network error, Supabase down, Resend down):**
- Button returns to active state
- Inline error message appears below the button: *"Something went wrong. Please try again."*
- Form data is preserved — the parent does not have to re-enter their details
- Parent can retry by clicking the button again
- No redirect. No blank page. No loss of data.

---

### Screen 1.4 — Results Page

**Route:** `/results`
**User:** Parent (has just submitted gate form)

#### Purpose
Delivers the parent's personalised diagnosis. This is the highest-value moment in the entire quiz journey. It must feel personal, warm, and clear. The only action available is the CTA — there is no way back to the quiz from here.

#### Access control
If a parent navigates directly to `/results` without valid score data in query params or sessionStorage, redirect to `/`.

#### Layout and content
Three visually distinct page variants — one per score range. All three share the same structural layout but differ in colour treatment, headline tone, and copy.

**Shared elements across all three variants:**
- Parent's first name used in the opening line (pulled from gate submission)
- Score display: large numeral — e.g. **38 / 60**
- Score range label badge — e.g. *Connection under strain*
- Full results copy block for that range (see PRD Appendix B)
- CTA button: **"Join the Community"** (label TBD by Ibironke) — links to WhatsApp URL stored in admin settings
- No logo
- No navigation
- No link back to the quiz
- No "share your results" feature

**Variant colour treatments:**
| Range | Tone | Suggested treatment |
|---|---|---|
| 12–29 — Connection at risk | Urgent, warm | Gold accent on dark background, strong CTA |
| 30–46 — Connection under strain | Cautious, encouraging | Neutral warm tones, clear CTA |
| 47–60 — Connection is strong | Celebratory, affirming | Lighter, open feel, warm CTA |

#### On-load behaviour
- Page loads with the correct copy variant based on score range
- Parent's first name is rendered into the opening line
- CTA button link is pulled from the `settings` table (`whatsapp_cta_url`)
- If `whatsapp_cta_url` is not yet set in settings, the CTA button is hidden (edge case during initial setup)

#### Actions
| Action | Result |
|---|---|
| Click CTA button | Opens WhatsApp link in a new tab |

#### Error states
None beyond the access control redirect described above.

---

## Part 2 — The Admin Side (Private)

---

### Global admin behaviours

#### Authentication
All `/admin/*` routes are protected by Supabase Auth middleware. Any unauthenticated request to any admin route redirects to `/admin/login`. After successful login, the user is redirected to `/admin` (dashboard home).

#### Navigation — sidebar
The sidebar is always visible on desktop and tablet. It contains:
- App name or wordmark at the top
- Navigation links:
  - Dashboard (icon: grid/home)
  - Respondents (icon: users)
  - Broadcasts (icon: send/mail)
  - Settings (icon: settings/gear)
- Active state: gold left border or gold text on the current page link
- At the bottom: logged-in email address + **"Log out"** link

#### Navigation — mobile
On mobile, the sidebar is hidden by default. A hamburger icon (top left) opens it as a full-height overlay drawer. Tapping any link or tapping outside the drawer closes it.

#### Toast notifications
A toast notification system is available globally across all admin pages. Toasts appear at the top-right of the screen, auto-dismiss after 4 seconds, and can be manually dismissed. Used for:
- Successful save actions
- Successful send / schedule actions
- Non-critical warnings

#### Loading states
All data-fetching pages show a skeleton loading state (placeholder rows/cards) while data loads. No blank white flashes.

---

### Screen 2.1 — Admin Login

**Route:** `/admin/login`
**User:** Ibironke

#### Purpose
Secure entry point to the admin. Single account, email + password.

#### Layout and content
- Centred card layout on a dark or off-white background
- App name or "Family Connection Diagnosis — Admin" label at top
- Email field
- Password field (with show/hide toggle)
- **"Log in"** button
- No "Forgot password" link on screen (handled directly in Supabase dashboard if ever needed — out of scope for UI)
- No sign-up link

#### Actions
| Action | Result |
|---|---|
| Submit valid credentials | Redirect to `/admin` (dashboard home) |
| Submit invalid credentials | Inline error below form: *"Incorrect email or password"* |
| Submit empty fields | Inline validation: *"Please enter your email"* / *"Please enter your password"* |

#### Error states
- Invalid credentials: inline error message, form stays populated, no redirect
- Network error: inline error: *"Something went wrong. Please try again."*

---

### Screen 2.2 — Dashboard Home

**Route:** `/admin`
**User:** Ibironke (authenticated)
**Default landing page after login**

#### Purpose
Quick snapshot of how the diagnosis is performing. Ibironke sees the most important numbers the moment she logs in.

#### Layout and content

**Summary stat cards (top row):**
| Stat | Description |
|---|---|
| Total respondents | All-time count of quiz completions |
| Connection at risk | Count and % of respondents scoring 12–29 |
| Connection under strain | Count and % of respondents scoring 30–46 |
| Connection is strong | Count and % of respondents scoring 47–60 |

**Recent respondents (below stats):**
- A short table showing the 5 most recent respondents
- Columns: name, score, range badge, date submitted
- A **"View all respondents"** link below the table that navigates to `/admin/respondents`

**Broadcasts summary (below recent respondents):**
- Count of scheduled broadcasts (if any): *"You have 2 broadcasts scheduled"* with a link to `/admin/broadcasts`
- Count of drafts (if any): *"You have 1 draft in progress"* with a link to `/admin/broadcasts`
- If no scheduled or draft broadcasts: a prompt — *"No broadcasts scheduled — compose one"* with a link to `/admin/broadcasts/new`

#### Empty state (first login, no data yet)
All stat cards show **0**. The recent respondents section shows:
- Icon (e.g. users outline)
- Message: *"No one has taken the quiz yet"*
- Subtext: *"Share your quiz link to get started: quiz.ibironkeosemowo.com"*
- A copy-to-clipboard button for the quiz URL

#### Loading state
Skeleton placeholders for stat cards and table rows while data fetches.

---

### Screen 2.3 — Respondents List

**Route:** `/admin/respondents`
**User:** Ibironke (authenticated)

#### Purpose
Full list of every parent who has completed the quiz. Filterable and sortable. Primary CRM view.

#### Layout and content

**Controls bar (above table):**
- Filter by score range: dropdown or tab group — All / At risk / Under strain / Strong
- Sort by: Date submitted (newest first, default) / Score (high to low) / Score (low to high)
- Total count label: *"Showing 47 respondents"* (updates with filter)

**Table columns:**
| Column | Notes |
|---|---|
| First name | Clickable — navigates to `/admin/respondents/[id]` |
| Email address | Plain text |
| Phone number | Plain text, shows *"—"* if not provided |
| Score | e.g. 38 / 60 |
| Range | Colour-coded badge: red (at risk), amber (under strain), green (strong) |
| Date submitted | Formatted: e.g. 14 May 2026 |
| Email status | Small icon or label showing last known email event (delivered / opened / —) |

Each row is clickable — navigates to `/admin/respondents/[id]`.

#### Empty state (no respondents yet)
- No table rendered
- Centred message: *"No respondents yet"*
- Subtext: *"Share your quiz link to start collecting results:"*
- Quiz URL displayed with a copy-to-clipboard button: `quiz.ibironkeosemowo.com`

#### Empty state (filter returns no results)
- e.g. Ibironke filters by "Connection at risk" but no one has scored in that range yet
- Message: *"No respondents in this range yet"*

#### Loading state
Skeleton rows (5–8 placeholder rows) while data loads.

---

### Screen 2.4 — Respondent Detail Page

**Route:** `/admin/respondents/[id]`
**User:** Ibironke (authenticated)

#### Purpose
Full profile of a single respondent. Shows their contact details, score, range, submission date, all 12 individual answers, and their email delivery history.

#### Layout and content

**Back navigation:**
- *"← Back to respondents"* link at the top left

**Profile header:**
- Full name
- Email address (mailto link)
- Phone number (or *"Not provided"*)
- Score badge: e.g. **38 / 60 — Connection under strain**
- Date submitted

**Answers section:**
- Heading: *"Diagnostic answers"*
- All 12 questions listed in order, grouped by section (A–F)
- Each question shows:
  - Section label
  - Question text
  - Answer given (1–5) with the label (e.g. *3 — Sometimes*)
  - A simple visual indicator (e.g. filled dots or a small bar) showing where 1–5 falls

**Email history section:**
- Heading: *"Email activity"*
- Lists all email events for this respondent:
  - Instant results email: sent date, delivery status, open status
  - Any broadcasts they were included in: broadcast subject, sent date, delivery status, open status
- If no email events recorded yet: *"No email activity recorded yet"*

#### Actions
| Action | Result |
|---|---|
| Click "← Back to respondents" | Returns to `/admin/respondents` preserving the previous filter/sort state |

#### Error states
- If `[id]` does not exist in Supabase: show *"Respondent not found"* with a back link

---

### Screen 2.5 — Broadcast List

**Route:** `/admin/broadcasts`
**User:** Ibironke (authenticated)

#### Purpose
Overview of all broadcasts — past, scheduled, and drafts. Entry point to composing a new broadcast.

#### Layout and content

**"New broadcast" button** — top right, navigates to `/admin/broadcasts/new`

**Broadcasts table:**
| Column | Notes |
|---|---|
| Subject line | Clickable — navigates to `/admin/broadcasts/[id]` |
| Audience | e.g. *All respondents*, *Connection at risk*, *34 individuals* |
| Status badge | Draft (grey) / Scheduled (amber) / Sent (green) |
| Scheduled / sent date | Shows scheduled time for upcoming, sent time for past. Empty for drafts. |
| Recipients | Number of people it was or will be sent to |
| Open rate | *"—"* for drafts and scheduled; percentage for sent |

Rows are sorted: Scheduled first (soonest at top), then Sent (newest first), then Drafts.

#### Empty state (no broadcasts yet)
- No table rendered
- Icon (mail outline)
- Message: *"No broadcasts yet"*
- Subtext: *"Compose your first email to your respondents"*
- **"Compose a broadcast"** button — navigates to `/admin/broadcasts/new`

#### Loading state
Skeleton rows while data loads.

---

### Screen 2.6 — Broadcast Composer

**Route:** `/admin/broadcasts/new` (new) or `/admin/broadcasts/[id]/edit` (editing a draft)
**User:** Ibironke (authenticated)

#### Purpose
Where Ibironke writes, configures, and either sends, schedules, or saves a broadcast email.

#### Layout and content

The composer is a single scrollable page with clearly separated sections:

---

**Section 1 — Email content**

- **Subject line** — plain text input (required). Character count shown (e.g. *"52 / 150"*)
- **Body** — Tiptap rich text editor (required). Toolbar: bold, italic, underline, bullet list, numbered list, hyperlink, clear formatting. Placeholder: *"Write your message here…"*

---

**Section 2 — Optional elements**

Both are optional. Each has a toggle to enable/disable:

- **Logo in email header**
  - Toggle: *"Include logo at top of email"*
  - If toggled on and a logo is uploaded in settings: logo preview shown
  - If toggled on but no logo uploaded: toggle is disabled with a note — *"Upload a logo in Settings first"*

- **CTA button**
  - Toggle: *"Add a call-to-action button"*
  - If toggled on, two fields appear:
    - Button label (text input) e.g. *"Join the Community"*
    - Destination URL (URL input)

---

**Section 3 — Audience**

- Label: *"Who should receive this?"*
- Options (radio or segmented control):
  - All respondents
  - Connection at risk (12–29)
  - Connection under strain (30–46)
  - Connection is strong (47–60)
  - Select individuals
- If "Select individuals" is chosen: a searchable multi-select dropdown appears, showing respondent names and emails
- Live recipient count updates as audience changes: *"This will send to 34 people"*
- If the selected audience contains respondents with no email address: a warning appears — *"3 respondents in this audience have no email address and will be skipped"*. Ibironke can proceed.

---

**Section 4 — Send options**

Two options (radio):
- **Send now** — fires immediately after confirmation screen
- **Schedule for later** — reveals a date + time picker. Time zone label shown (e.g. *"WAT — West Africa Time"*)

---

**Action buttons (bottom of page, sticky on desktop):**

| Button | Behaviour |
|---|---|
| **Save draft** | Saves all current content to Supabase as `status = 'draft'`. Toast: *"Draft saved"*. Stays on composer page. |
| **Preview** | Opens a modal or new tab showing a rendered preview of the email as it will appear in an inbox |
| **Continue** | Validates required fields. If valid, navigates to `/admin/broadcasts/[id]/confirm`. If invalid, shows inline errors. |

#### Validation (on clicking Continue)
| Field | Condition | Message |
|---|---|---|
| Subject | Empty | *"Please enter a subject line"* |
| Body | Empty | *"Please write your message before continuing"* |
| Audience | None selected | *"Please select an audience"* |
| Schedule time | In the past | *"Scheduled time must be in the future"* |
| CTA URL | Toggle on, URL empty | *"Please enter a destination URL for your button"* |

#### Auto-save
The composer auto-saves a draft every 60 seconds silently if any content has been entered. A small *"Draft auto-saved"* indicator appears briefly near the save button.

---

### Screen 2.7 — Broadcast Send Confirmation

**Route:** `/admin/broadcasts/[id]/confirm`
**User:** Ibironke (authenticated)

#### Purpose
Final review before a broadcast is sent or scheduled. Ibironke sees exactly what is going out, to whom, and when — before she commits.

#### Layout and content
- Page heading: *"Review before sending"* or *"Review before scheduling"*

**Summary card:**
- Subject line
- Audience: e.g. *"All respondents (47 people)"*
- Send time: *"Now"* or *"Scheduled for Friday 20 June 2026 at 10:00 AM WAT"*
- Warning (if applicable): *"3 respondents have no email address and will be skipped. This will send to 44 people."*

**Email preview panel:**
- A rendered preview of the email (same output as the Preview button in composer)
- Scrollable if long

**Action buttons:**
| Button | Behaviour |
|---|---|
| **← Back to edit** | Returns to `/admin/broadcasts/[id]/edit` with all content preserved |
| **Send now** / **Schedule** | Confirms the action. Button enters loading state. On success, redirects to `/admin/broadcasts/[id]` (stats page). |

#### Error states
- If the send API call fails: inline error below the buttons — *"Something went wrong. Your broadcast was not sent. Please try again."*. Buttons return to active state. No partial sends.

---

### Screen 2.8 — Broadcast Detail / Stats

**Route:** `/admin/broadcasts/[id]`
**User:** Ibironke (authenticated)

#### Purpose
Shows the performance of a sent broadcast or the status of a scheduled one. This is where Ibironke lands after a successful send or schedule action.

#### Layout and content

**For a sent broadcast:**

- Subject line (page heading)
- Sent date and time
- Audience description
- Stats row:
  - Recipients: total number sent to
  - Delivered: count + % of recipients
  - Opened: count + % of delivered
- Email preview (collapsed by default, expandable)
- Recipient breakdown table:
  - Name, email, delivered status, opened status

**For a scheduled broadcast:**

- Subject line (page heading)
- Status badge: *Scheduled*
- Scheduled send time: *"Scheduled for Friday 20 June 2026 at 10:00 AM WAT"*
- Audience description + recipient count
- Email preview (collapsible)
- Two action buttons:
  - **Edit broadcast** — navigates to `/admin/broadcasts/[id]/edit`
  - **Cancel broadcast** — confirmation modal: *"Are you sure you want to cancel this scheduled broadcast? It will be saved as a draft."* Confirm → status changes to `draft`, redirects to `/admin/broadcasts`

**For a draft:**
- Subject line (page heading)
- Status badge: *Draft*
- **Edit broadcast** button — navigates to `/admin/broadcasts/[id]/edit`
- **Delete draft** button — confirmation modal: *"Delete this draft? This cannot be undone."* Confirm → delete, redirect to `/admin/broadcasts`

#### Empty stats state (sent broadcast with no events yet)
Stats show 0 for delivered and opened with a note: *"Delivery data usually appears within a few minutes."*

---

### Screen 2.9 — Settings

**Route:** `/admin/settings`
**User:** Ibironke (authenticated)

#### Purpose
Allows Ibironke to update the two configurable values — WhatsApp CTA link and broadcast logo — without touching code.

#### Layout and content

Single scrollable settings page with two sections:

---

**Section 1 — WhatsApp CTA link**

- Label: *"Results page CTA link"*
- Description: *"This is the link parents tap after viewing their results. Use a WhatsApp community link, group invite, or personal DM link."*
- Input: URL text field — pre-filled with current value if set
- **"Save"** button beside or below the field

On save:
- If URL is valid: updates `settings.whatsapp_cta_url` in Supabase. Toast: *"CTA link updated"*
- If URL is empty or invalid format: inline error — *"Please enter a valid URL"*

---

**Section 2 — Email logo**

- Label: *"Broadcast email logo"*
- Description: *"This logo appears at the top of broadcast emails when you choose to include it. PNG or JPG, recommended width 200px."*
- If no logo uploaded:
  - Dashed upload area with icon and text: *"Click to upload or drag and drop"*
  - File type note: *"PNG or JPG, max 2MB"*
- If logo is already uploaded:
  - Logo preview image shown
  - **"Replace logo"** button (opens file picker)
  - **"Remove logo"** button — confirmation: *"Remove your logo? It will no longer appear in broadcast emails."*

On upload:
- File validated client-side (type: PNG/JPG, size: max 2MB)
- If valid: uploaded to Supabase Storage, URL saved to `settings.logo_url`. Toast: *"Logo uploaded"*
- If invalid type: inline error — *"Please upload a PNG or JPG file"*
- If oversized: inline error — *"File must be under 2MB"*

---

## Part 3 — Transitions and Navigation Summary

### Quiz side — full journey

```
/ (Intro)
  │
  └─[localStorage session found]──────────────────────────────► /quiz (resume at last question)
  │
  └─[no session / fresh visit]
      │
      └─[click "Start the Diagnosis"]──► /quiz (Q1)
            │
            ├─[answer Q1–Q11]──► next question (auto-advance)
            ├─[click Back]──► previous question
            └─[answer Q12]──► /gate
                  │
                  ├─[submit success]──► /results
                  └─[submit failure]──► stay on /gate (inline error, retry)
```

### Admin side — full journey

```
/admin/login
  │
  └─[valid login]──► /admin (dashboard home)
        │
        ├─[sidebar: Respondents]──► /admin/respondents
        │     └─[click row]──► /admin/respondents/[id]
        │           └─[back]──► /admin/respondents
        │
        ├─[sidebar: Broadcasts]──► /admin/broadcasts
        │     │
        │     ├─[click "New broadcast"]──► /admin/broadcasts/new
        │     │     │
        │     │     ├─[save draft]──► stay on composer (toast)
        │     │     └─[click Continue]──► /admin/broadcasts/[id]/confirm
        │     │           │
        │     │           ├─[back to edit]──► /admin/broadcasts/[id]/edit
        │     │           └─[confirm send/schedule]──► /admin/broadcasts/[id] (stats)
        │     │
        │     └─[click existing broadcast row]──► /admin/broadcasts/[id]
        │           ├─[edit]──► /admin/broadcasts/[id]/edit
        │           └─[cancel scheduled]──► /admin/broadcasts (back to list)
        │
        ├─[sidebar: Settings]──► /admin/settings
        │     └─[save any setting]──► stay on settings (toast)
        │
        └─[sidebar: Log out]──► /admin/login
```

---

## Part 4 — Error and Edge Case Reference

| Scenario | Location | Behaviour |
|---|---|---|
| Parent visits `/gate` directly without completing quiz | `/gate` | Redirect to `/` |
| Parent visits `/results` directly without valid score data | `/results` | Redirect to `/` |
| API call fails on gate form submit | `/gate` | Inline error, form preserved, retry available |
| WhatsApp CTA link not set in settings | `/results` | CTA button hidden |
| Unauthenticated access to any `/admin/*` route | Any admin route | Redirect to `/admin/login` |
| Admin visits `/admin/respondents/[id]` with invalid ID | `/admin/respondents/[id]` | *"Respondent not found"* message with back link |
| Broadcast send fails on confirmation screen | `/admin/broadcasts/[id]/confirm` | Inline error, buttons re-enabled, no partial send |
| Scheduled broadcast time set in the past | Composer | Inline validation error on Continue |
| Audience contains respondents with no email | Composer + confirmation | Warning shown with count, Ibironke can proceed |
| Logo upload exceeds 2MB | Settings | Inline error, upload blocked |
| Logo upload is wrong file type | Settings | Inline error, upload blocked |
| Logo toggle enabled but no logo uploaded | Composer | Toggle disabled with explanatory note |
| Broadcast has no email events yet after sending | `/admin/broadcasts/[id]` | Stats show 0 with note: *"Data appears within a few minutes"* |
| Filter applied in respondents list returns 0 results | `/admin/respondents` | *"No respondents in this range yet"* message |
| No broadcasts exist yet | `/admin/broadcasts` | Empty state with prompt and "Compose" button |
| Dashboard loaded with zero respondents | `/admin` | All stats show 0, empty state with quiz URL + copy button |
| Parent returns to `/` after completing quiz | `/` | Redirected to `/quiz` at resume point (localStorage session still active until cleared) |
| Parent closes browser between Q12 and gate submit | `/` on return | Resumes at Q12 (answer not yet saved since they hadn't submitted gate) |

---

## Part 5 — Page and State Inventory

| # | Route | Auth required | Has empty state | Has error state | Has loading state |
|---|---|---|---|---|---|
| 1 | `/` | No | No | No | No |
| 2 | `/quiz` | No | No | No | No |
| 3 | `/gate` | No | No | Yes (API failure) | Yes (submit loading) |
| 4 | `/results` | No | No | No | No |
| 5 | `/admin/login` | No | No | Yes (bad credentials) | Yes (submit loading) |
| 6 | `/admin` | Yes | Yes | No | Yes |
| 7 | `/admin/respondents` | Yes | Yes | No | Yes |
| 8 | `/admin/respondents/[id]` | Yes | No | Yes (not found) | Yes |
| 9 | `/admin/broadcasts` | Yes | Yes | No | Yes |
| 10 | `/admin/broadcasts/new` | Yes | No | Yes (validation) | Yes (auto-save) |
| 11 | `/admin/broadcasts/[id]/edit` | Yes | No | Yes (validation) | Yes |
| 12 | `/admin/broadcasts/[id]/confirm` | Yes | No | Yes (send failure) | Yes (send loading) |
| 13 | `/admin/broadcasts/[id]` | Yes | No | No | Yes |
| 14 | `/admin/settings` | Yes | No | Yes (validation) | No |
