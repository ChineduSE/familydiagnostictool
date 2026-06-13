'use client'

import { useEffect, useRef, useState } from 'react'
import { buildBroadcastHtml } from '@/lib/broadcast-html'

type EmailPreviewProps = {
  subject: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  logoUrl?: string | null
  includeLogo: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Base styles inside the iframe. Isolated from the app so the email renders the
// way an inbox would — list markers, indentation and links all intact.
const FRAME_STYLES = `
  *{box-sizing:border-box}
  body{margin:0;background:#f1f0ec;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A}
  .client{max-width:600px;margin:0 auto}
  .head{background:#fff;border-bottom:1px solid #e6e3dd;padding:16px 20px}
  .subject{font-size:16px;font-weight:700;line-height:1.35;color:#1A1A1A}
  .subject.empty{color:#9a948b;font-weight:500}
  .from{margin-top:6px;font-size:12px;color:#706c65}
  .from .avatar{display:inline-block;width:18px;height:18px;border-radius:50%;background:#F0C040;color:#1A1A1A;text-align:center;line-height:18px;font-weight:700;font-size:11px;margin-right:6px;vertical-align:middle}
  .body{padding:0}
  .body p{margin:0 0 12px}
  .body ul,.body ol{margin:0 0 12px;padding-left:24px}
  .body ul{list-style:disc}
  .body ol{list-style:decimal}
  .body li{margin:3px 0}
  .body li p{margin:0}
  .body a{color:#1155cc;text-decoration:underline}
  .body strong{font-weight:700}
  .body em{font-style:italic}
  .body h1,.body h2,.body h3{font-weight:700;margin:0 0 8px;line-height:1.3}
  .foot{padding:16px 20px;font-size:11px;color:#9a948b;text-align:center}
`

export function EmailPreview({
  subject,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  logoUrl,
  includeLogo,
}: EmailPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(420)

  const bodyInner = buildBroadcastHtml({
    bodyHtml: bodyHtml || '<p style="color:#9a948b">Your message preview will appear here…</p>',
    ctaLabel,
    ctaUrl,
    logoUrl: includeLogo ? logoUrl : null,
  })

  const subjectText = subject.trim()
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${FRAME_STYLES}</style></head>
    <body><div class="client">
      <div class="head">
        <div class="subject${subjectText ? '' : ' empty'}">${
          subjectText ? escapeHtml(subjectText) : 'No subject yet'
        }</div>
        <div class="from"><span class="avatar">I</span>Ibironke Semowo &lt;your parents' inbox&gt;</div>
      </div>
      <div class="body">${bodyInner}</div>
      <div class="foot">You're receiving this because you took the Family Connection quiz. Unsubscribe anytime.</div>
    </div></body></html>`

  // Auto-fit the iframe to its content so the preview grows with the message.
  // Guarded: reading the frame document can throw if the browser treats it as
  // cross-origin; never let that crash the composer.
  function resize() {
    try {
      const doc = frameRef.current?.contentWindow?.document
      if (doc) setHeight(doc.body.scrollHeight + 2)
    } catch {
      // Keep the current height if the frame isn't readable.
    }
  }

  useEffect(() => {
    const id = window.setTimeout(resize, 50)
    return () => window.clearTimeout(id)
    // Re-measure whenever the rendered content changes.
  }, [srcDoc])

  return (
    <div className="rounded-xl border border-black/10 bg-brand-offwhite p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-muted">
        Email preview
      </p>
      <div className="overflow-hidden rounded-lg border border-black/10 shadow-sm">
        <iframe
          ref={frameRef}
          title="Email preview"
          srcDoc={srcDoc}
          onLoad={resize}
          sandbox="allow-same-origin"
          className="w-full bg-white"
          style={{ height }}
        />
      </div>
    </div>
  )
}
