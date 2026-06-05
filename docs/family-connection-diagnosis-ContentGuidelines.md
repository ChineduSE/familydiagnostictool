# Content Guidelines Document
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™
**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Version:** 1.0
**Date:** June 2026
**Companion documents:** PRD v1.0 · AppFlow v1.0 · TechStack v1.0

---

## Purpose of this document

This document is the single source of truth for every word that appears in the Family Connection Diagnosis™ application. It exists for one primary audience: **Claude Code**, so that when building any screen, component, or state, it uses the exact copy defined here — no paraphrasing, no rewriting, no improvising.

### Rules for Claude Code

1. **Do not rewrite any copy in this document.** Every word is intentional. Ibironke's voice is specific — warm, direct, honest, and non-clinical. It must not be flattened into generic UI language.
2. **Do not summarise or shorten results page or email copy.** These are complete, authoritative texts. Truncating them changes their meaning.
3. **Use the exact string defined in each microcopy table.** If a button says *"Start the Diagnosis"* it does not say *"Begin"*, *"Get Started"*, or *"Take the Quiz"*.
4. **Dynamic variables are marked in `[BRACKETS]`.** Replace them with the correct template variable for the relevant context (React prop, template string, etc.).
5. **When in doubt, do not invent.** Flag the gap rather than fill it with placeholder copy.

---

## Brand voice reference (do not change)

These principles describe the tone of all existing copy. They are not rules to interpret — they are observations to preserve.

| Principle | What it means in practice |
|---|---|
| **Direct without being harsh** | Ibironke tells parents the truth about their score immediately. She does not soften or hedge. But she pairs honesty with warmth. |
| **Personal, not clinical** | Copy uses "you" and "your child" constantly. It never speaks about parents in the third person or uses clinical parenting jargon. |
| **Urgent but not alarming** | Even the lowest score range ("Connection at risk") is framed as fixable and time-sensitive — not catastrophic. |
| **Affirming even in critique** | Every score range acknowledges something the parent is doing right before identifying where to improve. |
| **Short sentences. Real punctuation.** | Em dashes (—), arrows (→), and paragraph breaks are used deliberately. Preserve them exactly. |

---

## Part 1 — Quiz content (hardcoded)

All quiz content is fixed. It must never be changed, paraphrased, or reordered without Ibironke's explicit approval.

### 1.1 Scale labels

Used on every question screen, displayed as five buttons in order.

| Value | Label |
|---|---|
| 1 | Never |
| 2 | Rarely |
| 3 | Sometimes |
| 4 | Often |
| 5 | Always |

### 1.2 The 12 questions

Each question has an ID, a section label, and question text. All three must be stored and rendered exactly as defined below.

---

**Section A: Communication patterns**

| ID | Section label | Question text |
|---|---|---|
| Q1 | Communication patterns | When your child comes to you upset or frustrated, do you stop what you're doing to listen — without immediately offering advice or solutions? |
| Q2 | Communication patterns | In a typical week, how often do you and your child have a real conversation — not about schedules, homework, or chores, but about how they're actually feeling? |

---

**Section B: Emotional availability**

| ID | Section label | Question text |
|---|---|---|
| Q3 | Emotional availability | When your child is having a hard day, can they show you they're struggling — without worrying about your reaction or being told to "toughen up"? |
| Q4 | Emotional availability | After a difficult moment between you and your child — an argument, a punishment, a misunderstanding — do you find a way to reconnect before the day ends? |

---

**Section C: Device habits**

| ID | Section label | Question text |
|---|---|---|
| Q5 | Device habits | During family meals or dedicated family time, are screens — yours and your child's — put away without negotiation? |
| Q6 | Device habits | When your child reaches for a screen, do they usually do so because they're genuinely bored or seeking entertainment — rather than avoiding you or an uncomfortable feeling? |

---

**Section D: Family routines**

| ID | Section label | Question text |
|---|---|---|
| Q7 | Family routines | Does your family have at least one shared routine each day — a meal, a bedtime ritual, a morning check-in — that feels like genuine togetherness rather than just logistics? |
| Q8 | Family routines | When life gets busy or stressful, does your family maintain the habits and rituals that keep you close — or do they quietly disappear? |

---

**Section E: Parent-child bonding**

| ID | Section label | Question text |
|---|---|---|
| Q9 | Parent-child bonding | Does your child seek you out — not because they need something, but simply because they want to be near you or share something with you? |
| Q10 | Parent-child bonding | Do you and your child share at least one activity — a hobby, a show, a walk, a joke — that belongs just to the two of you? |

---

**Section F: Behavior triggers**

| ID | Section label | Question text |
|---|---|---|
| Q11 | Behavior triggers | When your child acts out, pushes back, or shuts down, do you find yourself able to pause and ask "what's behind this?" before reacting? |
| Q12 | Behavior triggers | After setting a boundary or consequence, does your child understand why — and do they still feel loved by you? |

