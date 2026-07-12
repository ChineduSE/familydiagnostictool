import { Resend } from 'resend'

// Returns a configured Resend client, or null when no API key is set
// (local/dev without email configured). Callers must handle the null case
// so a missing key never throws or blocks a quiz submission.
export function createResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

// Verified sender address. Override via EMAIL_FROM once the domain is set up.
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? 'Ibironke Semowo <hello@ibironkeosemowo.com>'

// Where parent replies should land (e.g. Ibironke's Gmail or business inbox).
// When unset, replies fall back to EMAIL_FROM. Set EMAIL_REPLY_TO so replies go
// straight to a real monitored inbox without needing Resend inbound receiving.
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined

// Inbox that receives "wants a session" notifications. Defaults to the reply-to
// inbox (Ibironke's Gmail) so no new env var is required to ship.
export const OWNER_EMAIL =
  process.env.OWNER_EMAIL || process.env.EMAIL_REPLY_TO || EMAIL_FROM
