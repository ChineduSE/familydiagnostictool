import { describe, it, expect } from 'vitest'
import { submitSchema } from '@/lib/submit-schema'
import { QUESTIONS } from '@/lib/questions'

const validAnswers = Array.from({ length: QUESTIONS.length }, () => 3)

const validPayload = {
  firstName: 'Ada',
  email: 'ada@example.com',
  phone: '08012345678',
  marketingConsent: true,
  answers: validAnswers,
}

describe('submitSchema', () => {
  it('accepts a valid submission', () => {
    expect(submitSchema.safeParse(validPayload).success).toBe(true)
  })

  it('accepts a submission with no phone (optional)', () => {
    const { phone, ...withoutPhone } = validPayload
    void phone
    expect(submitSchema.safeParse(withoutPhone).success).toBe(true)
  })

  it('defaults marketingConsent to true when omitted (opt-out model)', () => {
    const { marketingConsent, ...withoutConsent } = validPayload
    void marketingConsent
    const result = submitSchema.safeParse(withoutConsent)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.marketingConsent).toBe(true)
  })

  it('rejects an empty first name', () => {
    expect(submitSchema.safeParse({ ...validPayload, firstName: '' }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(submitSchema.safeParse({ ...validPayload, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects the wrong number of answers', () => {
    expect(
      submitSchema.safeParse({ ...validPayload, answers: validAnswers.slice(0, -1) }).success
    ).toBe(false)
  })

  it('rejects an answer below 1', () => {
    const answers = [...validAnswers]
    answers[0] = 0
    expect(submitSchema.safeParse({ ...validPayload, answers }).success).toBe(false)
  })

  it('rejects an answer above 5', () => {
    const answers = [...validAnswers]
    answers[0] = 6
    expect(submitSchema.safeParse({ ...validPayload, answers }).success).toBe(false)
  })

  it('rejects a non-integer answer', () => {
    const answers = [...validAnswers]
    answers[0] = 3.5
    expect(submitSchema.safeParse({ ...validPayload, answers }).success).toBe(false)
  })
})
