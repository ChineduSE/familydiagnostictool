-- 007: session-request notifications
-- session_request_at is stamped when a parent clicks "Book your session" (the CTA
-- that emails Ibironke). Adds a "Requested a session" count to dashboard stats.

alter table public.assessments
  add column if not exists session_request_at timestamptz;

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
    'wants_support_no',  count(*) filter (where wants_support is false),
    'session_requests',  count(*) filter (where session_request_at is not null)
  )
  from public.assessments;
$$;