---

### 1.3 Scoring ranges

| Score | Range key | Range label (display) |
|---|---|---|
| 12–29 | `at_risk` | Connection at risk |
| 30–46 | `under_strain` | Connection under strain |
| 47–60 | `strong` | Connection is strong |

> The range labels are used as display text throughout the app — on the results page, in the admin respondents table, as filter labels, and in broadcast audience selectors. Always use the exact label strings above.

---

## Part 2 — Results page copy (hardcoded)

Each of the three results page variants uses the copy below verbatim. `[First name]` is a dynamic variable replaced with the parent's submitted first name. `[SCORE]` is replaced with their calculated total score (integer).

---

### Range: Connection at risk (12–29)

```
[First name], this score needs your attention now. And the fact that you're here, reading this, tells me you already sense that something important is slipping.

What your score tells us is that the distance between you and your child has been growing for a while — quietly, in the everyday moments. You may have noticed your child pulling away, conversations staying surface-level, or discipline that doesn't seem to stick no matter what you try.

That's not a parenting failure. That's a connection gap — and connection gaps can be closed.

But children don't wait for us to be ready. They grow, they pull away, and the window quietly narrows. The time to act is today, not someday.

Your three biggest areas to focus on right now:
→ Creating one consistent daily ritual that belongs just to the two of you
→ Responding to behavior with curiosity before consequence
→ Making space for your child's emotions without rushing to fix them

The next step is a 1-on-1 Family Connection Session with Ibironke, where we look closely at your specific score, identify the two or three changes that will make the biggest difference in your home, and build a practical reconnection plan together — starting now.

[CTA BUTTON]

You showed up for this diagnosis. That already tells me something important about the kind of parent you are. Don't let that courage go to waste.
```

---

### Range: Connection under strain (30–46)

```
Your Family Connection Score: [SCORE]/60
Connection under strain

[First name], you have real strengths here — and this score shows them.

But this is not the moment to exhale.

You're showing up in some important ways. What your score also tells us is that in certain areas, the connection is quietly under pressure. The strongest connections don't break all at once — they erode slowly, in the small moments that keep getting pushed aside. If those areas aren't addressed, they tend to compound over time.

The good news: you're not starting from zero. You have something worth protecting here, and right now you're close enough to turn this around with the right support. You're making targeted adjustments to something that already has a foundation — and that matters.

Your three areas to strengthen:
→ Protecting your shared routines when life gets busy — these are your connection anchors
→ Reducing screen displacement during the moments that matter most
→ Rebuilding the habit of reconnecting after difficult moments

Many parents in this score range find that two or three small, consistent changes shift the entire dynamic at home within weeks — before the distance becomes the new normal.

If you'd like a personalised look at exactly where to focus, a Family Connection Session with Ibironke will pinpoint exactly where the distance is growing and map out your next steps clearly.

[CTA BUTTON]

You're closer than you think — close enough that the right moves now make all the difference.
```

---

### Range: Connection is strong (47–60)

```
[First name], this is genuinely worth acknowledging.

A score in this range tells us that you've built something real at home — warmth, trust, and routines that hold. Your child knows you're there. That doesn't happen by accident.

What your score also shows us is that even the strongest connections need a community around them to stay that way. Consistency is easy when life is calm — it's the busy seasons, the hard days, and the unexpected transitions that test what you've built.

As your child grows and their needs shift, staying intentional becomes the work.

Your focus areas going forward:
→ Staying curious as your child enters new developmental stages
→ Protecting the rituals that have been holding your connection together
→ Staying ahead of screen habits before they become the default

Parents with strong scores often find the most value in surrounding themselves with others who are equally committed. Because staying consistent alone is harder than it looks — and accountability is what separates families who thrive long-term from those who wonder what quietly changed.

[CTA BUTTON]

Well done for doing this. Your family feels the difference — even when they don't say it.
```

---

## Part 3 — Instant results email copy (hardcoded)

Three email templates — one per score range. All are sent automatically on quiz submission. `[First name]` and `[SCORE]` are dynamic variables. `[CTA BUTTON]` is the email CTA button rendered with the WhatsApp link from settings.

The subject line is the same across all three ranges.

**Subject line (all ranges):**
```
Your Family Connection results, [First name]
```

---

### Email body: Connection at risk (12–29)

