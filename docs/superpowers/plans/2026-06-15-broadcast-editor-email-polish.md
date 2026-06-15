# Broadcast Editor & Email Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add images, headings, font sizes, alignment, underline, and dividers to the broadcast editor, and fix the logo so it appears in sent emails.

**Architecture:** Logo fix threads a `logoUrl` through the send functions (pure, unit-tested). A small upload helper (unit-tested) puts images in the existing public `logos` bucket. The Tiptap editor gains extensions + toolbar controls that emit email-safe inline-styled HTML; verified by build + a headed Playwright walkthrough.

**Tech Stack:** Tiptap v3.26 (StarterKit already bundles Underline + Link), `@tiptap/extension-image`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style` (FontSize), Supabase Storage, Vitest, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-06-15-broadcast-editor-email-polish-design.md`

---

## File Structure

**Create:** `src/lib/editor-image-upload.ts` (+ test).
**Modify:**
- `src/lib/resend-broadcast.ts` (+ test) — accept + pass `logoUrl`.
- `src/app/api/admin/broadcasts/[id]/send/route.ts`, `.../test-send/route.ts` — pass the logo.
- `package.json` — Tiptap extensions.
- `src/components/admin/RichTextEditor.tsx` — extensions + toolbar.
- `src/app/globals.css`, `src/components/admin/EmailPreview.tsx` — image styling parity.

---

## Task 1: Logo in the sent/test email — TDD

`sendBroadcastNow` and `sendTestToSelf` hard-code `logoUrl: null`. Add a `logoUrl`
arg and pass it through; the routes supply it from settings when `include_logo` is on.

**Files:**
- Modify: `src/lib/resend-broadcast.ts`
- Test: `src/lib/resend-broadcast.test.ts`
- Modify: `src/app/api/admin/broadcasts/[id]/send/route.ts`
- Modify: `src/app/api/admin/broadcasts/[id]/test-send/route.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/resend-broadcast.test.ts`, add inside the `describe('sendBroadcastNow', ...)` block:
```ts
  it('includes the logo image when a logoUrl is provided', async () => {
    const resend = fakeResend()
    const supabase = { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) } as any
    await sendBroadcastNow({
      supabase,
      resend,
      broadcast: draft,
      target: { audienceId: 'aud_1' },
      from: 'X <hello@d.com>',
      logoUrl: 'https://cdn/logo.png',
    })
    const arg = resend.broadcasts.create.mock.calls[0][0]
    expect(arg.html).toContain('<img')
    expect(arg.html).toContain('https://cdn/logo.png')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/resend-broadcast.test.ts -t "includes the logo"`
Expected: FAIL — the html has no `<img>` (logoUrl is ignored).

- [ ] **Step 3: Thread `logoUrl` through the send functions**

In `src/lib/resend-broadcast.ts`:
- Add `logoUrl?: string | null` to `SendBroadcastArgs`:
```ts
type SendBroadcastArgs = {
  supabase: SupabaseClient
  resend: Resend
  broadcast: Broadcast
  target: ResendTarget
  from: string
  replyTo?: string
  logoUrl?: string | null
}
```
- In `sendBroadcastNow`, destructure it and pass to `buildBroadcastHtml`:
```ts
  const { supabase, resend, broadcast, target, from, replyTo, logoUrl } = args
```
```ts
    buildBroadcastHtml({
      bodyHtml,
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: logoUrl ?? null,
    }) + UNSUBSCRIBE_FOOTER
```
- Add `logoUrl?: string | null` to `TestSendArgs` and pass it in `sendTestToSelf`:
```ts
type TestSendArgs = { resend: Resend; broadcast: Broadcast; to: string; from: string; replyTo?: string; logoUrl?: string | null }
```
```ts
  const { resend, broadcast, to, from, replyTo, logoUrl } = args
```
```ts
    buildBroadcastHtml({
      bodyHtml: toSampleText(broadcast.body_html, ''),
      ctaLabel: broadcast.cta_label,
      ctaUrl: broadcast.cta_url,
      logoUrl: logoUrl ?? null,
    }) + '<div style="margin-top:28px;font-size:12px;color:#9a948b;text-align:center;">Unsubscribe (test)</div>'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/resend-broadcast.test.ts`
