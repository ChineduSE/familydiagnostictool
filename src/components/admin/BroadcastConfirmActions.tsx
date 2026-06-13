'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { broadcastId: string; recipientCount: number; disabledReason?: string }

export function BroadcastConfirmActions({ broadcastId, recipientCount, disabledReason }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function call(path: string) {
    const res = await fetch(path, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data
  }

  async function onTest() {
    setMessage(null)
    setBusy('test')
    try {
      const data = await call(`/api/admin/broadcasts/${broadcastId}/test-send`)
      setMessage(`Test sent to ${data.sentTo}. Check your inbox.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setBusy(null)
    }
  }

  async function onSend() {
    if (!window.confirm(`Send this broadcast to ${recipientCount} parent(s)? This cannot be undone.`)) return
    setMessage(null)
    setBusy('send')
    try {
      await call(`/api/admin/broadcasts/${broadcastId}/send`)
      router.push(`/admin/broadcasts/${broadcastId}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {disabledReason && <p className="text-sm text-[#991b1b]">{disabledReason}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onTest} disabled={busy !== null}
          className="rounded-full border border-black/20 px-5 py-3 text-sm font-bold disabled:opacity-60">
          {busy === 'test' ? 'Sending test…' : 'Send a test to myself'}
        </button>
        <button type="button" onClick={onSend} disabled={busy !== null || !!disabledReason}
          className="btn-primary disabled:opacity-60">
          {busy === 'send' ? 'Sending…' : `Send to ${recipientCount} parent${recipientCount === 1 ? '' : 's'}`}
        </button>
      </div>
      {message && <p className="text-sm text-brand-muted">{message}</p>}
    </div>
  )
}
