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
