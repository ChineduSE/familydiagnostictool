# Broadcast Editor & Email Polish — Design Spec

**Date:** 2026-06-15
**Status:** approved, ready for implementation plan

## Goal

Make Ibironke's newsletter editor genuinely useful (images, headings, font sizes,
alignment, underline, dividers) and fix the logo so it appears in sent broadcast
emails — all while keeping the output email-client-safe.

## Scope

**In:**
1. **Logo fix:** the broadcast send path includes the logo when "Include logo" is on (it currently sends none), so it shows in the test send and the real send.
2. **Editor upgrades** in `RichTextEditor` (the broadcast body editor):
   - **Image upload** — file picker → upload to Supabase storage → insert, sized to fit.
   - **Headings** — Heading (h2) / Subheading (h3).
   - **Font size** — Small / Normal / Large / X-Large on the selected text.
   - **Text alignment** — left / center / right.
   - **Underline** — alongside the existing Bold / Italic.
   - **Divider** — a horizontal rule.
   - Keep: bullet list, numbered list, link, "+ [First name]".

**Out (YAGNI):** text color, custom fonts, tables, video, image resizing handles,
a separate image library/manager.

## Platform facts

- Tiptap **v3.26**. StarterKit already includes Heading, HorizontalRule, Bold,
  Italic, lists. Need to install: `@tiptap/extension-image`,
  `@tiptap/extension-text-align`, `@tiptap/extension-text-style` (provides
  `FontSize` in v3), and `@tiptap/extension-underline` (explicit).
- A public `logos` Supabase Storage bucket already exists and is used by the
  Settings logo upload (browser client, `upsert`, `getPublicUrl`). We reuse it
  with a `broadcast/` path prefix — **no new bucket or storage policy needed**.

## Design

### 1. Logo fix
- `sendBroadcastNow` and `sendTestToSelf` gain a `logoUrl?: string | null` arg,
  passed straight into `buildBroadcastHtml` (instead of the current hard `null`).
- The send + test-send API routes load `settings.logo_url` and pass
  `broadcast.include_logo ? settings.logo_url : null`.

### 2. Image upload helper — `src/lib/editor-image-upload.ts`
- `uploadEditorImage(supabase, file): Promise<string>` — validates type
  (png/jpeg/gif/webp) and size (≤ 5 MB), uploads to the `logos` bucket at
  `broadcast/{timestamp}-{random}.{ext}`, returns the public URL. Throws a clear
  Error on validation/upload failure. Unit-tested with a mocked storage client.

### 3. `RichTextEditor` changes
- Add extensions: `Image` (configured with `HTMLAttributes: { style: 'max-width:100%;height:auto;' }` so images never overflow email/mobile), `TextAlign` (for headings + paragraphs), `TextStyle` + `FontSize`, `Underline`.
- Toolbar gains: a format control (Normal / Heading / Subheading), a font-size control (Small/Normal/Large/X-Large), align left/center/right, underline, image button, divider button — beside the existing Bold/Italic/lists/link/[First name].
- The image button opens a hidden file input → `uploadEditorImage` (via the browser Supabase client) → `editor.chain().focus().setImage({ src }).run()`. A lightweight "uploading…" state disables the button during upload.
- Output stays HTML; alignment/font-size/underline serialize as inline styles
  (`text-align`, `font-size`, `<u>`) that email clients render. Headings use the
  client's default heading rendering.

### 4. Styling parity (editor ↔ preview ↔ email)
- `globals.css` `.rich-text`: add `img { max-width:100%; height:auto; }` and ensure heading/alignment render in the editor (headings already styled).
- `EmailPreview` `FRAME_STYLES`: add `.body img { max-width:100%; height:auto; }` so the iframe preview matches the email.

## Components / files

**Create:** `src/lib/editor-image-upload.ts` (+ test).
**Modify:** `package.json` (extensions), `src/components/admin/RichTextEditor.tsx`,
`src/app/globals.css`, `src/components/admin/EmailPreview.tsx`,
`src/lib/resend-broadcast.ts` (+ test), the send + test-send routes.

## Error handling

- Image upload: invalid type/size → clear inline error in the editor; upload
  failure → error message, no node inserted, button re-enabled.
- Logo fix: if `settings.logo_url` is null while `include_logo` is true, the email
  simply renders without a logo (no error) — same as today's preview behavior.

## Testing strategy

- **Unit (Vitest):** `uploadEditorImage` — rejects bad type/size; on success calls
  storage upload with a `broadcast/` path and returns the public URL (mocked
  storage). `sendBroadcastNow`/`sendTestToSelf` — when given a `logoUrl`, the
  assembled `html` contains the logo `<img>`; when `null`, it does not.
- **Manual / headed Playwright:** drive the composer — type a heading, change a
  font size, center text, underline, insert a divider, **upload an image**, toggle
  the logo — and confirm the live preview updates; then a **test-send** to the
  developer's own inbox to confirm the logo + formatting render in a real email.

## Out of scope / non-goals

Text color, fonts, tables, video, drag-resize images, a media library. Deferred.
