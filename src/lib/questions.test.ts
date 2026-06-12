import { describe, it, expect } from 'vitest'
import { getScoreRange, QUESTIONS } from '@/lib/questions'

// The quiz is 12 questions scored 1–5, so totals run from 12 to 60.
const MIN_SCORE = QUESTIONS.length * 1
const MAX_SCORE = QUESTIONS.length * 5

describe('getScoreRange band boundaries', () => {
  it('treats the minimum possible score as at risk', () => {
    expect(getScoreRange(MIN_SCORE)).toBe('at_risk')
  })

  it('is at_risk at the top of the at-risk band (29)', () => {
    expect(getScoreRange(29)).toBe('at_risk')
  })

  it('flips to under_strain at 30', () => {
    expect(getScoreRange(30)).toBe('under_strain')
  })

  it('is under_strain at the top of that band (46)', () => {
    expect(getScoreRange(46)).toBe('under_strain')
  })

  it('flips to strong at 47', () => {
    expect(getScoreRange(47)).toBe('strong')
  })

  it('treats the maximum possible score as strong', () => {
    expect(getScoreRange(MAX_SCORE)).toBe('strong')
  })
})

describe('quiz shape', () => {
  it('has 12 questions', () => {
    expect(QUESTIONS).toHaveLength(12)
  })
})
