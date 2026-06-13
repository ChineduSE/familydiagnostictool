import { describe, it, expect } from 'vitest'
import { toResendMergeFields, toSampleText } from '@/lib/broadcast-merge'

describe('toResendMergeFields', () => {
  it('replaces [First name] with the Resend merge tag', () => {
    expect(toResendMergeFields('Hi [First name],')).toBe('Hi {{{contact.first_name|there}}},')
  })

  it('replaces every occurrence', () => {
    expect(toResendMergeFields('[First name] [First name]')).toBe(
      '{{{contact.first_name|there}}} {{{contact.first_name|there}}}'
    )
  })

  it('leaves text without the token untouched', () => {
    expect(toResendMergeFields('Hello parents')).toBe('Hello parents')
  })
})

describe('toSampleText', () => {
  it('substitutes a literal sample name for previews/tests', () => {
    expect(toSampleText('Hi [First name],', 'Ada')).toBe('Hi Ada,')
  })

  it('falls back to "there" when no name is given', () => {
    expect(toSampleText('Hi [First name],', '')).toBe('Hi there,')
  })
})
