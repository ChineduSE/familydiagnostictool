-- Resend audience + per-band segment ids for broadcast sending.
-- The audience id is auto-filled on first contact sync; the 3 segment ids are
-- created once in the Resend dashboard and pasted into the admin Settings page.
alter table public.settings
  add column if not exists resend_audience_id text,
  add column if not exists segment_at_risk_id text,
  add column if not exists segment_under_strain_id text,
  add column if not exists segment_strong_id text;
