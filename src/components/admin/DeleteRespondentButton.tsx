'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type State = 'idle' | 'confirm' | 'deleting' | 'error'

export function DeleteRespondentButton({ id, firstName }: { id: string; firstName: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')

  async function remove() {
    setState('deleting')
    try {
      const res = await fetch(`/api/admin/respondents/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setState('error')
        return
      }
      router.push('/admin/respondents')
    } catch {
      setState('error')
    }
  }

  if (state === 'idle' || state === 'error') {
    return (
      <div className="mt-10 border-t border-black/5 pt-6">
        <button
          type="button"
          onClick={() => setState('confirm')}
          className="text-sm font-medium text-[#b91c1c] transition-colors hover:text-[#7f1d1d]"
        >
          Delete respondent
        </button>
        {state === 'error' && (
          <p className="mt-2 text-xs text-[#b91c1c]">Could not delete. Please try again.</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-black/5 pt-6">
      <p className="text-sm text-brand-black">
        Delete {firstName || 'this respondent'} and all their data? This cannot be undone.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={state === 'deleting'}
          className="rounded-md bg-[#b91c1c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7f1d1d] disabled:opacity-60"
        >
          {state === 'deleting' ? 'Deleting…' : 'Yes, delete permanently'}
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          disabled={state === 'deleting'}
          className="text-sm text-brand-muted transition-colors hover:text-brand-black"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
