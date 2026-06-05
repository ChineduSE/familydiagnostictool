import { NextResponse } from 'next/server'
import { QUESTIONS, getScoreRange } from '@/lib/questions'
import { submitSchema } from '@/lib/submit-schema'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const parsed = submitSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 })
  }

  const { firstName, email, phone, marketingConsent, answers } = parsed.data
  const score = answers.reduce((total, value) => total + value, 0)
  const scoreRange = getScoreRange(score)
  const structuredAnswers = QUESTIONS.map((question, index) => ({
    id: question.id,
    section: question.section,
    value: answers[index],
  }))
  const supabase = createSupabaseAdmin()

  if (supabase) {
    const { error } = await supabase.from('assessments').insert({
      first_name: firstName,
      email,
      phone: phone || null,
      score,
      score_range: scoreRange,
      answers: structuredAnswers,
      marketing_consent: marketingConsent,
    })

    if (error) {
      console.error('Failed to save assessment:', error)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, score, scoreRange })
}
