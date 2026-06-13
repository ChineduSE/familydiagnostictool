'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [number, setNumber] = useState('')
  const [template, setTemplate] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)
  const [audienceId, setAudienceId] = useState('')
  const [segRisk, setSegRisk] = useState('')
  const [segStrain, setSegStrain] = useState('')
  const [segStrong, setSegStrong] = useState('')
  const [savingSegments, setSavingSegments] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select(
        'whatsapp_number, whatsapp_message_template, logo_url, logo_storage_path, resend_audience_id, segment_at_risk_id, segment_under_strain_id, segment_strong_id'
      )
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNumber(data.whatsapp_number ?? '')
          setTemplate(data.whatsapp_message_template ?? '')
          setLogoUrl(data.logo_url)
          setLogoPath(data.logo_storage_path)
          setAudienceId(data.resend_audience_id ?? '')
          setSegRisk(data.segment_at_risk_id ?? '')
          setSegStrain(data.segment_under_strain_id ?? '')
          setSegStrong(data.segment_strong_id ?? '')
        }
        setLoading(false)
      })
  }, [supabase])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  async function saveWhatsApp() {
    setSavingWhatsApp(true)
    const { error } = await supabase
      .from('settings')
      .update({
        whatsapp_number: number.replace(/\D/g, ''),
        whatsapp_message_template: template,
      })
      .eq('id', 1)
    setSavingWhatsApp(false)
    showToast(error ? 'Could not save — please try again' : 'WhatsApp settings saved')
  }

  async function saveSegments() {
    setSavingSegments(true)
    const { error } = await supabase
      .from('settings')
      .update({
        resend_audience_id: audienceId.trim() || null,
        segment_at_risk_id: segRisk.trim() || null,
        segment_under_strain_id: segStrain.trim() || null,
        segment_strong_id: segStrong.trim() || null,
      })
      .eq('id', 1)
    setSavingSegments(false)
    showToast(error ? 'Could not save — please try again' : 'Broadcast audience settings saved')
  }

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      showToast('Please upload a PNG or JPG file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('File must be under 2MB')
      return
    }

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      showToast('Upload failed — please try again')
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('logos').getPublicUrl(path)

    const { error } = await supabase
      .from('settings')
      .update({ logo_url: publicUrl, logo_storage_path: path })
      .eq('id', 1)
    if (error) {
      showToast('Could not save the logo — please try again')
      return
    }

    setLogoUrl(`${publicUrl}?t=${Date.now()}`)
    setLogoPath(path)
    showToast('Logo uploaded')
  }

  async function removeLogo() {
    if (logoPath) await supabase.storage.from('logos').remove([logoPath])
    await supabase.from('settings').update({ logo_url: null, logo_storage_path: null }).eq('id', 1)
    setLogoUrl(null)
    setLogoPath(null)
    showToast('Logo removed')
  }

  if (loading) {
    return (
      <div>
        <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Settings</h1>
        <p className="mt-4 text-sm text-brand-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">Settings</h1>

      {/* WhatsApp CTA */}
      <section className="mt-6 rounded-xl border border-black/10 bg-brand-white p-6">
        <h2 className="font-display text-lg">WhatsApp call-to-action</h2>
        <p className="mt-1 text-sm text-brand-muted">
          The button on the results page and email opens your WhatsApp with this message pre-typed.
          Use <code className="rounded bg-black/5 px-1">[First name]</code> and{' '}
          <code className="rounded bg-black/5 px-1">[SCORE]</code> to insert each parent&apos;s name
          and score.
        </p>

        <label className="mt-4 block text-sm font-bold" htmlFor="whatsapp-number">
          WhatsApp number
        </label>
        <input
          id="whatsapp-number"
          className="field-input mt-1"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          placeholder="2348012345678"
        />
        <p className="mt-1 text-xs text-brand-muted">
          International format, digits only (e.g. 234 + the number without the leading 0).
        </p>

        <label className="mt-4 block text-sm font-bold" htmlFor="whatsapp-message">
          Pre-written message
        </label>
        <textarea
          id="whatsapp-message"
          className="field-input mt-1 min-h-[160px] resize-y"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
        />

        <button className="btn-primary mt-4" type="button" onClick={saveWhatsApp} disabled={savingWhatsApp}>
          {savingWhatsApp ? 'Saving…' : 'Save'}
        </button>
      </section>

      {/* Logo */}
      <section className="mt-6 rounded-xl border border-black/10 bg-brand-white p-6">
        <h2 className="font-display text-lg">Broadcast email logo</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Appears at the top of broadcast emails when you choose to include it. PNG or JPG, max 2MB.
        </p>

        {logoUrl ? (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Current logo" className="max-h-16 rounded bg-brand-black p-2" />
            <div className="mt-3 flex gap-3">
              <label className="btn-primary cursor-pointer">
                Replace logo
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoChange} />
              </label>
              <button
                type="button"
                onClick={removeLogo}
                className="rounded-full border border-black/20 px-5 py-3 text-sm font-bold text-brand-black transition-colors hover:bg-black/5"
              >
                Remove logo
              </button>
            </div>
          </div>
        ) : (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-black/25 p-8 text-center transition-colors hover:border-brand-gold">
            <span className="text-sm font-medium">Click to upload</span>
            <span className="mt-1 text-xs text-brand-muted">PNG or JPG, max 2MB</span>
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoChange} />
          </label>
        )}
      </section>

      {/* Broadcast audience (Resend) */}
      <section className="mt-6 rounded-xl border border-black/10 bg-brand-white p-6">
        <h2 className="font-display text-lg">Broadcast audience (Resend)</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Sending to a single score band needs a Resend segment for that band. Create the segments
          once in the Resend dashboard (filtering the <code className="rounded bg-black/5 px-1">score_band</code>{' '}
          property), then paste their ids here. The audience id auto-fills the first time you send.
        </p>

        <label className="mt-4 block text-sm font-bold" htmlFor="audience-id">Resend audience id</label>
        <input id="audience-id" className="field-input mt-1" value={audienceId}
          onChange={(e) => setAudienceId(e.target.value)} placeholder="aud_… (auto-filled on first send)" />

        <label className="mt-4 block text-sm font-bold" htmlFor="seg-risk">Segment id — At risk</label>
        <input id="seg-risk" className="field-input mt-1" value={segRisk} onChange={(e) => setSegRisk(e.target.value)} placeholder="seg_…" />

        <label className="mt-4 block text-sm font-bold" htmlFor="seg-strain">Segment id — Under strain</label>
        <input id="seg-strain" className="field-input mt-1" value={segStrain} onChange={(e) => setSegStrain(e.target.value)} placeholder="seg_…" />

        <label className="mt-4 block text-sm font-bold" htmlFor="seg-strong">Segment id — Strong</label>
        <input id="seg-strong" className="field-input mt-1" value={segStrong} onChange={(e) => setSegStrong(e.target.value)} placeholder="seg_…" />

        <button className="btn-primary mt-4" type="button" onClick={saveSegments} disabled={savingSegments}>
          {savingSegments ? 'Saving…' : 'Save'}
        </button>
      </section>

      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-lg bg-brand-black px-4 py-3 text-sm text-brand-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
