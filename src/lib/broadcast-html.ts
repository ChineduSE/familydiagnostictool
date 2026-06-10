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
