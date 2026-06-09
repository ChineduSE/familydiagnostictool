'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email) {
      setError('Please enter your email')
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('Incorrect email or password')
        setIsSubmitting(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-black px-5 py-8">
      <section className="w-full max-w-sm rounded-2xl bg-brand-white p-8 shadow-xl">
        <p className="mb-6 text-sm font-bold text-brand-black">
          Family Connection Diagnosis — Admin
        </p>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-[7px]">
            <label className="text-sm font-bold" htmlFor="email">
              Email address
            </label>
            <input className="field-input" id="email" name="email" type="email" autoComplete="email" />
          </div>

          <div className="grid gap-[7px]">
            <label className="text-sm font-bold" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                className="field-input pr-16"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-muted hover:text-brand-black"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button className="btn-primary mt-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
          {error && <p className="text-xs text-[#b91c1c]">{error}</p>}
        </form>
      </section>
    </main>
  )
}