```
Hi [First name],

Thank you for taking the Family Connection Diagnosis™. I know it takes honesty to sit with those questions — and I want you to know that I don't take that lightly.

Your score of [SCORE]/60 places you in the Connection at Risk range.

I want to be straightforward with you: this score isn't about blame. It's about timing. The patterns that create distance between parents and children rarely happen because of one big moment — they build slowly, in the small decisions we make every day without realising their weight.

The encouraging truth is this: connection can be rebuilt. I've seen it happen in families where the gap felt enormous. It starts with understanding exactly where and why the distance formed — and then making a small number of deliberate changes.

Based on your responses, the areas I'd focus on first are:
→ Communication — creating the conditions where your child feels safe to come to you
→ Behavior — learning to read what difficult behavior is actually communicating
→ Emotional availability — making your presence felt, not just your presence known

I'd love to help you map this out personally. A 1-on-1 Family Connection Session gives us the space to go deeper into your specific results, understand your family's unique dynamic, and build a reconnection plan that fits your real life — not a generic checklist.

[CTA BUTTON]

I'm glad you're here, [First name]. This is the right direction.

Warmly,
Ibironke
```

---

### Email body: Connection under strain (30–46)

```
Hi [First name],

Your Family Connection Score is in — and I want to give you the full picture.

Your score of [SCORE]/60 places you in the Connection Under Strain range.

This is actually one of the most important scores to pay attention to — not because it signals crisis, but because it signals a window.

You have real strengths in your home. And you also have areas where, without some intentional attention, the distance will quietly widen.

Based on your responses, here's what I'm noticing: The areas where you're doing well are holding your family together. The areas under strain tend to be the ones that get deprioritised when life gets full — the routines, the repair moments after conflict, the device-free time that feels hard to protect.

These are fixable. Not with a complete overhaul, but with two or three consistent shifts.

If you'd like to know exactly what those shifts are for your family specifically, a Family Connection Session with me is the clearest next step.

[CTA BUTTON]

You're not far from where you want to be. Let's close the gap together.

Warmly,
Ibironke
```

---

### Email body: Connection is strong (47–60)

```
Hi [First name],

Your results are in — and they're worth celebrating.

Your Family Connection Score of [SCORE]/60 places you in the Connection is Strong range.

This tells me that you've been doing something right, consistently. The warmth, the routines, the willingness to show up even when it's hard — your child is experiencing that, even on the days it doesn't feel like enough.

I also want to be honest with you: a strong score today doesn't mean the work is done. Family connection is a living, moving thing. As children grow, their needs shift — and the habits that worked beautifully at one stage can quietly stop working at the next.

The parents I worry least about are the ones who are curious and proactive. The fact that you took this diagnosis tells me you're one of them.

If you'd like to understand your score in more depth — including the subtle areas to keep an eye on as your child moves through their next developmental stage — a Family Connection Session is a great investment in staying ahead.

[CTA BUTTON]

Thank you for taking this seriously, [First name]. Your family is fortunate to have you.

Warmly,
Ibironke
```

---

## Part 4 — UI microcopy (all fixed strings)

Every string that appears in the application UI is defined here. Claude Code must use these exact strings. Nothing should be invented or substituted.

---

### 4.1 Intro screen

| Element | String |
|---|---|
| Headline | `Discover the State of Your Family Connection` |
| Subheadline | `Answer 12 honest questions and get a personalised diagnosis of your parent-child relationship — with clear guidance on your next steps.` |
| Time estimate | `Takes about 5 minutes` |
| CTA button | `Start the Diagnosis` |

---

### 4.2 Quiz screen

| Element | String |
|---|---|
| Progress label | `Question [N] of 12` |
| Back button | `← Back` |

> `[N]` is replaced with the current question number (1–12).

---

### 4.3 Gate screen (lead capture)

| Element | String |
|---|---|
| Headline | `Your results are ready` |
| Subheadline | `Enter your details below to see your Family Connection Score` |
| First name label | `First name` |
| First name placeholder | `Enter your first name` |
| Email label | `Email address` |
| Email placeholder | `Enter your email address` |
| Phone label | `Phone number` |
| Phone placeholder | `Enter your phone number (optional)` |
| Phone helper text | `Optional` |
| Submit button (default) | `See My Results` |
| Submit button (loading) | `Getting your results…` |
| Privacy note | `Your information is safe. We do not share your details.` |

**Validation error messages:**

| Field | Condition | Error message |
|---|---|---|
| First name | Empty on submit | `Please enter your first name` |
| Email | Empty on submit | `Please enter your email address` |
| Email | Invalid format | `Please enter a valid email address` |

**API error message (shown below submit button):**

```
Something went wrong. Please try again.
```

---

### 4.4 Results page

| Element | String |
|---|---|
| Score display format | `[SCORE] / 60` |
| CTA button label | `Join the Community` |

> CTA button label may be updated by Ibironke. The default above is used when no override has been set. The destination URL is pulled from `settings.whatsapp_cta_url`.

**Score range badge labels** (same as scoring reference in Part 1):

