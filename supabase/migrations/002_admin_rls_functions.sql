-- Family Connection Diagnosis — admin auth, functions, triggers, RLS, storage
-- Run AFTER 001_initial_schema.sql.
--
-- Context: 001 creates the tables and ENABLES row level security on them but
-- defines no policies (so only the service-role key can read/write). This
-- migration adds the admin account table, helper functions, updated_at
-- triggers, the admin read/write policies, and the logos storage bucket.

-- ============================================================
-- ADMIN PROFILES (extends auth.users)
-- ============================================================
create table public.admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.admin_profiles is
  'One row per admin user. Extends auth.users. is_active controls dashboard access.';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at on any row update.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- True when the current auth user is an active admin. security definer lets it
-- read admin_profiles regardless of that table's RLS (avoids policy recursion).
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- Dashboard summary: total quiz completions + per-band counts (from assessments).
create or replace function public.get_dashboard_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'total',        count(*),
    'at_risk',      count(*) filter (where score_range = 'at_risk'),
    'under_strain', count(*) filter (where score_range = 'under_strain'),
    'strong',       count(*) filter (where score_range = 'strong')
  )
  from public.assessments;
$$;

-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================
create trigger trg_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.handle_updated_at();

create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.handle_updated_at();

create trigger trg_broadcasts_updated_at
  before update on public.broadcasts
  for each row execute function public.handle_updated_at();

create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Service-role key (used by API routes) bypasses RLS entirely — that is how
-- the public quiz writes contacts/assessments. These policies grant the
-- authenticated admin read access (and broadcast/settings write access).
-- ============================================================

-- admin_profiles (RLS not yet enabled — this is a new table)
alter table public.admin_profiles enable row level security;

create policy "admin_profiles: read own"
  on public.admin_profiles for select to authenticated
  using (id = auth.uid());

-- contacts
create policy "contacts: admin read"
  on public.contacts for select to authenticated
  using (public.is_active_admin());

-- assessments
create policy "assessments: admin read"
  on public.assessments for select to authenticated
  using (public.is_active_admin());

-- email_messages
create policy "email_messages: admin read"
  on public.email_messages for select to authenticated
  using (public.is_active_admin());

-- email_events
create policy "email_events: admin read"
  on public.email_events for select to authenticated
  using (public.is_active_admin());

-- broadcasts (managed from the admin composer)
create policy "broadcasts: admin read"
  on public.broadcasts for select to authenticated
  using (public.is_active_admin());

create policy "broadcasts: admin insert"
  on public.broadcasts for insert to authenticated
  with check (public.is_active_admin());

create policy "broadcasts: admin update"
  on public.broadcasts for update to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "broadcasts: admin delete drafts"
  on public.broadcasts for delete to authenticated
  using (public.is_active_admin() and status = 'draft');

-- settings (single row, id = 1)
create policy "settings: admin read"
  on public.settings for select to authenticated
  using (public.is_active_admin());

create policy "settings: admin update"
  on public.settings for update to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ============================================================
-- STORAGE — logos bucket (public read, admin write)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: admin upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: public read"
  on storage.objects for select to public
  using (bucket_id = 'logos');
