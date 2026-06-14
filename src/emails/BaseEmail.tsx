import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

const BRAND = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  offwhite: '#F5F0E8',
  muted: '#888888',
}

function isSafeHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

type BaseEmailProps = {
  previewText: string
  children: ReactNode
  logoUrl?: string
  unsubscribeUrl?: string
}

// Shared shell for every outbound email: offwhite canvas, white 600px card,
// optional black logo header, and the standard footer. Body content (and any
// CTA button) is passed in as children so callers control placement.
export function BaseEmail({ previewText, children, logoUrl, unsubscribeUrl }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ margin: 0, backgroundColor: BRAND.offwhite, fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: BRAND.white }}>
          {isSafeHttpUrl(logoUrl) && (
            <Section style={{ backgroundColor: BRAND.black, padding: '24px', textAlign: 'center' }}>
              <Img src={logoUrl} alt="Logo" style={{ maxHeight: '48px', margin: '0 auto' }} />
            </Section>
          )}

          <Section style={{ padding: '48px 40px' }}>{children}</Section>

          <Hr style={{ borderColor: '#eee', margin: 0 }} />
          <Section style={{ padding: '20px 40px' }}>
            <Text style={{ fontSize: '12px', color: BRAND.muted, textAlign: 'center', margin: 0 }}>
              © {new Date().getFullYear()} Ibironke O. Semowo · ibironkeosemowo.com
            </Text>
            {isSafeHttpUrl(unsubscribeUrl) && (
              <Text style={{ fontSize: '12px', color: BRAND.muted, textAlign: 'center', margin: '8px 0 0' }}>
                <a href={unsubscribeUrl} style={{ color: BRAND.muted, textDecoration: 'underline' }}>
                  Unsubscribe
                </a>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default BaseEmail
