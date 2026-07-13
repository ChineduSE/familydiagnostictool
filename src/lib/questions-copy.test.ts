import { describe, it, expect } from 'vitest'
import { buildResultsCopy, buildEmailBody } from '@/lib/questions'
import type { ScoreRange } from '@/types'

const bands: ScoreRange[] = ['at_risk', 'under_strain', 'strong']

describe('buildResultsCopy', () => {
  for (const band of bands) {
    it(`${band}: yes keeps the button, drops the lead marker`, () => {
      const copy = buildResultsCopy(band, true)
      expect(copy).toContain('[CTA BUTTON]')
      expect(copy).not.toContain('[CTA LEAD]')
    })
    it(`${band}: no drops both the button and the lead marker`, () => {
      const copy = buildResultsCopy(band, false)
      expect(copy).not.toContain('[CTA BUTTON]')
      expect(copy).not.toContain('[CTA LEAD]')
    })
  }
  it('no version keeps the warm closing and drops the session pitch', () => {
    const copy = buildResultsCopy('at_risk', false)
    expect(copy).toContain("Don't let that courage go to waste")
    expect(copy).not.toContain('The next step is a 1-on-1 Family Connection Session')
  })
})

describe('buildEmailBody', () => {
  for (const band of bands) {
    it(`${band}: yes keeps the button, no drops it, neither leaks the lead marker`, () => {
      expect(buildEmailBody(band, true)).toContain('[CTA BUTTON]')
      expect(buildEmailBody(band, true)).not.toContain('[CTA LEAD]')
      expect(buildEmailBody(band, false)).not.toContain('[CTA BUTTON]')
      expect(buildEmailBody(band, false)).not.toContain('[CTA LEAD]')
    })
  }
  it('at_risk no version drops both pitch paragraphs but keeps the sign-off', () => {
    const copy = buildEmailBody('at_risk', false)
    expect(copy).not.toContain("I'd love to help you map this out personally")
    expect(copy).not.toContain('A 1-on-1 Family Connection Session')
    expect(copy).toContain('Warmly,')
  })
})
