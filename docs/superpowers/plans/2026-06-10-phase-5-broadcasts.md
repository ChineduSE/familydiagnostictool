# Phase 5 — Broadcasts (Drafts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working broadcast composer and draft manager at `/admin/broadcasts` so Ibironke can write a formatted email, pick an audience, see recipient counts, preview, and save it as a draft.

**Architecture:** Client components using the Supabase browser client (admin is authenticated; `broadcasts` RLS already permits CRUD), matching the existing Settings page. Tiptap provides the rich-text body. Two pure helpers (`buildBroadcastHtml`, `recipientCountFor`) are unit-tested with Vitest; everything else is verified with the project's `type-check` + `lint` + `build` gate plus manual checks. Send/Schedule are disabled until Phase 7. No database changes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), Zod, Tiptap, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-phase-5-broadcasts-design.md`

---

## File Structure

**Create:**
- `vitest.config.ts` — Vitest config with `@` alias.
- `src/lib/broadcast-html.ts` — pure: assemble final email HTML (logo + body + CTA).
- `src/lib/broadcast-html.test.ts` — unit tests.
- `src/lib/audience.ts` — pure: audience types, `AUDIENCE_OPTIONS`, `recipientCountFor`.
- `src/lib/audience.test.ts` — unit tests.
- `src/lib/audience-counts.ts` — `fetchAudienceCounts(supabase)` (shared by hook + list page).
- `src/components/admin/BroadcastStatusBadge.tsx` — status pill.
- `src/components/admin/RichTextEditor.tsx` — Tiptap wrapper.
- `src/components/admin/AudienceSelector.tsx` — audience radios with counts.
- `src/components/admin/EmailPreview.tsx` — framed email preview.
- `src/components/admin/BroadcastComposer.tsx` — the form (state, save/update/delete).
- `src/components/admin/BroadcastRow.tsx` — clickable list row.
- `src/hooks/useAudienceCounts.ts` — client hook wrapping `fetchAudienceCounts`.
- `src/app/admin/(panel)/broadcasts/new/page.tsx` — new-broadcast route.
- `src/app/admin/(panel)/broadcasts/[id]/page.tsx` — edit-draft route.

**Modify:**
- `package.json` — add Tiptap + Vitest deps and a `test` script.
- `src/lib/broadcast-schema.ts` — add `draftBroadcastSchema`.
- `src/lib/admin-format.ts` — add `BROADCAST_STATUS_BADGE` + `broadcastStatusLabel`.
- `src/app/admin/(panel)/broadcasts/page.tsx` — replace stub with the list page.

---

## Task 1: Install dependencies and Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Tiptap and Vitest**

Run:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link
npm install -D vitest
```
Expected: packages added; `package-lock.json` updated.

- [ ] **Step 2: Add the `test` script**

In `package.json`, add to `"scripts"`:
```json
    "test": "vitest run"
```
(Place it after the `"type-check"` line.)

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Verify Vitest runs**

Run: `npx vitest run`
Expected: exits cleanly with "No test files found" (no tests yet) — confirms config loads.

- [ ] **Step 5: Verify type-check still passes**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Tiptap and Vitest for Phase 5"
```

---

## Task 2: `buildBroadcastHtml` (pure) — TDD

Assembles the final broadcast email HTML: an optional logo at the top, the body HTML, and an optional CTA button (rendered only when BOTH label and URL are present). Used by the preview now and by sending in Phase 7. Does NOT substitute `[First name]` — that is Phase 7.

