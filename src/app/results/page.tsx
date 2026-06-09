'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CTA_LABEL, RESULTS_COPY, SCORE_LABELS } from '@/lib/questions'
import { loadResult } from '@/lib/quiz-store'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'
import type { QuizResult, ScoreRange } from '@/types'

const PAGE_VARIANT: Record<ScoreRange, string> = {
  at_risk: 'bg-brand-black text-brand-white',
  under_strain: 'bg-brand-offwhite text-brand-black',
  strong: 'bg-brand-offwhite text-brand-black',
}

const BADGE_VARIANT: Record<ScoreRange, string> = {
  at_risk: 'bg-[rgba(153,27,27,0.26)] text-[#fecaca]',
  under_strain: 'bg-[#fef3c7] text-[#92400e]',
  strong: 'bg-[#dcfce7] text-[#166534]',
}

// Only ever link out to http(s) targets — never javascript:/data: schemes.
function safeHttpUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : ''
}

function renderCopy(result: QuizResult, ctaUrl: string) {
  const safeCtaUrl = safeHttpUrl(ctaUrl)
  const copy = RESULTS_COPY[result.scoreRange]
    .replaceAll('[First name]', result.firstName)
    .replaceAll('[SCORE]', String(result.score))
  const sections = copy.split('\n\n')

  return sections.map((section, index) => {
    if (section === '[CTA BUTTON]') {
      return safeCtaUrl ? (
        <a
          className="btn-primary my-[10px] mb-[26px]"
          href={safeCtaUrl}
          key={index}
          rel="noreferrer"
          target="_blank"
        >
          {CTA_LABEL}
        </a>
      ) : null
    }

    return (
      <p key={index} className="mb-[18px] whitespace-pre-line text-[16px] leading-[1.75]">
        {section}
      </p>
    )
  })
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [ctaUrl, setCtaUrl] = useState('')

  useEffect(() => {
    const storedResult = loadResult()
    if (!storedResult) {
      router.replace('/')
      return
    }

    setResult(storedResult)
    fetch('/api/settings')
      .then((response) => response.json())
      .then((settings: { whatsappNumber?: string; whatsappMessageTemplate?: string }) => {
        setCtaUrl(
          buildWhatsAppUrl(settings.whatsappNumber, settings.whatsappMessageTemplate, {
            firstName: storedResult.firstName,
            score: storedResult.score,
          })
        )
      })
      .catch(() => setCtaUrl(''))
  }, [router])

  if (!result) return null

  return (
    <main className={cn('min-h-screen px-5 py-[52px]', PAGE_VARIANT[result.scoreRange])}>
      <section className="mx-auto w-full max-w-[680px]">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
          Your Family Connection Score
        </p>
        <p className="my-[6px] mb-[10px] font-display text-[64px] leading-none">
          {result.score} / 60
        </p>
        <span
          className={cn(
            'inline-block rounded-full px-[10px] py-[6px] text-xs font-bold',
            BADGE_VARIANT[result.scoreRange]
          )}
        >
          {SCORE_LABELS[result.scoreRange]}
        </span>
        <div className="mt-[30px]">{renderCopy(result, ctaUrl)}</div>
        <p className="mt-9 text-xs leading-[1.55] opacity-65">
          This is a guided self-assessment for reflection and education. It is not a clinical
          diagnosis.
        </p>
      </section>
    </main>
  )
}