| Range key | Badge text |
|---|---|
| `at_risk` | `Connection at risk` |
| `under_strain` | `Connection under strain` |
| `strong` | `Connection is strong` |

---

### 4.5 Admin login

| Element | String |
|---|---|
| Page title | `Family Connection Diagnosis — Admin` |
| Email label | `Email address` |
| Password label | `Password` |
| Password show toggle | `Show` / `Hide` |
| Submit button | `Log in` |
| Invalid credentials error | `Incorrect email or password` |
| Empty email error | `Please enter your email` |
| Empty password error | `Please enter your password` |
| Network error | `Something went wrong. Please try again.` |

---

### 4.6 Admin dashboard home

| Element | String |
|---|---|
| Page heading | `Dashboard` |
| Stat card: total | `Total respondents` |
| Stat card: at risk | `Connection at risk` |
| Stat card: under strain | `Connection under strain` |
| Stat card: strong | `Connection is strong` |
| Recent respondents heading | `Recent respondents` |
| View all link | `View all respondents →` |
| Scheduled broadcasts label | `You have [N] broadcast[s] scheduled` |
| Drafts label | `You have [N] draft[s] in progress` |
| No broadcasts prompt | `No broadcasts scheduled — compose one` |

**Empty state (no respondents yet):**

| Element | String |
|---|---|
| Heading | `No one has taken the quiz yet` |
| Subtext | `Share your quiz link to get started:` |
| Quiz URL display | `quiz.ibironkeosemowo.com` |
| Copy button | `Copy link` |
| Copy button (after copy) | `Copied!` |

---

### 4.7 Admin respondents list

| Element | String |
|---|---|
| Page heading | `Respondents` |
| Filter label | `Filter by range` |
| Filter options | `All` / `Connection at risk` / `Connection under strain` / `Connection is strong` |
| Sort label | `Sort by` |
| Sort options | `Date submitted (newest)` / `Date submitted (oldest)` / `Score (high to low)` / `Score (low to high)` |
| Results count | `Showing [N] respondent[s]` |
| Phone not provided | `—` |
| Email status: delivered | `Delivered` |
| Email status: opened | `Opened` |
| Email status: none | `—` |

**Empty state (no respondents):**

| Element | String |
|---|---|
| Heading | `No respondents yet` |
| Subtext | `Share your quiz link to start collecting results:` |
| Quiz URL | `quiz.ibironkeosemowo.com` |
| Copy button | `Copy link` |

**Empty state (filter returns no results):**

| Element | String |
|---|---|
| Message | `No respondents in this range yet` |

---

### 4.8 Respondent detail page

| Element | String |
|---|---|
| Back link | `← Back to respondents` |
| Phone not provided | `Not provided` |
| Answers section heading | `Diagnostic answers` |
| Email history heading | `Email activity` |
| No email history | `No email activity recorded yet` |
| Not found message | `Respondent not found` |
| Not found back link | `← Back to respondents` |

---

### 4.9 Broadcast list

| Element | String |
|---|---|
| Page heading | `Broadcasts` |
| New broadcast button | `New broadcast` |
| Status: draft | `Draft` |
| Status: scheduled | `Scheduled` |
| Status: sent | `Sent` |
| Open rate (not yet sent) | `—` |

**Empty state (no broadcasts):**

| Element | String |
|---|---|
| Heading | `No broadcasts yet` |
| Subtext | `Compose your first email to your respondents` |
| CTA button | `Compose a broadcast` |

---

### 4.10 Broadcast composer

| Element | String |
|---|---|
| Page heading (new) | `New broadcast` |
| Page heading (editing draft) | `Edit broadcast` |
| Subject label | `Subject line` |
| Subject placeholder | `Enter your subject line` |
| Subject character count | `[N] / 150` |
| Body label | `Message` |
| Body placeholder | `Write your message here…` |
| Logo section label | `Logo in email header` |
| Logo toggle label | `Include logo at top of email` |
| Logo not uploaded note | `Upload a logo in Settings first` |
| CTA section label | `Call-to-action button` |
| CTA toggle label | `Add a call-to-action button` |
| CTA button label field | `Button label` |
| CTA button label placeholder | `e.g. Join the Community` |
| CTA URL field | `Destination URL` |
| CTA URL placeholder | `https://` |
| Audience section label | `Who should receive this?` |
| Audience: all | `All respondents` |
| Audience: at risk | `Connection at risk (12–29)` |
| Audience: under strain | `Connection under strain (30–46)` |
| Audience: strong | `Connection is strong (47–60)` |
| Audience: individuals | `Select individuals` |
| Individuals search placeholder | `Search by name or email` |
| Recipient count | `This will send to [N] people` |
| Missing email warning | `[N] respondent[s] in this audience have no email address and will be skipped` |
| Send options label | `When should this go out?` |
| Send now option | `Send now` |
| Schedule option | `Schedule for later` |
| Time zone label | `WAT — West Africa Time` |
| Save draft button | `Save draft` |
| Preview button | `Preview` |
| Continue button | `Continue` |
| Auto-save indicator | `Draft auto-saved` |

