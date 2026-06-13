'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS, SCALE_LABELS } from '@/lib/questions'
import { createSession, loadSession, saveSession } from '@/lib/quiz-store'
import { cn } from '@/lib/utils'
import type { QuizSession } from '@/types'

export default function QuizPage() {
  const router = useRouter()
  const [session, setSession] = useState<QuizSession | null>(null)
  // True during the brief pause after a click, so the selected answer shows its
  // fill before we advance — and so a second click can't register mid-transition.
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    const storedSession = loadSession() ?? createSession()
    saveSession(storedSession)
    setSession(storedSession)
  }, [])

  if (!session) return null

  const question = QUESTIONS[session.currentIndex]
  const current = session.currentIndex + 1

  function selectAnswer(value: number) {
    if (!session || advancing) return

    const answers = [...session.answers]
    answers[session.currentIndex] = value
    const currentIndex = session.currentIndex
    const isLastQuestion = currentIndex === QUESTIONS.length - 1

    // 1. Show the selection on the CURRENT question (gold fill) right away.
    const answeredSession = { ...session, answers }
    saveSession(answeredSession)
    setSession(answeredSession)
    setAdvancing(true)

    // 2. After a short beat so the fill is visible, advance (or finish).
    window.setTimeout(() => {
      if (isLastQuestion) {
        router.push('/gate')
        return
      }
      const nextSession = { answers, currentIndex: currentIndex + 1 }
      saveSession(nextSession)
      setSession(nextSession)
      setAdvancing(false)
    }, 300)
  }

  function goBack() {
    if (!session || session.currentIndex === 0) return

    const nextSession = { ...session, currentIndex: session.currentIndex - 1 }
    saveSession(nextSession)
    setSession(nextSession)
  }

  return (
    <main className="min-h-screen bg-brand-offwhite px-5 py-8 text-brand-black">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[640px] flex-col justify-center text-center">
        {/* Section header — stands out above the progress bar */}
        <h2 className="mb-6 font-display text-[clamp(22px,4.5vw,32px)] font-semibold text-brand-black">
          {question.section}
        </h2>

        {/* Progress */}
        <div className="mx-auto w-full max-w-[440px]">
          <p className="mb-[10px] text-xs font-medium text-brand-muted">
            Question {current} of {QUESTIONS.length}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-[inherit] bg-brand-gold transition-[width] duration-300"
              style={{ width: `${(current / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <p className="mx-auto mb-7 mt-8 max-w-[560px] text-[clamp(19px,3.5vw,26px)] leading-[1.5]">
          {question.text}
        </p>

        {/* Answer scale */}
        <div className="mx-auto grid w-full max-w-[560px] grid-cols-5 gap-[9px] max-[620px]:grid-cols-1">
          {Object.entries(SCALE_LABELS).map(([value, label]) => {
            const numericValue = Number(value)
            const selected = session.answers[session.currentIndex] === numericValue

            return (
              <button
                className={cn(
                  'min-h-[82px] rounded-[10px] border px-[5px] py-[10px] transition-[transform,border-color,background-color] duration-150 active:scale-95',
                  'max-[620px]:flex max-[620px]:min-h-[52px] max-[620px]:items-center max-[620px]:justify-center max-[620px]:gap-[10px] max-[620px]:px-4',
                  selected
                    ? 'border-brand-gold bg-brand-gold text-brand-black'
                    : 'border-[#d9d4cb] bg-brand-white text-brand-black hover:border-brand-gold hover:bg-brand-gold'
                )}
                key={value}
                type="button"
                disabled={advancing}
                onClick={() => selectAnswer(numericValue)}
              >
                <span className="mb-2 block text-[19px] font-bold max-[620px]:mb-0">{value}</span>
                <span className="block text-[11px]">{label}</span>
              </button>
            )
          })}
        </div>

        {session.currentIndex > 0 && (
          <button
            className="mx-auto mt-7 cursor-pointer border-0 bg-transparent p-0 text-brand-muted transition-colors hover:text-brand-black"
            type="button"
            onClick={goBack}
          >
            ← Back
          </button>
        )}
      </section>
    </main>
  )
}
