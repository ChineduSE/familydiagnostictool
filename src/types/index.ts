// ── Quiz domain ─────────────────────────────────────────────
export type ScoreRange = 'at_risk' | 'under_strain' | 'strong'

export type QuizAnswer = {
  id: string
  section: string
  value: number
}

export type QuizSession = {
  answers: Array<number | null>
  currentIndex: number
}

export type QuizResult = {
  firstName: string
  score: number
  scoreRange: ScoreRange
}

// ── Enums shared with the database ──────────────────────────
export type BroadcastStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed'
export type EmailKind = 'results' | 'broadcast'
export type AudienceType = 'all' | 'at_risk' | 'under_strain' | 'strong' | 'individuals'

// ── Database row shapes (snake_case, as returned by supabase-js) ──
export type Contact = {
  id: string
  first_name: string
  email: string
  phone: string | null
  marketing_consent: boolean
  marketing_consent_at: string | null
  unsubscribed_at: string | null
  resend_contact_id: string | null
  latest_score_range: ScoreRange | null
  created_at: string
  updated_at: string
}

export type Assessment = {
  id: string
  contact_id: string | null
  first_name: string
  email: string
  phone: string | null
  score: number
  score_range: ScoreRange
  answers: QuizAnswer[]
  marketing_consent: boolean
  submitted_at: string
}

export type Broadcast = {
  id: string
  resend_broadcast_id: string | null
  subject: string
  body_html: string
  cta_label: string | null
  cta_url: string | null
  include_logo: boolean
  audience_type: AudienceType
  audience_ids: string[] | null
  status: BroadcastStatus
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type EmailMessage = {
  id: string
  resend_email_id: string | null
  contact_id: string | null
  assessment_id: string | null
  broadcast_id: string | null
  kind: EmailKind
  recipient_email: string
  delivered_at: string | null
  first_opened_at: string | null
  clicked_at: string | null
  failed_at: string | null
  created_at: string
}

export type EmailEvent = {
  id: string
  resend_event_id: string | null
  resend_email_id: string
  event_type: string
  occurred_at: string
  raw_payload: unknown
  created_at: string
}

export type Settings = {
  id: number
  whatsapp_cta_url: string | null
  logo_url: string | null
  logo_storage_path: string | null
  updated_at: string
}

export type AdminProfile = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DashboardStats = {
  total: number
  at_risk: number
  under_strain: number
  strong: number
}
