import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { render } from '@react-email/components'
import { ResultsEmail } from '@/emails/ResultsEmail'
import { SUPPORT_CONFIRMATION, CTA_LABEL } from '@/lib/questions'
import type { ScoreRange } from '@/types'

const bands: ScoreRange[] = ['at_risk', 'under_strain', 'strong']

async function html(scoreRange: ScoreRange, wantsSupport: boolean) {
  return render(createElement(ResultsEmail, { firstName: 'Sarah', score: 50, scoreRange, wantsSupport }))
}

describe('results email support confirmation', () => {
  for (const band of bands) {
    it(`${band}: Yes parents see the "Ibironke will reach out" note, not a booking button`, async () => {
      const out = await html(band, true)
      expect(out).toContain('Ibironke will reach out to you personally')
      expect(out).not.toContain(CTA_LABEL)
    })
    it(`${band}: No parents see neither the note nor a booking button`, async () => {
      const out = await html(band, false)
      expect(out).not.toContain(SUPPORT_CONFIRMATION.slice(0, 30))
      expect(out).not.toContain(CTA_LABEL)
    })
  }
})
