'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CTA_LABEL, buildResultsCopy, SCORE_LABELS } from '@/lib/questions'
import { loadResult } from '@/lib/quiz-store'
import { cn } from '@/lib/utils'
import type { QuizResult, ScoreRange } from '@/types'

const BADGE_VARIANT: Record<ScoreRange, string> = {
  at_risk: 'bg-[#fde2e2] text-[#991b1b]',
  under_strain: 'bg-[#fef3c7] text-[#92400e]',
  strong: 'bg-[#dcfce7] text-[#166534]',
}

type BookState = 'idle' | 'sending' | 'sent' | 'error'

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [bookState, setBookState] = useState<BookState>('idle')

  useEffect(() => {
    const storedResult = loadResult()
    if (!storedResult) {
      router.replace('/')
      return
    }
    setResult(storedResult)
  }, [router])

  if (!result) return null

  async function book() {
    if (!result?.assessmentId || !result?.bookToken) return
    setBookState('sending')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: result.assessmentId, token: result.bookToken }),
      })
      setBookState(res.ok ? 'sent' : 'error')
    } catch {
      setBookState('error')
    }
  }

  const copy = buildResultsCopy(result.scoreRange, Boolean(result.wantsSupport))
    .replaceAll('[First name]', result.firstName)
    .replaceAll('[SCORE]', String(result.score))
  const sections = copy.split('\n\n')

  return (
    <main className="min-h-screen bg-brand-offwhite px-5 py-[52px] text-brand-black">
      <section className="mx-auto w-full max-w-[680px]">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
          Your Family Connection Score
        </p>
        <p className="my-[6px] mb-[10px] font-display text-[64px] leading-none">
          {result.score} / 80
        </p>
        <span
          className={cn(
            'inline-block rounded-full px-[10px] py-[6px] text-xs font-bold',
            BADGE_VARIANT[result.scoreRange]
          )}
        >
          {SCORE_LABELS[result.scoreRange]}
        </span>
        <div className="mt-[30px]">
          {sections.map((section, index) => {
            if (section === '[CTA BUTTON]') {
              if (bookState === 'sent') {
                return (
                  <p
                    key={index}
                    className="my-[10px] mb-[26px] rounded-[10px] bg-[#dcfce7] px-4 py-3 text-[15px] font-medium text-[#166534]"
                  >
                    Your request is on its way to Ibironke. She will reply to your email shortly.
                  </p>
                )
              }
              return (
                <div key={index} className="my-[10px] mb-[26px]">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={book}
                    disabled={bookState === 'sending' || !result.assessmentId}
                  >
                    {bookState === 'sending' ? 'Sending…' : CTA_LABEL}
                  </button>
                  {bookState === 'error' && (
                    <p className="mt-2 text-sm text-[#b91c1c]">Something went wrong. Please try again.</p>
                  )}
                </div>
              )
            }
            return (
              <p key={index} className="mb-[18px] whitespace-pre-line text-[16px] leading-[1.75]">
                {section}
              </p>
            )
          })}
        </div>
      </section>
    </main>
  )
}
