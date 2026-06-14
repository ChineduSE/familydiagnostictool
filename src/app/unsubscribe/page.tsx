import type { ReactNode } from 'react'
import Link from 'next/link'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-8">
      <section className="w-full max-w-[480px] rounded-[18px] bg-brand-white p-[30px] text-center shadow-[0_10px_32px_rgba(26,26,26,0.08)]">
        {children}
      </section>
    </main>
  )
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string; done?: string }>
}) {
  const { e = '', t = '', done } = await searchParams

  if (done) {
    return (
      <Shell>
        <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">You&apos;re unsubscribed</h1>
        <p className="mt-3 text-brand-muted">
          You won&apos;t receive any more emails from us. You can retake the quiz anytime.
        </p>
      </Shell>
    )
  }

  if (!e || !t || !verifyUnsubscribeToken(e, t)) {
    return (
      <Shell>
        <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">Link not valid</h1>
        <p className="mt-3 text-brand-muted">This unsubscribe link is invalid or has expired.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="font-display text-[clamp(24px,5vw,32px)] leading-tight">Unsubscribe?</h1>
      <p className="mt-3 text-brand-muted">
        Stop sending emails to <strong className="text-brand-black">{e}</strong>?
      </p>
      <form method="post" action="/api/unsubscribe" className="mt-6">
        <input type="hidden" name="e" value={e} />
        <input type="hidden" name="t" value={t} />
        <button type="submit" className="btn-primary">Yes, unsubscribe me</button>
      </form>
      <Link href="/" className="mt-4 inline-block text-sm text-brand-muted underline">
        No, keep me subscribed
      </Link>
    </Shell>
  )
}