**Files:**
- Create: `src/lib/broadcast-html.ts`
- Test: `src/lib/broadcast-html.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/broadcast-html.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildBroadcastHtml } from '@/lib/broadcast-html'

describe('buildBroadcastHtml', () => {
  it('includes the body html', () => {
    const html = buildBroadcastHtml({ bodyHtml: '<p>Hello parents</p>' })
    expect(html).toContain('<p>Hello parents</p>')
  })

  it('omits the logo when no logoUrl is given', () => {
    const html = buildBroadcastHtml({ bodyHtml: '<p>x</p>' })
    expect(html).not.toContain('<img')
  })

  it('includes a logo img when logoUrl is given', () => {
    const html = buildBroadcastHtml({ bodyHtml: '<p>x</p>', logoUrl: 'https://cdn/logo.png' })
    expect(html).toContain('<img')
    expect(html).toContain('https://cdn/logo.png')
  })

  it('renders a CTA anchor when both label and url are present', () => {
    const html = buildBroadcastHtml({
      bodyHtml: '<p>x</p>',
      ctaLabel: 'Book a session',
      ctaUrl: 'https://wa.me/2348087687732',
    })
    expect(html).toContain('href="https://wa.me/2348087687732"')
    expect(html).toContain('Book a session')
  })

  it('omits the CTA when the url is missing', () => {
    const html = buildBroadcastHtml({ bodyHtml: '<p>x</p>', ctaLabel: 'Book a session' })
    expect(html).not.toContain('<a')
  })

  it('passes [First name] through untouched (substitution is Phase 7)', () => {
    const html = buildBroadcastHtml({ bodyHtml: '<p>Hi [First name]</p>' })
    expect(html).toContain('[First name]')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/broadcast-html.test.ts`
Expected: FAIL — cannot resolve `@/lib/broadcast-html`.

- [ ] **Step 3: Write the implementation**

