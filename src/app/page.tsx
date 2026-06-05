'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSession, loadSession, saveSession } from '@/lib/quiz-store'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (loadSession()) router.replace('/quiz')
  }, [router])

  function startDiagnosis() {
    saveSession(createSession())
    router.push('/quiz')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-black px-5 py-8 text-brand-white">
      <section className="mx-auto w-full max-w-[680px]">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
          Family Connection Diagnosis™
        </p>
        <h1 className="font-display text-[clamp(40px,8vw,64px)] leading-[1.06]">
          Discover the State of Your Family Connection
        </h1>
        <p className="mt-[22px] text-[17px] leading-[1.7] text-white/70">
          Answer 12 honest questions and get a personalised diagnosis of your parent-child
          relationship — with clear guidance on your next steps.
        </p>
        <p className="mt-[18px] text-[13px] text-white/55">Takes about 5 minutes</p>
        <button className="btn-primary mt-[30px]" type="button" onClick={startDiagnosis}>
          Start the Diagnosis
        </button>
      </section>
    </main>
  )
}
