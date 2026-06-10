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
