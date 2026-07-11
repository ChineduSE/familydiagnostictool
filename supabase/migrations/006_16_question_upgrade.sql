-- 006: 16-question upgrade + readiness router
-- Widens scoring to the /80 scale, adds the unscored readiness column,
-- extends dashboard stats with Yes/No readiness counts, and bumps the
-- default WhatsApp message from /60 to /80.

-- 1. Widen the score check for the /80 scale (16 questions × 1..5 = 16..80).
--    The inline check from migration 001 is auto-named assessments_score_check.
alter table public.assessments drop constraint if exists assessments_score_check;
alter table public.assessments
  add constraint assessments_score_check check (score between 16 and 80);

-- 2. Readiness router (Q17), unscored. true = "yes, I'd welcome guided support".
alter table public.assessments
  add column if not exists wants_support boolean;

-- 3. Dashboard stats now include readiness Yes/No counts.
create or replace function public.get_dashboard_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'total',             count(*),
    'at_risk',           count(*) filter (where score_range = 'at_risk'),
    'under_strain',      count(*) filter (where score_range = 'under_strain'),
    'strong',            count(*) filter (where score_range = 'strong'),
    'wants_support_yes', count(*) filter (where wants_support is true),
    'wants_support_no',  count(*) filter (where wants_support is false)
  )
  from public.assessments;
$$;

-- 4. Bump the live WhatsApp message template from /60 to /80 (safe substring swap).
update public.settings
  set whatsapp_message_template = replace(whatsapp_message_template, '/60', '/80')
  where whatsapp_message_template like '%/60%';