Expected: PASS (all broadcast tests).

- [ ] **Step 5: Pass the logo from the send route**

In `src/app/api/admin/broadcasts/[id]/send/route.ts`, the `settings` row is already
loaded. Update the `sendBroadcastNow` call to include the logo:
```ts
  const result = await sendBroadcastNow({
    supabase,
    resend,
    broadcast: broadcast as Broadcast,
    target: resolved.target,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    logoUrl: (broadcast as Broadcast).include_logo ? (settings as Settings).logo_url : null,
  })
```

- [ ] **Step 6: Pass the logo from the test-send route**

In `src/app/api/admin/broadcasts/[id]/test-send/route.ts`, load the settings logo
and pass it. After the `broadcast` is fetched and before the `sendTestToSelf` call, add:
```ts
  const { data: settings } = await supabase.from('settings').select('logo_url').eq('id', 1).maybeSingle()
```
and update the call:
```ts
  const result = await sendTestToSelf({
    resend,
    broadcast: broadcast as Broadcast,
    to: auth.user.email,
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    logoUrl: (broadcast as Broadcast).include_logo ? (settings?.logo_url ?? null) : null,
  })
```
Ensure `Settings` is imported in the send route (`import type { Broadcast, Settings } from '@/types'` — already present there). The test-send route only needs `logo_url`, so no `Settings` import is required.

- [ ] **Step 7: Verify type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/resend-broadcast.ts src/lib/resend-broadcast.test.ts "src/app/api/admin/broadcasts/[id]/send/route.ts" "src/app/api/admin/broadcasts/[id]/test-send/route.ts"
git commit -m "fix: include the logo in sent and test broadcast emails"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 2: Install Tiptap extensions

**Files:** Modify `package.json` (+ lockfile).

- [ ] **Step 1: Install**

Run:
```bash
npm install @tiptap/extension-image @tiptap/extension-text-align @tiptap/extension-text-style
```
Expected: three packages added at `^3.26.0` (matching the installed Tiptap version).

- [ ] **Step 2: Confirm the FontSize export exists**

Run: `node -e "const m=require('@tiptap/extension-text-style'); console.log(Object.keys(m))"`
Expected: the printed keys include `TextStyle` and `FontSize`. (If `FontSize` is
absent in this build, stop and report — the editor task's font-size control depends
on it; do not guess an alternative.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Tiptap image, text-align, text-style extensions"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 3: `editor-image-upload.ts` — TDD

Validates and uploads an image to the existing public `logos` bucket under a
`broadcast/` prefix, returning its public URL.

**Files:**
- Create: `src/lib/editor-image-upload.ts`
- Test: `src/lib/editor-image-upload.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/editor-image-upload.test.ts`:
```ts
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles */
import { describe, it, expect, vi } from 'vitest'
import { uploadEditorImage } from '@/lib/editor-image-upload'

function fakeSupabase({ uploadError = null as null | { message: string } } = {}) {
  const upload = vi.fn(async () => ({ error: uploadError }))
  return {
    upload,
    storage: {
      from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/${p}` } }) }),
    },
  } as any
}

function fakeFile(type: string, size: number) {
  return { type, size } as File
}

