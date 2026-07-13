import { verifyBookingToken } from '@/lib/booking-token'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { BookConfirm } from './BookConfirm'

export const dynamic = 'force-dynamic'

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; t?: string }>
}) {
  const { a, t } = await searchParams
  const valid = Boolean(a && t && verifyBookingToken(a, t))

  let firstName = ''
  if (valid && a) {
    const supabase = createSupabaseAdmin()
    if (supabase) {
      const { data } = await supabase
        .from('assessments')
        .select('first_name')
        .eq('id', a)
        .maybeSingle()
      firstName = data?.first_name ?? ''
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-offwhite px-5 py-10 text-brand-black">
      <section className="w-full max-w-[480px] rounded-[18px] bg-brand-white p-[30px] text-center shadow-[0_10px_32px_rgba(26,26,26,0.08)]">
        {valid && a && t ? (
          <BookConfirm assessmentId={a} token={t} firstName={firstName} />
        ) : (
          <>
            <h1 className="font-display text-2xl">This link has expired</h1>
            <p className="mt-3 text-brand-muted">
              Please retake the assessment or reply to your results email to reach Ibironke.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
