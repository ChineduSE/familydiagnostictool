import { BroadcastComposer } from '@/components/admin/BroadcastComposer'

export default function NewBroadcastPage() {
  return (
    <div>
      <h1 className="font-display text-[clamp(29px,5vw,40px)] leading-tight">New broadcast</h1>
      <p className="mt-2 text-sm text-brand-muted">Write your email, choose who receives it, and save it as a draft.</p>
      <div className="mt-6">
        <BroadcastComposer />
      </div>
    </div>
  )
}