describe('uploadEditorImage', () => {
  it('rejects an unsupported file type', async () => {
    await expect(uploadEditorImage(fakeSupabase(), fakeFile('image/svg+xml', 100))).rejects.toThrow()
  })

  it('rejects a file over 5MB', async () => {
    await expect(uploadEditorImage(fakeSupabase(), fakeFile('image/png', 6 * 1024 * 1024))).rejects.toThrow()
  })

  it('uploads under broadcast/ and returns the public url', async () => {
    const supabase = fakeSupabase()
    const url = await uploadEditorImage(supabase, fakeFile('image/png', 1000))
    expect(supabase.upload.mock.calls[0][0]).toMatch(/^broadcast\//)
    expect(url).toContain('https://cdn/broadcast/')
  })

  it('throws when storage upload fails', async () => {
    const supabase = fakeSupabase({ uploadError: { message: 'nope' } })
    await expect(uploadEditorImage(supabase, fakeFile('image/png', 1000))).rejects.toThrow('nope')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/editor-image-upload.test.ts`
Expected: FAIL — cannot resolve `@/lib/editor-image-upload`.

- [ ] **Step 3: Write the implementation**

`src/lib/editor-image-upload.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_BYTES = 5 * 1024 * 1024
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

// Validates an image and uploads it to the existing public `logos` bucket under a
// `broadcast/` prefix, returning the public URL for embedding in a broadcast.
export async function uploadEditorImage(supabase: SupabaseClient, file: File): Promise<string> {
  const ext = EXT[file.type]
  if (!ext) throw new Error('Please choose a PNG, JPG, GIF or WebP image.')
  if (file.size > MAX_BYTES) throw new Error('Image must be under 5MB.')

  const path = `broadcast/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('logos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/editor-image-upload.test.ts && npm run type-check && npm run lint`
Expected: PASS (4 tests), no type/lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor-image-upload.ts src/lib/editor-image-upload.test.ts
git commit -m "feat: add editor image upload helper"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 4: Upgrade `RichTextEditor` + styling parity

Replace the editor with the richer toolbar. Link is configured through StarterKit
(which bundles Link + Underline in v3) to avoid duplicate extensions.

**Files:**
- Modify: `src/components/admin/RichTextEditor.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/admin/EmailPreview.tsx`

- [ ] **Step 1: Replace `RichTextEditor.tsx`**

Replace the entire file `src/components/admin/RichTextEditor.tsx`:
```tsx
'use client'

import { useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { createClient } from '@/lib/supabase/client'
import { uploadEditorImage } from '@/lib/editor-image-upload'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
}

const FONT_SIZES = [
  { label: 'Small', value: '13px' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '20px' },
  { label: 'X-Large', value: '26px' },
]

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } },
      }),
      Image.configure({ HTMLAttributes: { style: 'max-width:100%;height:auto;' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'rich-text min-h-[260px] rounded-b-lg border border-t-0 border-black/15 bg-white px-4 py-3 focus:outline-none',
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
    const previous = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL (https://…)', previous ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadEditorImage(createClient(), file)
      editor!.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const blockValue = editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
      ? 'h3'
      : 'p'

  const currentSize = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''

  const selectClass = 'rounded border border-black/15 bg-brand-white px-1 py-1 text-sm'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-black/15 bg-brand-offwhite p-1">
        <select
          aria-label="Text style"
          className={selectClass}
          value={blockValue}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: v === 'h2' ? 2 : 3 }).run()
          }}
        >
          <option value="p">Normal</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>

        <select
          aria-label="Font size"
          className={selectClass}
          value={currentSize}
          onChange={(e) => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontSize(v).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="mx-1 w-px self-stretch bg-black/10" aria-hidden />

        <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">B</button>
        <button type="button" className={cn(btn(editor.isActive('italic')), 'italic')} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">I</button>
        <button type="button" className={cn(btn(editor.isActive('underline')), 'underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">U</button>

        <span className="mx-1 w-px self-stretch bg-black/10" aria-hidden />

        <button type="button" className={btn(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Align left">⯇</button>
        <button type="button" className={btn(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Align center">≡</button>
        <button type="button" className={btn(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Align right">⯈</button>

        <span className="mx-1 w-px self-stretch bg-black/10" aria-hidden />

        <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">• List</button>
        <button type="button" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">1. List</button>
        <button type="button" className={btn(editor.isActive('link'))} onClick={addLink} aria-label="Link">🔗 Link</button>
        <button type="button" className={btn(false)} onClick={() => fileInputRef.current?.click()} aria-label="Insert image" disabled={uploading}>
          {uploading ? 'Uploading…' : '🖼 Image'}
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Divider">— Divider</button>

        <span className="mx-1 w-px self-stretch bg-black/10" aria-hidden />

        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().insertContent('[First name]').run()}
          aria-label="Insert first name placeholder"
          title="Inserts each parent's first name when the email is sent"
        >
          + [First name]
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={onPickImage}
      />
      {uploadError && <p className="px-1 pt-1 text-xs text-[#991b1b]">{uploadError}</p>}

      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Image styling in the editor (`globals.css`)**

In `src/app/globals.css`, inside the `.rich-text` rules, add an image rule next to
the existing `.rich-text a` block:
```css
.rich-text img {
  max-width: 100%;
  height: auto;
}
```

- [ ] **Step 3: Image styling in the preview (`EmailPreview.tsx`)**

In `src/components/admin/EmailPreview.tsx` `FRAME_STYLES`, add an image rule next to
the `.body a` line:
```
  .body img{max-width:100%;height:auto}
```

- [ ] **Step 4: Verify type-check + lint + build**

Run: `npm run type-check && npm run lint && npm run build`
Expected: no errors; build succeeds. If TypeScript reports that `setFontSize`,
`setImage`, `setHeading`, or `setTextAlign` don't exist on the chain, confirm the
matching extension is in the `extensions` array (their module augmentation provides
the command types) — do not cast to `any`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/RichTextEditor.tsx src/app/globals.css src/components/admin/EmailPreview.tsx
git commit -m "feat: add images, headings, font size, alignment, underline, divider to the editor"
```
(Append a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 5: Full verification + headed walkthrough

- [ ] **Step 1: Run the full gate**

Run: `npm run test && npm run type-check && npm run lint && npm run build`
Expected: all pass — Vitest green (existing suites + the new logo and image-upload
tests), no type/lint errors, build succeeds.

- [ ] **Step 2: Headed Playwright walkthrough (controller runs this)**

Write a temporary headed Playwright script (as in prior rounds, in a throwaway
`.walkthrough/` dir, persistent profile so login is reused) that, after the user
logs in once, opens `/admin/broadcasts/new` and:
- types a subject, types body text;
- sets the format to "Heading", types a title; back to "Normal";
- selects text and applies a larger font size; centers it;
- toggles underline on some text;
- inserts a divider;
- uploads a small local image and confirms it appears in the editor + preview;
- toggles "Include logo";
- saves the draft, then on the confirm screen clicks "Send a test to myself".
Capture screenshots of the editor + preview. Delete `.walkthrough/` afterward
(it stores a login session). Report what rendered.

- [ ] **Step 3: Manual confirmation by the user**

Ask the user to send themselves a test from a draft that uses a heading, a centered
image, and the logo, and confirm the logo + image + formatting render in the real
inbox (the earlier logo bug was only visible in a real send).

- [ ] **Step 4: Update the project-status memory**

In `C:\Users\Chinedu Nweke\.claude\projects\C--Users-Chinedu-Nweke-Downloads-familydiagnostictool\memory\project-status.md`, note: editor upgraded (image upload, headings, font size, alignment, underline, divider) and the broadcast-email logo fix; both done locally.

- [ ] **Step 5: Stop and report before pushing**

Per the project workflow (commit to main locally, ask before pushing), do NOT push.
Summarize what changed + verification, and ask for the go-ahead to push.

---

## Self-Review notes

- **Spec coverage:** logo fix (T1), extensions install (T2), image upload helper (T3), editor toolbar — image/headings/font-size/align/underline/divider + kept controls (T4), styling parity editor+preview (T4 steps 2-3), tests for logo + upload (T1/T3), Playwright + manual verification (T5). All covered.
- **Tiptap v3 specifics:** StarterKit bundles Link + Underline, so Link is configured via StarterKit and Underline used from it (no duplicate extensions); only Image/TextAlign/TextStyle+FontSize are added. T2 step 2 verifies the `FontSize` export before the editor depends on it.
- **Email-safety:** alignment/font-size/underline serialize as inline styles; Image is configured with an inline `max-width:100%` style; editor + preview both get an `img` rule so what you see matches what sends.
- **Type consistency:** `logoUrl?: string | null` added to both send arg types and passed identically; `uploadEditorImage(supabase, file)` matches its single call site in the editor.
- **No DB migration / no new bucket:** reuses the existing public `logos` bucket under a `broadcast/` prefix.
