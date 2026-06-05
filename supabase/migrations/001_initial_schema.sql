-- Family Connection Diagnosis - initial schema

create extension if not exists "pgcrypto";

create type public.score_range_enum as enum ('at_risk', 'under_strain', 'strong');
create type public.broadcast_status_enum as enum ('draft', 'scheduled', 'sent', 'cancelled', 'failed');
create type public.email_kind_enum as enum ('results', 'broadcast');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null unique,
  phone text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  unsubscribed_at timestamptz,
  resend_contact_id text,
  latest_score_range public.score_range_enum,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  first_name text not null,
  email text not null,
  phone text,
  score smallint not null check (score between 12 and 60),
  score_range public.score_range_enum not null,
  answers jsonb not null,
  marketing_consent boolean not null default false,
  submitted_at timestamptz not null default now()
);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  resend_broadcast_id text unique,
  subject text not null,
  body_html text not null,
  cta_label text,
  cta_url text,
  include_logo boolean not null default false,
  audience_type text not null check (
    audience_type in ('all', 'at_risk', 'under_strain', 'strong', 'individuals')
  ),
  audience_ids uuid[],
  status public.broadcast_status_enum not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text unique,
  contact_id uuid references public.contacts(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  broadcast_id uuid references public.broadcasts(id) on delete set null,
  kind public.email_kind_enum not null,
  recipient_email text not null,
  delivered_at timestamptz,
  first_opened_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_event_id text unique,
  resend_email_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.settings (
  id integer primary key default 1 check (id = 1),
  whatsapp_cta_url text,
  logo_url text,
  logo_storage_path text,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1);

create index idx_assessments_submitted_at on public.assessments(submitted_at desc);
create index idx_assessments_score_range on public.assessments(score_range);
create index idx_email_messages_resend_email_id on public.email_messages(resend_email_id);
create index idx_email_events_resend_email_id on public.email_events(resend_email_id);

alter table public.contacts enable row level security;
alter table public.assessments enable row level security;
alter table public.broadcasts enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_events enable row level security;
alter table public.settings enable row level security;
