// Personalization token handling for broadcasts. The human-facing token is
// "[First name]". For real broadcast sends it becomes Resend's merge tag (which
// Resend substitutes per contact). For test/preview sends, which go through the
// transactional API and do NOT merge, it becomes a literal sample name.

const TOKEN = /\[First name\]/g
const RESEND_FIRST_NAME = '{{{contact.first_name|there}}}'

export function toResendMergeFields(text: string): string {
  return text.replace(TOKEN, RESEND_FIRST_NAME)
}

export function toSampleText(text: string, name: string): string {
  return text.replace(TOKEN, name.trim() || 'there')
}