`src/lib/broadcast-html.ts`:
```ts
// Assembles the final broadcast email HTML from the composed parts. Pure and
// dependency-free so it can be unit-tested and reused by Phase 7 sending.
// Does NOT substitute personalization tokens like [First name]; that happens
// at send time in Phase 7.

export type BuildBroadcastHtmlInput = {
  bodyHtml: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  logoUrl?: string | null
}

const BRAND_BLACK = '#1A1A1A'
const BRAND_GOLD = '#F0C040'

export function buildBroadcastHtml(input: BuildBroadcastHtmlInput): string {
  const { bodyHtml, ctaLabel, ctaUrl, logoUrl } = input

  const logo = logoUrl
    ? `<div style="text-align:center;margin-bottom:24px;">` +
      `<img src="${logoUrl}" alt="" style="max-height:48px;" /></div>`
    : ''

  const cta =
    ctaLabel && ctaUrl
      ? `<div style="text-align:center;margin-top:28px;">` +
        `<a href="${ctaUrl}" style="display:inline-block;background:${BRAND_GOLD};` +
        `color:${BRAND_BLACK};text-decoration:none;font-weight:700;` +
        `padding:14px 28px;border-radius:9999px;">${ctaLabel}</a></div>`
      : ''

  return (
    `<div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;` +
    `color:${BRAND_BLACK};line-height:1.6;">` +
    logo +
    `<div>${bodyHtml}</div>` +
    cta +
    `</div>`
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/broadcast-html.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/broadcast-html.ts src/lib/broadcast-html.test.ts
git commit -m "feat: add buildBroadcastHtml email assembler with tests"
```

---

## Task 3: Audience helpers (`audience.ts`, pure) — TDD

**Files:**
- Create: `src/lib/audience.ts`
- Test: `src/lib/audience.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/audience.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { AUDIENCE_OPTIONS, recipientCountFor, type AudienceCounts } from '@/lib/audience'

const counts: AudienceCounts = { all: 100, at_risk: 20, under_strain: 50, strong: 30 }

describe('AUDIENCE_OPTIONS', () => {
  it('offers exactly all + the three bands (no individuals)', () => {
    expect(AUDIENCE_OPTIONS.map((o) => o.value)).toEqual([
      'all',
      'at_risk',
      'under_strain',
      'strong',
    ])
  })
})

describe('recipientCountFor', () => {
  it('returns the matching count for each audience', () => {
    expect(recipientCountFor('all', counts)).toBe(100)
    expect(recipientCountFor('at_risk', counts)).toBe(20)
    expect(recipientCountFor('under_strain', counts)).toBe(50)
    expect(recipientCountFor('strong', counts)).toBe(30)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/audience.test.ts`
Expected: FAIL — cannot resolve `@/lib/audience`.

- [ ] **Step 3: Write the implementation**

`src/lib/audience.ts`:
```ts
// Audience selection helpers for broadcasts. The four offered audiences are the
// consented-contact total plus each score band. "individuals" is deprioritized
// and not offered (see locked product decisions).

export type BroadcastAudience = 'all' | 'at_risk' | 'under_strain' | 'strong'

export type AudienceCounts = {
  all: number
  at_risk: number
  under_strain: number
  strong: number
}

export const AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: 'all', label: 'All respondents' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'under_strain', label: 'Under strain' },
  { value: 'strong', label: 'Strong' },
]

export function recipientCountFor(audience: BroadcastAudience, counts: AudienceCounts): number {
  return counts[audience]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/audience.test.ts`
Expected: PASS (2 suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audience.ts src/lib/audience.test.ts
git commit -m "feat: add audience options and recipientCountFor with tests"
```

---

## Task 4: `draftBroadcastSchema` — TDD

The existing `broadcastSchema` requires a non-empty body and is meant for full sends. Drafts need looser rules: a subject is required (so the list shows a title), the body may be empty while drafting, and CTA fields are optional but, if a URL is given, it must be valid.

**Files:**
- Modify: `src/lib/broadcast-schema.ts`
- Test: `src/lib/broadcast-schema.test.ts` (create)

- [ ] **Step 1: Write the failing test**

`src/lib/broadcast-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { draftBroadcastSchema } from '@/lib/broadcast-schema'

describe('draftBroadcastSchema', () => {
  it('accepts a minimal draft (subject + audience only)', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'Hello parents',
      audienceType: 'all',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty subject', () => {
    const result = draftBroadcastSchema.safeParse({ subject: '', audienceType: 'all' })
    expect(result.success).toBe(false)
  })

  it('accepts an empty cta url', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'x',
      audienceType: 'all',
      ctaUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid cta url', () => {
    const result = draftBroadcastSchema.safeParse({
      subject: 'x',
      audienceType: 'all',
      ctaUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/broadcast-schema.test.ts`
Expected: FAIL — `draftBroadcastSchema` is not exported.

- [ ] **Step 3: Add the schema**

In `src/lib/broadcast-schema.ts`, append after the existing `broadcastSchema`/type:
```ts
// Draft-save rules: looser than broadcastSchema. Subject required (list title);
// body may be empty while drafting; CTA optional but a provided URL must be valid.
export const draftBroadcastSchema = z.object({
  subject: z.string().trim().min(1, 'Please enter a subject line').max(150),
  bodyHtml: z.string().default(''),
  ctaLabel: z.string().trim().max(100).optional(),
  ctaUrl: z.union([z.string().trim().url('Please enter a valid URL'), z.literal('')]).optional(),
  includeLogo: z.boolean().default(false),
  audienceType: audienceTypeEnum,
})

export type DraftBroadcastData = z.infer<typeof draftBroadcastSchema>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/broadcast-schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/broadcast-schema.ts src/lib/broadcast-schema.test.ts
git commit -m "feat: add draftBroadcastSchema for saving broadcast drafts"
```

---

## Task 5: `fetchAudienceCounts` data helper

Shared by the client hook (Task 7) and the server-rendered list page (Task 11). Counts consented, non-unsubscribed contacts overall and per band.

**Files:**
- Create: `src/lib/audience-counts.ts`

- [ ] **Step 1: Write the implementation**

`src/lib/audience-counts.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AudienceCounts, BroadcastAudience } from '@/lib/audience'

// Counts marketing-consented, non-unsubscribed contacts overall and per band.
// Works with either the browser or server Supabase client. Uses head:true count
// queries so no rows are transferred.
export async function fetchAudienceCounts(supabase: SupabaseClient): Promise<AudienceCounts> {
  const base = () =>
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

  const band = (b: Exclude<BroadcastAudience, 'all'>) => base().eq('latest_score_range', b)

  const [all, atRisk, underStrain, strong] = await Promise.all([
    base(),
    band('at_risk'),
    band('under_strain'),
    band('strong'),
  ])

  return {
    all: all.count ?? 0,
    at_risk: atRisk.count ?? 0,
    under_strain: underStrain.count ?? 0,
    strong: strong.count ?? 0,
  }
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/audience-counts.ts
git commit -m "feat: add fetchAudienceCounts contact-count helper"
```

---

## Task 6: `BroadcastStatusBadge` + status formatting

**Files:**
- Modify: `src/lib/admin-format.ts`
- Create: `src/components/admin/BroadcastStatusBadge.tsx`

- [ ] **Step 1: Add status formatting to `admin-format.ts`**

Append to `src/lib/admin-format.ts`:
```ts
import type { BroadcastStatus } from '@/types'

// Status pill colours, tuned for the light admin background.
export const BROADCAST_STATUS_BADGE: Record<BroadcastStatus, string> = {
  draft: 'bg-black/5 text-brand-muted',
  scheduled: 'bg-[#dbeafe] text-[#1e40af]',
  sent: 'bg-[#dcfce7] text-[#166534]',
  cancelled: 'bg-[#fde2e2] text-[#991b1b]',
  failed: 'bg-[#fde2e2] text-[#991b1b]',
}

const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sent: 'Sent',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

export function broadcastStatusLabel(status: BroadcastStatus): string {
  return BROADCAST_STATUS_LABELS[status]
}
```
(Add the `import type` line to the existing imports at the top of the file rather than mid-file if your linter prefers; functionally either is fine.)

- [ ] **Step 2: Create the component**

`src/components/admin/BroadcastStatusBadge.tsx`:
```tsx
import { BROADCAST_STATUS_BADGE, broadcastStatusLabel } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import type { BroadcastStatus } from '@/types'

export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        BROADCAST_STATUS_BADGE[status]
      )}
    >
      {broadcastStatusLabel(status)}
    </span>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin-format.ts src/components/admin/BroadcastStatusBadge.tsx
git commit -m "feat: add BroadcastStatusBadge and status formatting"
```

---

## Task 7: `RichTextEditor` (Tiptap wrapper)

A controlled WYSIWYG editor with a small toolbar (bold, italic, link, bullet list). `value` is an HTML string; `onChange` emits HTML. Uses `immediatelyRender: false` to avoid Next SSR hydration mismatches.

**Files:**
- Create: `src/components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Create the component**

`src/components/admin/RichTextEditor.tsx`:
```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[220px] rounded-b-lg border border-t-0 border-black/15 bg-white px-4 py-3 focus:outline-none prose prose-sm max-w-none',
      },
    },
  })

  if (!editor) return null

  const btn = (active: boolean) =>
    cn(
      'rounded px-2 py-1 text-sm font-bold transition-colors',
      active ? 'bg-brand-black text-brand-white' : 'hover:bg-black/5'
    )

  function addLink() {
    const url = window.prompt('Link URL (https://…)')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div>
      <div className="flex gap-1 rounded-t-lg border border-black/15 bg-brand-offwhite p-1">
        <button
          type="button"
          className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={cn(btn(editor.isActive('italic')), 'italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          • List
        </button>
        <button type="button" className={btn(editor.isActive('link'))} onClick={addLink} aria-label="Link">
          🔗 Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors. (If lint flags `editor!` non-null assertions, the guard `if (!editor) return null` above makes them safe; keep them.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/RichTextEditor.tsx
git commit -m "feat: add Tiptap RichTextEditor for broadcast composer"
```

---

## Task 8: `useAudienceCounts` hook + `AudienceSelector`

**Files:**
- Create: `src/hooks/useAudienceCounts.ts`
- Create: `src/components/admin/AudienceSelector.tsx`

- [ ] **Step 1: Create the hook**

`src/hooks/useAudienceCounts.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import type { AudienceCounts } from '@/lib/audience'

// Loads consented-contact counts (total + per band) for the audience selector.
export function useAudienceCounts() {
  const [counts, setCounts] = useState<AudienceCounts | null>(null)

  useEffect(() => {
    const supabase = createClient()
    fetchAudienceCounts(supabase).then(setCounts)
  }, [])

  return counts
}
```

- [ ] **Step 2: Create the selector**

`src/components/admin/AudienceSelector.tsx`:
```tsx
'use client'

import { AUDIENCE_OPTIONS, recipientCountFor, type BroadcastAudience, type AudienceCounts } from '@/lib/audience'
import { cn } from '@/lib/utils'

type AudienceSelectorProps = {
  value: BroadcastAudience
  onChange: (audience: BroadcastAudience) => void
  counts: AudienceCounts | null
}

export function AudienceSelector({ value, onChange, counts }: AudienceSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {AUDIENCE_OPTIONS.map((option) => {
        const selected = value === option.value
        const count = counts ? recipientCountFor(option.value, counts) : null
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
              selected ? 'border-brand-gold bg-brand-gold/10' : 'border-black/15 hover:bg-black/5'
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-brand-muted">
              {count === null ? '…' : `${count} recipient${count === 1 ? '' : 's'}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAudienceCounts.ts src/components/admin/AudienceSelector.tsx
git commit -m "feat: add useAudienceCounts hook and AudienceSelector"
```

---

## Task 9: `EmailPreview`

**Files:**
- Create: `src/components/admin/EmailPreview.tsx`

- [ ] **Step 1: Create the component**

`src/components/admin/EmailPreview.tsx`:
```tsx
'use client'

import { buildBroadcastHtml } from '@/lib/broadcast-html'

type EmailPreviewProps = {
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  logoUrl?: string | null
  includeLogo: boolean
}

export function EmailPreview({ bodyHtml, ctaLabel, ctaUrl, logoUrl, includeLogo }: EmailPreviewProps) {
  const html = buildBroadcastHtml({
    bodyHtml: bodyHtml || '<p style="color:#888">Your message preview will appear here…</p>',
    ctaLabel,
    ctaUrl,
    logoUrl: includeLogo ? logoUrl : null,
  })

  return (
    <div className="rounded-xl border border-black/10 bg-brand-offwhite p-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-muted">Preview</p>
      <div className="rounded-lg bg-white p-5 shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EmailPreview.tsx
git commit -m "feat: add EmailPreview using buildBroadcastHtml"
```

---

## Task 10: `BroadcastComposer`

The form. Holds state for all fields, loads the Settings logo and WhatsApp link, validates with `draftBroadcastSchema`, and saves (insert → redirect to `[id]`, or update). Send/Schedule are rendered disabled. Delete appears only when editing an existing draft.

**Files:**
- Create: `src/components/admin/BroadcastComposer.tsx`

- [ ] **Step 1: Create the component**

`src/components/admin/BroadcastComposer.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { draftBroadcastSchema } from '@/lib/broadcast-schema'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { RichTextEditor } from './RichTextEditor'
import { AudienceSelector } from './AudienceSelector'
import { EmailPreview } from './EmailPreview'
import { useAudienceCounts } from '@/hooks/useAudienceCounts'
import type { BroadcastAudience } from '@/lib/audience'
import type { Broadcast } from '@/types'

type BroadcastComposerProps = { broadcast?: Broadcast }

export function BroadcastComposer({ broadcast }: BroadcastComposerProps) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const counts = useAudienceCounts()

  const [subject, setSubject] = useState(broadcast?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(broadcast?.body_html ?? '')
  const [ctaLabel, setCtaLabel] = useState(broadcast?.cta_label ?? '')
  const [ctaUrl, setCtaUrl] = useState(broadcast?.cta_url ?? '')
  const [includeLogo, setIncludeLogo] = useState(broadcast?.include_logo ?? false)
  const [audienceType, setAudienceType] = useState<BroadcastAudience>(
    (broadcast?.audience_type as BroadcastAudience) ?? 'all'
  )

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappTemplate, setWhatsappTemplate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select('logo_url, whatsapp_number, whatsapp_message_template')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setLogoUrl(data.logo_url)
        setWhatsappNumber(data.whatsapp_number ?? '')
        setWhatsappTemplate(data.whatsapp_message_template ?? '')
      })
  }, [supabase])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  function useWhatsAppLink() {
    const url = buildWhatsAppUrl(whatsappNumber, whatsappTemplate, { firstName: '', score: 0 })
    if (url) setCtaUrl(url)
  }

  async function saveDraft() {
    setError(null)
    const parsed = draftBroadcastSchema.safeParse({
      subject,
      bodyHtml,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
      includeLogo,
      audienceType,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form')
      return
    }

    setSaving(true)
    const payload = {
      subject,
      body_html: bodyHtml,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      include_logo: includeLogo,
      audience_type: audienceType,
      status: 'draft' as const,
    }

    if (broadcast) {
      const { error } = await supabase.from('broadcasts').update(payload).eq('id', broadcast.id)
      setSaving(false)
      if (error) return showToast('Could not save — please try again')
      showToast('Draft saved')
    } else {
      const { data, error } = await supabase
        .from('broadcasts')
        .insert(payload)
        .select('id')
        .single()
      setSaving(false)
      if (error || !data) return showToast('Could not save — please try again')
      router.push(`/admin/broadcasts/${data.id}`)
    }
  }

  async function deleteDraft() {
    if (!broadcast) return
    if (!window.confirm('Delete this draft? This cannot be undone.')) return
    const { error } = await supabase.from('broadcasts').delete().eq('id', broadcast.id)
    if (error) return showToast('Could not delete — please try again')
    router.push('/admin/broadcasts')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold" htmlFor="subject">
            Subject line
          </label>
          <input
            id="subject"
            className="field-input mt-1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A note for you, [First name]"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Use <code className="rounded bg-black/5 px-1">[First name]</code> to insert each
            parent&apos;s first name when sent.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold">Message</label>
          <div className="mt-1">
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold">Audience</label>
          <div className="mt-1">
            <AudienceSelector value={audienceType} onChange={setAudienceType} counts={counts} />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-brand-white p-4">
          <p className="text-sm font-bold">Call-to-action button (optional)</p>
          <input
            className="field-input mt-2"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Button label (e.g. Book a session)"
          />
          <input
            className="field-input mt-2"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://…"
          />
          <button type="button" onClick={useWhatsAppLink} className="mt-2 text-sm text-brand-muted underline">
            Use my WhatsApp link
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} />
          Include logo at the top
          {includeLogo && !logoUrl && (
            <span className="text-xs text-brand-muted">(no logo uploaded yet — set one in Settings)</span>
          )}
        </label>

        {error && <p className="text-sm text-[#991b1b]">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            disabled
            title="Live sending activates in Phase 7"
            className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
          >
            Send now
          </button>
          <button
            type="button"
            disabled
            title="Live sending activates in Phase 7"
            className="cursor-not-allowed rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-muted opacity-60"
          >
            Schedule
          </button>
          {broadcast && (
            <button type="button" onClick={deleteDraft} className="ml-auto text-sm text-[#991b1b] underline">
              Delete draft
            </button>
          )}
        </div>
        <p className="text-xs text-brand-muted">Live sending and scheduling activate in Phase 7.</p>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <EmailPreview
          bodyHtml={bodyHtml}
          ctaLabel={ctaLabel || undefined}
          ctaUrl={ctaUrl || undefined}
          logoUrl={logoUrl}
          includeLogo={includeLogo}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BroadcastComposer.tsx
git commit -m "feat: add BroadcastComposer form with draft save/update/delete"
```

---

## Task 11: Composer routes (`new` and `[id]`)

**Files:**
- Create: `src/app/admin/(panel)/broadcasts/new/page.tsx`
- Create: `src/app/admin/(panel)/broadcasts/[id]/page.tsx`

- [ ] **Step 1: Create the `new` route**

`src/app/admin/(panel)/broadcasts/new/page.tsx`:
```tsx
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'

export default function NewBroadcastPage() {
  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">New broadcast</h1>
      <p className="mt-2 text-sm text-brand-muted">Write your email, choose who receives it, and save it as a draft.</p>
      <div className="mt-6">
        <BroadcastComposer />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the `[id]` route**

`src/app/admin/(panel)/broadcasts/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'
import type { Broadcast } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EditBroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const broadcast = data as Broadcast

  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Edit broadcast</h1>
      <div className="mt-6">
        <BroadcastComposer broadcast={broadcast} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(panel)/broadcasts/new/page.tsx" "src/app/admin/(panel)/broadcasts/[id]/page.tsx"
git commit -m "feat: add new and edit broadcast composer routes"
```

---

## Task 12: `BroadcastRow` + list page

**Files:**
- Create: `src/components/admin/BroadcastRow.tsx`
- Modify: `src/app/admin/(panel)/broadcasts/page.tsx`

- [ ] **Step 1: Create the clickable row**

`src/components/admin/BroadcastRow.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/admin-format'
import { recipientCountFor, type AudienceCounts, type BroadcastAudience } from '@/lib/audience'
import { BroadcastStatusBadge } from './BroadcastStatusBadge'
import type { Broadcast } from '@/types'

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All respondents',
  at_risk: 'At risk',
  under_strain: 'Under strain',
  strong: 'Strong',
}

export function BroadcastRow({ b, counts }: { b: Broadcast; counts: AudienceCounts }) {
  const router = useRouter()
  const open = () => router.push(`/admin/broadcasts/${b.id}`)
  const audience = b.audience_type as BroadcastAudience
  const recipients = audience in AUDIENCE_LABELS ? recipientCountFor(audience, counts) : 0

  return (
    <tr
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open()
      }}
      tabIndex={0}
      className="cursor-pointer border-b border-black/5 transition-colors last:border-0 hover:bg-black/[0.03] focus:bg-black/[0.03] focus:outline-none"
    >
      <td className="px-4 py-3 font-medium">{b.subject}</td>
      <td className="px-4 py-3 text-brand-muted">{AUDIENCE_LABELS[audience] ?? b.audience_type}</td>
      <td className="px-4 py-3">
        <BroadcastStatusBadge status={b.status} />
      </td>
      <td className="px-4 py-3 text-brand-muted">{recipients}</td>
      <td className="px-4 py-3 text-brand-muted">{formatDate(b.updated_at)}</td>
    </tr>
  )
}
```

- [ ] **Step 2: Replace the list page**

Replace the entire contents of `src/app/admin/(panel)/broadcasts/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchAudienceCounts } from '@/lib/audience-counts'
import { BroadcastRow } from '@/components/admin/BroadcastRow'
import type { Broadcast } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BroadcastsPage() {
  const supabase = await createClient()
  const [{ data: rows }, counts] = await Promise.all([
    supabase.from('broadcasts').select('*').order('updated_at', { ascending: false }),
    fetchAudienceCounts(supabase),
  ])
  const broadcasts = (rows ?? []) as Broadcast[]

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Broadcasts</h1>
        <Link href="/admin/broadcasts/new" className="btn-primary">
          New broadcast
        </Link>
      </div>

      {broadcasts.length === 0 ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-brand-white p-10 text-center">
          <p className="font-display text-xl">No broadcasts yet</p>
          <p className="mt-2 text-sm text-brand-muted">
            Create a draft to start composing an email to your respondents.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/admin/broadcasts/new" className="btn-primary">
              New broadcast
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/10 bg-brand-white">
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recipients</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <BroadcastRow key={b.id} b={b} counts={counts} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BroadcastRow.tsx "src/app/admin/(panel)/broadcasts/page.tsx"
git commit -m "feat: add broadcasts list page with clickable rows"
```

---

## Task 13: Full verification

- [ ] **Step 1: Run the full gate**

Run: `npm run test && npm run type-check && npm run lint && npm run build`
Expected: all pass — Vitest green (12 tests across 3 files), no type errors, no lint errors, build succeeds.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`, log in to `/admin`, then verify:
- Broadcasts nav → list shows "No broadcasts yet" with a New broadcast button.
- New broadcast → type a subject, format some body text (bold/italic/bullets/link), pick "At risk" → recipient count shows; preview updates live.
- Toggle "Include logo" → logo appears in preview if one is set in Settings.
- "Use my WhatsApp link" → CTA URL fills from Settings.
- Save draft → redirects to `/admin/broadcasts/[id]`; reopening from the list shows the saved content.
- Edit a field, Save draft → "Draft saved" toast; list reflects the change.
- Send now / Schedule are disabled with the Phase 7 note.
- Delete draft → confirm → returns to list, row gone.
- Recipient counts in the list match the counts in the composer for the same audience.

- [ ] **Step 3: Update the project-status memory**

Mark Phase 5 done in `C:\Users\Chinedu Nweke\.claude\projects\C--Users-Chinedu-Nweke-Downloads-familydiagnostictool\memory\project-status.md` (move Phase 5 to "Done", note it's local-only pending push).

- [ ] **Step 4: Stop and report before pushing**

Per the project workflow (commit to main locally, ask before pushing), do NOT push. Summarize what was built and the verification results, and ask the user for the go-ahead to push.

---

## Self-Review notes

- **Spec coverage:** list page (T12), composer + new/[id] (T10–11), Tiptap body (T7), CTA + "use WhatsApp link" (T10), include-logo (T10), audience selector + live counts (T3/T5/T8), preview (T9), save/edit/delete drafts (T10), disabled Send/Schedule (T10), `[First name]` literal token (T2 passthrough + T10 hint), status badge (T6), no DB work (counts via T5). All covered.
- **No new migration:** confirmed `broadcasts` RLS (select/insert/update/delete-drafts) and `updated_at` trigger exist in migration 002.
- **Type consistency:** form state is camelCase for Zod (`draftBroadcastSchema`) and mapped to snake_case DB columns in the insert/update payload. `BroadcastAudience` (audience.ts) is the working type; DB `audience_type` is cast to it. `Broadcast`/`BroadcastStatus` come from `src/types`.
