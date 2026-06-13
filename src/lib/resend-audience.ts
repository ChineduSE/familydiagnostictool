import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'

// Ensures a Resend audience exists, returning its id. Creates one (named for the
// project) and persists the id to settings the first time.
export async function ensureAudience(
  supabase: SupabaseClient,
  resend: Resend
): Promise<string> {
  const { data: settings } = await supabase
    .from('settings')
    .select('resend_audience_id')
    .eq('id', 1)
    .maybeSingle()

  if (settings?.resend_audience_id) return settings.resend_audience_id

  const { data, error } = await resend.audiences.create({ name: 'Family Connection parents' })
  if (error || !data) throw new Error(error?.message ?? 'Failed to create Resend audience')

  await supabase.from('settings').update({ resend_audience_id: data.id }).eq('id', 1)
  return data.id
}

export type SyncResult = { synced: number; failed: number }

// Upserts every non-unsubscribed contact into the Resend audience with their
// first name and current score band, storing resend_contact_id back. Idempotent.
export async function syncConsentedContacts(
  supabase: SupabaseClient,
  resend: Resend
): Promise<SyncResult> {
  const audienceId = await ensureAudience(supabase, resend)

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, email, first_name, latest_score_range, resend_contact_id, unsubscribed_at')
    .is('unsubscribed_at', null)

  if (error || !contacts) throw new Error(error?.message ?? 'Failed to load contacts')

  let synced = 0
  let failed = 0

  for (const contact of contacts) {
    const properties = { score_band: contact.latest_score_range ?? '' }
    try {
      if (contact.resend_contact_id) {
        await resend.contacts.update({
          audienceId,
          id: contact.resend_contact_id,
          firstName: contact.first_name ?? undefined,
          unsubscribed: false,
          properties,
        })
      } else {
        const { data, error: createError } = await resend.contacts.create({
          audienceId,
          email: contact.email,
          firstName: contact.first_name ?? undefined,
          unsubscribed: false,
          properties,
        })
        if (createError || !data) throw new Error(createError?.message ?? 'create failed')
        await supabase.from('contacts').update({ resend_contact_id: data.id }).eq('id', contact.id)
      }
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
