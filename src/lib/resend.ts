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