**Validation error messages:**

| Field | Condition | Error message |
|---|---|---|
| Subject | Empty | `Please enter a subject line` |
| Body | Empty | `Please write your message before continuing` |
| Audience | None selected | `Please select an audience` |
| Schedule time | In the past | `Scheduled time must be in the future` |
| CTA URL | Toggle on, URL empty | `Please enter a destination URL for your button` |

---

### 4.11 Broadcast send confirmation

| Element | String |
|---|---|
| Page heading (send now) | `Review before sending` |
| Page heading (scheduled) | `Review before scheduling` |
| Audience label | `Sending to` |
| Send time label (now) | `Send time` |
| Send time value (now) | `Now` |
| Send time value (scheduled) | `Scheduled for [DATE] at [TIME] WAT` |
| Skipped warning | `[N] respondent[s] have no email address and will be skipped. This will send to [N] people.` |
| Back button | `← Back to edit` |
| Confirm button (send now) | `Send now` |
| Confirm button (scheduled) | `Schedule` |
| Confirm button (loading) | `Sending…` / `Scheduling…` |
| Send failure error | `Something went wrong. Your broadcast was not sent. Please try again.` |

---

### 4.12 Broadcast detail / stats page

| Element | String |
|---|---|
| Stats label: recipients | `Recipients` |
| Stats label: delivered | `Delivered` |
| Stats label: opened | `Opened` |
| Stats label: open rate | `Open rate` |
| Delivery data pending note | `Delivery data usually appears within a few minutes.` |
| Edit button | `Edit broadcast` |
| Cancel scheduled button | `Cancel broadcast` |
| Cancel confirmation heading | `Cancel this broadcast?` |
| Cancel confirmation body | `This scheduled broadcast will be saved as a draft. It will not be sent.` |
| Cancel confirmation confirm | `Yes, cancel it` |
| Cancel confirmation dismiss | `Keep it scheduled` |
| Delete draft button | `Delete draft` |
| Delete confirmation heading | `Delete this draft?` |
| Delete confirmation body | `This cannot be undone.` |
| Delete confirmation confirm | `Yes, delete it` |
| Delete confirmation dismiss | `Keep draft` |

---

### 4.13 Settings page

| Element | String |
|---|---|
| Page heading | `Settings` |
| CTA link section heading | `Results page CTA link` |
| CTA link description | `This is the link parents tap after viewing their results. Use a WhatsApp community link, group invite, or personal DM link.` |
| CTA link placeholder | `https://` |
| CTA link save button | `Save` |
| CTA link invalid error | `Please enter a valid URL` |
| Logo section heading | `Broadcast email logo` |
| Logo description | `This logo appears at the top of broadcast emails when you choose to include it. PNG or JPG, recommended width 200px.` |
| Upload area text | `Click to upload or drag and drop` |
| Upload file note | `PNG or JPG, max 2MB` |
| Replace logo button | `Replace logo` |
| Remove logo button | `Remove logo` |
| Remove logo confirmation | `Remove your logo? It will no longer appear in broadcast emails.` |
| Remove confirm button | `Yes, remove it` |
| Remove dismiss button | `Keep logo` |
| Invalid file type error | `Please upload a PNG or JPG file` |
| File too large error | `File must be under 2MB` |

---

### 4.14 Global toast notifications

All toasts appear at the top-right of the screen and auto-dismiss after 4 seconds.

| Action | Toast message |
|---|---|
| Draft saved (manual) | `Draft saved` |
| Draft auto-saved | `Draft auto-saved` |
| Broadcast sent | `Broadcast sent successfully` |
| Broadcast scheduled | `Broadcast scheduled` |
| Broadcast cancelled | `Broadcast cancelled and saved as draft` |
| Draft deleted | `Draft deleted` |
| CTA link saved | `CTA link updated` |
| Logo uploaded | `Logo uploaded` |
| Logo removed | `Logo removed` |

---

### 4.15 Global navigation (admin sidebar)

| Element | String |
|---|---|
| Nav item 1 | `Dashboard` |
| Nav item 2 | `Respondents` |
| Nav item 3 | `Broadcasts` |
| Nav item 4 | `Settings` |
| Logged-in label | Displays her email address |
| Log out link | `Log out` |

---

## Part 5 — Dynamic variable reference

Every variable used across the application is defined here with its source and type.

