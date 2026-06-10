'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearSession, isComplete, loadSession, saveResult } from '@/lib/quiz-store'

type FormErrors = Partial<Record<'firstName' | 'email' | 'api', string>>

export default function GatePage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<number[] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    const session = loadSession()
    if (!session || !isComplete(session)) {
      router.replace('/')
      return
    }

    setAnswers(session.answers as number[])
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!answers) return

    const formData = new FormData(event.currentTarget)
    const firstName = String(formData.get('firstName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    // Opt-out model: taking the quiz subscribes the parent (they can unsubscribe later).
    const marketingConsent = true
    const nextErrors: FormErrors = {}

    if (!firstName) nextErrors.firstName = 'Please enter your first name'
    if (!email) nextErrors.email = 'Please enter your email address'
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Please enter a valid email address'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, email, phone, marketingConsent, answers }),
      })

      if (!response.ok) throw new Error('Submission failed')

      const result = (await response.json()) as {
        score: number
        scoreRange: 'at_risk' | 'under_strain' | 'strong'
      }
      saveResult({ firstName, score: result.score, scoreRange: result.scoreRange })
      clearSession()
      router.push('/results')
    } catch {
      setErrors({ api: 'Something went wrong. Please try again.' })
      setIsSubmitting(false)
    }
  }

  if (!answers) return null

  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-8">
      <section className="w-full max-w-[480px] rounded-[18px] bg-brand-white p-[30px] shadow-[0_10px_32px_rgba(26,26,26,0.08)]">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-gold">
          Almost there
        </p>
        <h2 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">
          Your results are ready
        </h2>
        <p className="mt-[22px] text-[17px] leading-[1.7] text-brand-muted">
          Enter your details below to see your Family Connection Score
        </p>

        <form className="mt-[26px] grid gap-[18px]" onSubmit={handleSubmit}>
          <div className="grid gap-[7px]">
            <label className="text-sm font-bold" htmlFor="firstName">
              First name
            </label>
            <input
              className="field-input"
              id="firstName"
              name="firstName"
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-xs text-[#b91c1c]">{errors.firstName}</p>}
          </div>

          <div className="grid gap-[7px]">
            <label className="text-sm font-bold" htmlFor="email">
              Email address
            </label>
            <input
              className="field-input"
              id="email"
              name="email"
              placeholder="Enter your email address"
              type="email"
            />
            {errors.email && <p className="text-xs text-[#b91c1c]">{errors.email}</p>}
          </div>

          <div className="grid gap-[7px]">
            <label className="text-sm font-bold" htmlFor="phone">
              Phone number
            </label>
            <input
              className="field-input"
              id="phone"
              name="phone"
              placeholder="Enter your phone number (optional)"
              type="tel"
            />
            <p className="text-xs leading-[1.55] text-brand-muted">Optional</p>
          </div>

          <button className="btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Getting your results…' : 'See My Results'}
          </button>
          {errors.api && <p className="text-xs text-[#b91c1c]">{errors.api}</p>}
          <p className="text-xs leading-[1.55] text-brand-muted">
            Your information is safe — we never share your details. By continuing you&apos;ll also
            receive occasional helpful parenting resources by email, and you can unsubscribe anytime.
          </p>
        </form>
      </section>
    </main>
  )
}
