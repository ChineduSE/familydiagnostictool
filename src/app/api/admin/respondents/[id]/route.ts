import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/require-admin'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// Deletes a whole person (by the assessment's email): their email_messages, all
// their assessments, and their contact row. email_events are left as-is (Resend
// webhook logs keyed by resend_email_id, not respondent-linked).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
  }

  const { data: assessment, error: loadError } = await supabase
    .from('assessments')
    .select('id, email, contact_id')
    .eq('id', id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 })
  }
  if (!assessment) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const { email, contact_id } = assessment

  // Every submission this person made (they may have taken the quiz more than once).
  const { data: theirAssessments } = await supabase
    .from('assessments')
    .select('id')
    .eq('email', email)
  const assessmentIds = (theirAssessments ?? []).map((a) => a.id)

  // FK-safe order: children (email_messages) first, then assessments, then contact.
  if (assessmentIds.length > 0) {
    const { error } = await supabase.from('email_messages').delete().in('assessment_id', assessmentIds)
    if (error) return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
  if (contact_id) {
    const { error } = await supabase.from('email_messages').delete().eq('contact_id', contact_id)
    if (error) return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  const delAssessments = await supabase.from('assessments').delete().eq('email', email)
  if (delAssessments.error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  const delContact = await supabase.from('contacts').delete().eq('email', email)
  if (delContact.error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
