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
