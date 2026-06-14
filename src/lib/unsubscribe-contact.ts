import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'

// Marks a contact unsubscribed in our DB (only when not already, preserving the
// first opt-out time) and best-effort in Resend so broadcasts skip them too.
// Never throws on the Resend side — our DB is the source of truth and the sync
// excludes unsubscribed rows regardless.
export async function unsubscribeContact(
  supabase: SupabaseClient,
  resend: Resend,
  email: string
): Promise<void> {
  await supabase
    .from('contacts')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email)
    .is('unsubscribed_at', null)

  const { data: contact } = await supabase
    .from('contacts')
    .select('resend_contact_id')
    .eq('email', email)
    .maybeSingle()
  if (!contact?.resend_contact_id) return

  const { data: settings } = await supabase
    .from('settings')
    .select('resend_audience_id')
    .eq('id', 1)
    .maybeSingle()
  if (!settings?.resend_audience_id) return

  try {
    await resend.contacts.update({
      audienceId: settings.resend_audience_id,
      id: contact.resend_contact_id,
      unsubscribed: true,
    })
  } catch (err) {
    console.error(`Failed to mark ${email} unsubscribed in Resend:`, err)
  }
}