| Variable | Display format | Source | Example |
|---|---|---|---|
| `[First name]` | As submitted | Gate form — `firstName` field | `Sarah` |
| `[SCORE]` | Integer | Calculated client-side (sum of 12 answers) | `38` |
| `[SCORE]/60` | `[SCORE] / 60` | Calculated + fixed denominator | `38 / 60` |
| `[N]` (question) | Integer 1–12 | Quiz state — current question index + 1 | `Question 3 of 12` |
| `[N]` (count) | Integer | Supabase query result | `47 respondents` |
| `[DATE]` | `D MMMM YYYY` via date-fns | `scheduled_at` from Supabase | `20 June 2026` |
| `[TIME]` | `h:mm A` via date-fns | `scheduled_at` from Supabase | `10:00 AM` |
| `[CTA BUTTON]` | Rendered button component | `settings.whatsapp_cta_url` | WhatsApp link |

---

## Part 6 — What must never be changed without Ibironke's approval

The following content is protected. Claude Code must not alter it under any circumstances, including for brevity, clarity, tone matching, or to fit a layout:

- All 12 question texts
- All three results page copy blocks
- All three email body copy blocks
- The subject line for results emails
- The scale labels (Never, Rarely, Sometimes, Often, Always)
- The range labels (Connection at risk / Connection under strain / Connection is strong)
- The three-bullet focus areas in each results copy block (the `→` lines)
- The sign-off (`Warmly, Ibironke`) in all email bodies

If a layout constraint makes a full copy block difficult to render, the solution is to fix the layout — not shorten the copy.

---

## Part 7 — Typography & Visual Design

This section defines every typographic and visual design decision for the application. Claude Code must implement these values using the Tailwind tokens defined in `tailwind.config.ts`. Raw CSS values are included as reference — but all implementation should use Tailwind classes and the `cn()` utility.

> **Font verification note:** ibironkeosemowo.com is a v0.app/Next.js build — the font is embedded in a JS bundle and not readable from outside. The font pairing below is based on close visual inspection of the site and is the recommended match. Before going live, open the site in Chrome DevTools → Elements → Computed → `font-family` on any heading and body text to confirm the exact font names, then update `tailwind.config.ts` accordingly if different.

---

### 7.1 Fonts

Based on visual inspection of ibironkeosemowo.com, the site uses a **serif display font for headings** and a **clean sans-serif for body text** — a classic, warm, professional pairing. The recommended match is:

| Role | Font | Source | Tailwind token |
|---|---|---|---|
| Headings (H1–H3) | `Playfair Display` | Google Fonts | `font-display` |
| Body, UI, labels | `Inter` | Google Fonts | `font-sans` |

Both are free, available via `next/font/google`, and render beautifully at all weights on both light and dark backgrounds.

#### Next.js font setup (`src/app/layout.tsx`)

```tsx
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

#### Tailwind font config (`tailwind.config.ts`)

```ts
fontFamily: {
  display: ['var(--font-display)', 'Georgia', 'serif'],
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
},
```

---

### 7.2 Type scale

All font sizes, weights, and line heights are defined here. Use only these values. Do not introduce custom sizes outside this scale.

| Token | Tailwind class | Size | Weight | Line height | Usage |
|---|---|---|---|---|---|
| Display XL | `text-5xl font-display font-700` | 48px | 700 | 1.15 | Intro screen headline only |
| Display L | `text-4xl font-display font-600` | 36px | 600 | 1.2 | Results page score, section headings |
| Display M | `text-3xl font-display font-600` | 30px | 600 | 1.25 | Results page range label |
| Heading L | `text-2xl font-display font-500` | 24px | 500 | 1.3 | Page headings (admin), email headings |
| Heading M | `text-xl font-sans font-600` | 20px | 600 | 1.4 | Section labels, card headings |
| Heading S | `text-lg font-sans font-600` | 18px | 600 | 1.4 | Table column headers, form section labels |
| Body L | `text-base font-sans font-400` | 16px | 400 | 1.6 | Results copy, email body, gate intro |
| Body M | `text-sm font-sans font-400` | 14px | 400 | 1.5 | Table rows, form labels, secondary content |
| Body S | `text-xs font-sans font-400` | 12px | 400 | 1.4 | Helper text, character counts, privacy note |
| Label | `text-sm font-sans font-500` | 14px | 500 | 1.4 | Form labels, stat card labels |
| Button | `text-sm font-sans font-600` | 14px | 600 | 1 | All button text |
| Badge | `text-xs font-sans font-600` | 12px | 600 | 1 | Score range badges, status badges |
| Question | `text-xl font-sans font-400` | 20px | 400 | 1.5 | Quiz question text |
| Section label | `text-xs font-sans font-600 uppercase tracking-widest` | 12px | 600 | 1 | Quiz section label above question |

---

### 7.3 Colour system

Colours are defined as Tailwind tokens in `tailwind.config.ts`. Claude Code must always use these tokens — never raw hex values in components.

#### Palette

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| `brand.black` | `bg-brand-black` / `text-brand-black` | `#1A1A1A` | Primary backgrounds (quiz, results, admin sidebar) |
| `brand.gold` | `bg-brand-gold` / `text-brand-gold` | `#F0C040` | CTA buttons, active nav state, score accent, badge borders |
| `brand.white` | `bg-brand-white` / `text-brand-white` | `#FFFFFF` | Cards, modals, form surfaces, body text on dark backgrounds |
| `brand.offwhite` | `bg-brand-offwhite` / `text-brand-offwhite` | `#F5F0E8` | Page backgrounds (quiz, gate, results, admin main area) |

