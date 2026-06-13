import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resend } from 'resend'

const SCORE_BAND_PROPERTY = 'score_band'

// Resend rejects setting a contact property that isn't defined on the account
// ("One or more properties do not exist", 422). Define score_band once,
// idempotently, before syncing contacts that carry it — otherwise every contact
// create fails and the audience ends up empty.
export async function ensureScoreBandProperty(resend: Resend): Promise<void> {
  const { data } = await resend.contactProperties.list()
  if (data?.data?.some((property) => property.key === SCORE_BAND_PROPERTY)) return

  const { error } = await resend.contactProperties.create({
    key: SCORE_BAND_PROPERTY,
    type: 'string',
  })
  if (error) throw new Error(`Failed to create the score_band contact property: ${error.message}`)
}

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
  await ensureScoreBandProperty(resend)

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
        // Already in the audience: refresh name/band/unsubscribed in Resend.
        // No Supabase write-back is needed — resend_contact_id is already stored.
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
    } catch (err) {
      // Stay resilient: one bad contact must not abort the whole sync. Log which
      // contact and why so failures are diagnosable in production.
      console.error(`Failed to sync contact ${contact.id} to Resend audience:`, err)
      failed++
    }
  }

  return { synced, failed }
}
