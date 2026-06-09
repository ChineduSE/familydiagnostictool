// Builds a wa.me click-to-chat URL with a pre-filled, personalised message.
// [First name] and [SCORE] in the template are replaced per parent so the
// message opens already typed in their WhatsApp — they just hit send.

type WhatsAppVars = {
  firstName: string
  score: number
}

export function buildWhatsAppUrl(
  rawNumber: string | null | undefined,
  template: string | null | undefined,
  vars: WhatsAppVars
): string {
  const number = (rawNumber ?? '').replace(/\D/g, '')
  if (!number) return ''

  const message = (template ?? '')
    .replaceAll('[First name]', vars.firstName)
    .replaceAll('[SCORE]', String(vars.score))

  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${query}`
}
