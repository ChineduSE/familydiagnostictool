'use client'

import { useState } from 'react'

export function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full bg-brand-black px-4 py-2 text-xs font-bold text-brand-white transition-colors hover:bg-black/80"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
