import { describe, it, expect } from 'vitest'
import { getScoreRange, QUESTIONS, READINESS_QUESTION } from '@/lib/questions'

// The quiz is 16 questions scored 1–5, so totals run from 16 to 80.
const MIN_SCORE = QUESTIONS.length * 1
const MAX_SCORE = QUESTIONS.length * 5

describe('getScoreRange band boundaries', () => {
  it('treats the minimum possible score as at risk', () => {
    expect(getScoreRange(MIN_SCORE)).toBe('at_risk')
  })

  it('is at_risk at the top of the at-risk band (39)', () => {
    expect(getScoreRange(39)).toBe('at_risk')
  })

  it('flips to under_strain at 40', () => {
    expect(getScoreRange(40)).toBe('under_strain')
  })

  it('is under_strain at the top of that band (61)', () => {
    expect(getScoreRange(61)).toBe('under_strain')
  })

  it('flips to strong at 62', () => {
    expect(getScoreRange(62)).toBe('strong')
  })

  it('treats the maximum possible score as strong', () => {
    expect(getScoreRange(MAX_SCORE)).toBe('strong')
  })
})

describe('quiz shape', () => {
  it('has 16 questions', () => {
    expect(QUESTIONS).toHaveLength(16)
  })

  it('does not include the readiness question in the scored set', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(ids).not.toContain('Q17')
    expect(ids).not.toContain('readiness')
  })

  it('exposes a readiness question with two options', () => {
    expect(READINESS_QUESTION.options).toHaveLength(2)
    expect(READINESS_QUESTION.options.map((o) => o.value)).toEqual([true, false])
  })
})
