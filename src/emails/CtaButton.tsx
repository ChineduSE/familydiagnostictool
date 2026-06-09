import { Button, Section } from '@react-email/components'

function isSafeHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

type CtaButtonProps = {
  label: string
  url?: string
}

// Gold pill CTA button, centred. Renders nothing unless the URL is a safe
// http(s) link — so a missing or malformed link simply omits the button.
export function CtaButton({ label, url }: CtaButtonProps) {
  if (!isSafeHttpUrl(url)) return null

  return (
    <Section style={{ textAlign: 'center', margin: '28px 0' }}>
      <Button
        href={url}
        style={{
          backgroundColor: '#F0C040',
          color: '#1A1A1A',
          fontWeight: 600,
          fontSize: '14px',
          padding: '14px 28px',
          borderRadius: '999px',
          textDecoration: 'none',
        }}
      >
        {label}
      </Button>
    </Section>
  )
}

export default CtaButton
