'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSession, loadSession, saveSession } from '@/lib/quiz-store'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Only resume into the quiz if the parent has actually answered something.
    // A freshly created (all-null) session still shows the intro.
    const session = loadSession()
    if (session && session.answers.some((answer) => answer !== null)) {
      router.replace('/quiz')
    }
  }, [router])

  function startDiagnosis() {
    saveSession(createSession())
    router.push('/quiz')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-10 text-brand-black">
      <section className="mx-auto flex w-full max-w-[640px] flex-col items-center text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">
          Family Connection Diagnosis™
        </p>
        <h1 className="font-display text-[clamp(36px,7vw,60px)] leading-[1.08]">
          Discover the State of Your Family Connection
        </h1>
        <p className="mt-6 max-w-[540px] text-[17px] leading-[1.7] text-brand-muted">
          Answer 12 honest questions and get a personalised diagnosis of your parent-child
          relationship — with clear guidance on your next steps.
        </p>
        <p className="mt-4 text-[13px] text-brand-muted">Takes about 5 minutes</p>
        <button className="btn-primary mt-8" type="button" onClick={startDiagnosis}>
          Start the Diagnosis
        </button>
      </section>
    </main>
  )
}