#### Semantic colour usage

| Context | Background | Text | Border / accent |
|---|---|---|---|
| Quiz question screen | `brand.black` | `brand.white` | Answer buttons: `brand.gold` border on hover/selected |
| Intro screen | `brand.black` | `brand.white` | CTA button: `brand.gold` fill |
| Gate screen | `brand.offwhite` | `brand.black` | Input focus: `brand.gold` ring |
| Results page — at risk | `brand.black` | `brand.white` | CTA button: `brand.gold` |
| Results page — under strain | `brand.offwhite` | `brand.black` | CTA button: `brand.gold` |
| Results page — strong | `brand.offwhite` | `brand.black` | CTA button: `brand.gold` |
| Admin sidebar | `brand.black` | `brand.white` | Active item: `brand.gold` left border |
| Admin main area | `brand.offwhite` | `brand.black` | Cards: `brand.white` background |
| Admin table rows | `brand.white` | `brand.black` | Row hover: light grey tint `#F0EDEA` |

#### Score range badge colours

| Range | Badge background | Badge text |
|---|---|---|
| Connection at risk | `#FEE2E2` (red-100) | `#991B1B` (red-800) |
| Connection under strain | `#FEF3C7` (amber-100) | `#92400E` (amber-800) |
| Connection is strong | `#DCFCE7` (green-100) | `#166534` (green-800) |

#### Broadcast status badge colours

| Status | Badge background | Badge text |
|---|---|---|
| Draft | `#F3F4F6` (grey-100) | `#374151` (grey-700) |
| Scheduled | `#FEF3C7` (amber-100) | `#92400E` (amber-800) |
| Sent | `#DCFCE7` (green-100) | `#166534` (green-800) |

---

### 7.4 Spacing system

Use Tailwind's default spacing scale. The base unit is 4px (`spacing-1`). All layout spacing must use these increments — no arbitrary values.

| Usage | Tailwind | px |
|---|---|---|
| Gap between label and input | `gap-1.5` | 6px |
| Padding inside form inputs | `px-3 py-2.5` | 12px / 10px |
| Padding inside buttons | `px-5 py-2.5` | 20px / 10px |
| Gap between form fields | `gap-4` | 16px |
| Card internal padding | `p-6` | 24px |
| Section vertical spacing | `my-8` | 32px |
| Page horizontal padding (mobile) | `px-4` | 16px |
| Page horizontal padding (desktop) | `px-8` | 32px |
| Admin sidebar width | `w-64` | 256px |
| Max content width (quiz, gate, results) | `max-w-xl` | 576px |
| Max content width (admin pages) | `max-w-6xl` | 1152px |

---

### 7.5 Border radius

| Element | Tailwind | px |
|---|---|---|
| Buttons | `rounded-full` | Fully rounded (pill) |
| Input fields | `rounded-md` | 6px |
| Cards | `rounded-xl` | 12px |
| Modals | `rounded-2xl` | 16px |
| Badges | `rounded-full` | Fully rounded |
| Progress bar track | `rounded-full` | Fully rounded |
| Progress bar fill | `rounded-full` | Fully rounded |
| Toasts | `rounded-lg` | 8px |

---

### 7.6 Shadows

Used sparingly. Only on cards and modals.

| Element | Tailwind | Usage |
|---|---|---|
| Cards (admin) | `shadow-sm` | Subtle lift on white cards against off-white background |
| Modals | `shadow-xl` | Elevated modal over dimmed overlay |
| Toasts | `shadow-lg` | Lifted notification |
| Buttons | No shadow | Flat — brand colour does the work |
| Input focus | `ring-2 ring-brand-gold ring-offset-0` | Focus ring, no shadow |

---

### 7.7 Interactive states

Every interactive element must implement all states below. No element should be stateless.

#### Buttons — primary (gold fill)

| State | Classes |
|---|---|
| Default | `bg-brand-gold text-brand-black font-600 rounded-full` |
| Hover | `hover:bg-yellow-400` (slightly brighter) |
| Active / pressed | `active:scale-95` |
| Focus | `focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed` |
| Loading | Replace label text with loading string. Disable button. Do not use a spinner on primary CTA buttons — loading copy is sufficient. |

