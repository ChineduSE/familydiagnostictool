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

  useEffect(() => {
    const storedSession = loadSession() ?? createSession()
    saveSession(storedSession)
    setSession(storedSession)
  }, [])

  if (!session) return null

  const question = QUESTIONS[session.currentIndex]
  const current = session.currentIndex + 1

  function selectAnswer(value: number) {
    if (!session) return

    const answers = [...session.answers]
    answers[session.currentIndex] = value
    const isLastQuestion = session.currentIndex === QUESTIONS.length - 1
    const nextSession = {
      answers,
      currentIndex: isLastQuestion ? session.currentIndex : session.currentIndex + 1,
    }

    saveSession(nextSession)
    setSession(nextSession)

    window.setTimeout(() => {
      if (isLastQuestion) router.push('/gate')
    }, 240)
  }

  function goBack() {
    if (!session || session.currentIndex === 0) return

    const nextSession = { ...session, currentIndex: session.currentIndex - 1 }
    saveSession(nextSession)
    setSession(nextSession)
  }

  return (
    <main className="min-h-screen bg-brand-black px-5 py-8 text-brand-white">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[680px] flex-col justify-center">
        <div>
          <p className="mb-[10px] text-xs text-white/60">
            Question {current} of {QUESTIONS.length}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-[inherit] bg-brand-gold transition-[width] duration-300"
              style={{ width: `${(current / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
            {question.section}
          </p>
          <p className="my-5 mb-7 text-[clamp(21px,4vw,28px)] leading-[1.48]">{question.text}</p>
          <div className="grid grid-cols-5 gap-[9px] max-[620px]:grid-cols-1">
            {Object.entries(SCALE_LABELS).map(([value, label]) => {
              const numericValue = Number(value)
              const selected = session.answers[session.currentIndex] === numericValue

              return (
                <button
                  className={cn(
                    'min-h-[82px] rounded-[10px] border px-[5px] py-[10px] transition-[transform,color,border-color,background-color] duration-150 active:scale-95',
                    'max-[620px]:flex max-[620px]:min-h-[52px] max-[620px]:items-center max-[620px]:gap-[10px] max-[620px]:px-4 max-[620px]:text-left',
                    selected
                      ? 'border-brand-gold bg-brand-gold text-brand-black'
                      : 'border-white/30 bg-transparent text-brand-white hover:border-brand-gold hover:bg-brand-gold hover:text-brand-black'
                  )}
                  key={value}
                  type="button"
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
              className="mt-[26px] cursor-pointer border-0 bg-transparent p-0 text-white/65 hover:text-white"
              type="button"
              onClick={goBack}
            >
              ← Back
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
