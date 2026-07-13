'use client'

import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function BookConfirm({
  assessmentId,
  token,
  firstName,
}: {
  assessmentId: string
  token: string
  firstName: string
}) {
  const [state, setState] = useState<State>('idle')

  async function send() {
    setState('sending')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, token }),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <>
        <h1 className="font-display text-2xl">Your request is on its way</h1>
        <p className="mt-3 text-brand-muted">
          Ibironke will reach out to you by email shortly. Thank you{firstName ? `, ${firstName}` : ''}.
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="font-display text-2xl">Book your session</h1>
      <p className="mt-3 text-brand-muted">
        {firstName ? `${firstName}, ` : ''}send your request to Ibironke and she will reach out to you by
        email.
      </p>
      <button className="btn-primary mt-6" type="button" onClick={send} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send my request to Ibironke'}
      </button>
      {state === 'error' && (
        <p className="mt-3 text-sm text-[#b91c1c]">Something went wrong. Please try again.</p>
      )}
    </>
  )
}