#### Buttons — secondary (outline)

| State | Classes |
|---|---|
| Default | `border border-brand-black text-brand-black bg-transparent rounded-full` |
| Hover | `hover:bg-brand-black hover:text-brand-white` |
| Active | `active:scale-95` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed` |

#### Buttons — destructive (delete, remove)

| State | Classes |
|---|---|
| Default | `border border-red-300 text-red-700 bg-transparent rounded-full` |
| Hover | `hover:bg-red-50` |

#### Input fields

| State | Classes |
|---|---|
| Default | `border border-gray-300 bg-white rounded-md text-brand-black` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent` |
| Error | `border-red-500 focus:ring-red-500` |
| Disabled | `bg-gray-100 text-gray-400 cursor-not-allowed` |

#### Quiz answer buttons (1–5 scale)

| State | Classes |
|---|---|
| Default | `border border-white/30 text-white bg-transparent rounded-lg` |
| Hover | `hover:border-brand-gold hover:text-brand-gold` |
| Selected | `border-brand-gold text-brand-black bg-brand-gold` |

#### Admin table rows

| State | Classes |
|---|---|
| Default | `bg-white border-b border-gray-100` |
| Hover | `hover:bg-gray-50 cursor-pointer` |

---

### 7.8 Progress bar (quiz)

| Element | Classes |
|---|---|
| Track | `w-full h-1.5 bg-white/20 rounded-full` |
| Fill | `h-1.5 bg-brand-gold rounded-full transition-all duration-300` |
| Width | Calculated as `(currentQuestion / 12) * 100` percent |
| Label | `text-xs font-sans font-400 text-white/60` — `Question [N] of 12` |

---

### 7.9 Responsive breakpoints

Use Tailwind's default breakpoints. The application must be fully functional on mobile.

| Breakpoint | Tailwind prefix | Width |
|---|---|---|
| Mobile (default) | none | 0–639px |
| Tablet | `sm:` | 640px+ |
| Desktop | `lg:` | 1024px+ |

#### Key responsive behaviours

| Element | Mobile | Desktop |
|---|---|---|
| Quiz question screen | Full screen, vertically centred | Centred card, max-w-xl, with padding |
| Gate form | Full width with px-4 padding | Centred card, max-w-md |
| Results page | Full screen scroll | Centred card, max-w-xl |
| Admin sidebar | Hidden, opens as full-height drawer on hamburger tap | Always visible, w-64, fixed left |
| Admin main area | Full width | `ml-64` to account for fixed sidebar |
| Admin tables | Horizontal scroll on overflow | Full width |
| Broadcast composer | Single column | Single column, max-w-3xl |

---

### 7.10 Animation and transitions

Keep animations minimal and purposeful. This is a professional, trust-building product — not a flashy interface.

| Element | Transition | Duration |
|---|---|---|
| Quiz question advance | Fade out → fade in (or slide left) | 250ms |
| Quiz question back | Fade out → fade in (or slide right) | 250ms |
| Progress bar fill | `transition-all` | 300ms |
| Button hover/active | `transition-colors` | 150ms |
| Button active scale | `transition-transform` | 100ms |
| Admin sidebar (mobile) | Slide in from left | 200ms |
| Toast appear | Fade in + slide down from top | 200ms |
| Toast dismiss | Fade out | 150ms |
| Modal appear | Fade in + scale from 95% to 100% | 200ms |
| Table row hover | `transition-colors` | 100ms |

Do not use bounce, spring, or decorative animations anywhere in the application.

---

### 7.11 Email template visual design

The branded HTML email templates (built with React Email) must follow these visual rules:

| Element | Value |
|---|---|
| Email max width | 600px |
| Background | `#F5F0E8` (brand off-white) |
| Email body container background | `#FFFFFF` |
| Email body padding | 40px horizontal, 48px vertical |
| Header background (if logo shown) | `#1A1A1A` (brand black) |
| Header padding | 24px |
| Logo max height in header | 48px |
| Body font | Inter or system sans-serif fallback |
| Body font size | 16px |
| Body line height | 1.6 |
| Body text colour | `#1A1A1A` |
| Heading colour | `#1A1A1A` |
| CTA button background | `#F0C040` (brand gold) |
| CTA button text colour | `#1A1A1A` |
| CTA button padding | 14px vertical, 28px horizontal |
| CTA button border radius | 999px (pill) |
| CTA button font weight | 600 |
| Footer text | `text-align: center`, 12px, `#888888` |
| Footer content | `© 2025 Ibironke O. Semowo · ibironkeosemowo.com` |
| Arrow bullets (`→`) | Rendered as plain text characters — not icons or images |
