import { Text } from '@react-email/components'
import { Fragment } from 'react'
import { EMAIL_COPY, SUPPORT_CONFIRMATION, buildEmailBody } from '@/lib/questions'
import type { ScoreRange } from '@/types'
import { BaseEmail } from './BaseEmail'

export type ResultsEmailProps = {
  firstName: string
  score: number
  scoreRange: ScoreRange
  wantsSupport: boolean
  logoUrl?: string
  unsubscribeUrl?: string
}

const confirmationStyle = {
  fontSize: '15px',
  lineHeight: '1.6',
  fontWeight: 600,
  color: '#166534',
  backgroundColor: '#dcfce7',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '10px 0 26px',
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

export function ResultsEmail({ firstName, score, scoreRange, wantsSupport, logoUrl, unsubscribeUrl }: ResultsEmailProps) {
  const { subject } = EMAIL_COPY[scoreRange]
  const previewText = subject.replaceAll('[First name]', firstName)
  const resolved = buildEmailBody(scoreRange, wantsSupport)
    .replaceAll('[First name]', firstName)
    .replaceAll('[SCORE]', String(score))
  const blocks = resolved.split('\n\n')

  return (
    <BaseEmail previewText={previewText} logoUrl={logoUrl} unsubscribeUrl={unsubscribeUrl}>
      {blocks.map((block, index) =>
        block.trim() === '[CTA BUTTON]' ? (
          <Text key={index} style={confirmationStyle}>
            {SUPPORT_CONFIRMATION}
          </Text>
        ) : (
          <Paragraph key={index} text={block} />
        )
      )}
    </BaseEmail>
  )
}

export default ResultsEmail
