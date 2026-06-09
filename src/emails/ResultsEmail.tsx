import { Text } from '@react-email/components'
import { Fragment } from 'react'
import { CTA_LABEL, EMAIL_COPY } from '@/lib/questions'
import type { ScoreRange } from '@/types'
import { BaseEmail } from './BaseEmail'
import { CtaButton } from './CtaButton'

export type ResultsEmailProps = {
  firstName: string
  score: number
  scoreRange: ScoreRange
  ctaUrl?: string
  logoUrl?: string
}

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '1.7',
  color: '#1A1A1A',
  margin: '0 0 18px',
}

// Render a paragraph that may contain internal line breaks (e.g. → bullets)
// as a single block with <br/> between lines.
function Paragraph({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <Text style={paragraphStyle}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Text>
  )
}

export function ResultsEmail({ firstName, score, scoreRange, ctaUrl, logoUrl }: ResultsEmailProps) {
  const { subject, body } = EMAIL_COPY[scoreRange]
  const previewText = subject.replaceAll('[First name]', firstName)
  const resolved = body.replaceAll('[First name]', firstName).replaceAll('[SCORE]', String(score))
  const blocks = resolved.split('\n\n')

  return (
    <BaseEmail previewText={previewText} logoUrl={logoUrl}>
      {blocks.map((block, index) =>
        block.trim() === '[CTA BUTTON]' ? (
          <CtaButton key={index} label={CTA_LABEL} url={ctaUrl} />
        ) : (
          <Paragraph key={index} text={block} />
        )
      )}
    </BaseEmail>
  )
}

export default ResultsEmail
