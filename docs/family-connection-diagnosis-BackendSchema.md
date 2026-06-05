# Backend Schema Document
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™
**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Version:** 1.0
**Date:** June 2026
**Companion documents:** PRD v1.0 · AppFlow v1.0 · TechStack v1.0 · Content Guidelines v1.0

---

## How to read this document

This document defines the complete backend architecture for the application. It covers:

1. Database tables and column definitions
2. Relationships and foreign keys
3. Authentication and authorisation flows
4. Row Level Security (RLS) policies
5. Database functions and triggers
6. Key API endpoints
7. Supabase Storage configuration
8. Environment and infrastructure notes

All SQL is written for **PostgreSQL 15** as provided by Supabase. Run all migrations in the order they appear in this document. Do not reorder them — foreign key dependencies are sequence-sensitive.

---

## 1. Database design decisions

Before the schema, these are the key decisions made and why:

| Decision | Choice | Reason |
|---|---|---|
| Admin table | Forward-compatible for multiple admins | Ibironke may add a VA. Single `is_active` flag controls access. No invite UI needed now — just the table structure. |
| Email tracking | Individual event rows + denormalised counts | Individual rows power the per-respondent email history view. Denormalised counts on `broadcasts` power fast dashboard reads without aggregation queries. |
| Answer storage | Structured jsonb per answer (id, section, value) | Enables section-level analytics queries ("which section scores lowest") without rebuilding context. Flat integer arrays cannot answer this. |
| Settings table | Single-row pattern (`id = 1` always) | One set of global settings, never more. Simpler than a key-value store for this use case. |
| Soft deletes | Not used | This app has no delete flows for respondents or broadcasts in v1. Hard deletes are fine. Drafts are hard-deleted explicitly by Ibironke. |
| Timestamps | All tables use `timestamptz` | Timezone-aware. Critical for scheduled broadcast logic comparing `scheduled_at` to `now()`. |

---

## 2. Schema overview (entity relationship summary)

```
auth.users (Supabase managed)
    │
    └── admin_profiles (1:1) ── one profile per Supabase auth user

respondents
    │
    ├── email_events (1:many) ── delivery/open events per respondent
    │       │
    │       └── broadcasts (many:1) ── each event linked to a broadcast
    │
    └── broadcast_recipients (many:many via broadcasts)

broadcasts
    │
    ├── email_events (1:many)
    └── broadcast_recipients (1:many) ── denormalised audience snapshot

settings (singleton — always id = 1)
```

---

## 3. Database tables

---

### 3.1 `admin_profiles`

Extends Supabase's `auth.users` table. One row per admin account. Currently one active row. Designed to support multiple admins without schema changes.

```sql
create table public.admin_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.admin_profiles is
  'One row per admin user. Extends auth.users. is_active controls dashboard access.';
```

**Column notes:**

| Column | Notes |
|---|---|
| `id` | Same UUID as `auth.users.id`. Not auto-generated — inserted explicitly on account creation. |
| `email` | Stored here for convenience. Must match `auth.users.email`. |
| `is_active` | Set to `false` to revoke access without deleting the auth account. |
| `updated_at` | Updated automatically by trigger (see Section 7). |

---

### 3.2 `respondents`

One row per completed quiz submission. Created when the gate form is submitted and the API route processes it successfully.

```sql
create type public.score_range_enum as enum (
  'at_risk',
  'under_strain',
  'strong'
);

create table public.respondents (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  email           text not null,
  phone           text,
  score           smallint not null check (score >= 12 and score <= 60),
  score_range     public.score_range_enum not null,
  answers         jsonb not null,
  submitted_at    timestamptz not null default now()
);

comment on table public.respondents is
  'One row per completed quiz submission. answers stores structured per-question data.';

comment on column public.respondents.answers is
  'Structured jsonb array. Each element: { "id": "Q1", "section": "Communication patterns", "value": 4 }';

comment on column public.respondents.score is
  'Sum of all 12 answer values. Range: 12 (all Never) to 60 (all Always).';
```

**`answers` jsonb structure:**

Each element in the array represents one answered question. The full array always has 12 elements.

```json
[
  { "id": "Q1",  "section": "Communication patterns",  "value": 4 },
  { "id": "Q2",  "section": "Communication patterns",  "value": 3 },
  { "id": "Q3",  "section": "Emotional availability",  "value": 5 },
  { "id": "Q4",  "section": "Emotional availability",  "value": 2 },
  { "id": "Q5",  "section": "Device habits",            "value": 3 },
  { "id": "Q6",  "section": "Device habits",            "value": 4 },
  { "id": "Q7",  "section": "Family routines",          "value": 2 },
  { "id": "Q8",  "section": "Family routines",          "value": 3 },
  { "id": "Q9",  "section": "Parent-child bonding",     "value": 4 },
  { "id": "Q10", "section": "Parent-child bonding",     "value": 5 },
  { "id": "Q11", "section": "Behavior triggers",        "value": 3 },
  { "id": "Q12", "section": "Behavior triggers",        "value": 4 }
]
```

**Indexes:**

```sql
create index idx_respondents_score_range on public.respondents(score_range);
create index idx_respondents_submitted_at on public.respondents(submitted_at desc);
create index idx_respondents_email on public.respondents(email);
```

---

### 3.3 `broadcasts`

One row per email broadcast — draft, scheduled, or sent. Contains the full email content, audience config, send timing, and denormalised delivery counts.

```sql
create type public.broadcast_status_enum as enum (
  'draft',
  'scheduled',
  'sent'
);

create table public.broadcasts (
  id                  uuid primary key default gen_random_uuid(),
  subject             text not null,
  body_html           text not null,
  cta_label           text,
  cta_url             text,
  include_logo        boolean not null default false,
  audience_type       text not null check (
                        audience_type in ('all', 'at_risk', 'under_strain', 'strong', 'individuals')
                      ),
  audience_ids        uuid[],
  status              public.broadcast_status_enum not null default 'draft',
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  recipient_count     integer not null default 0,
  delivered_count     integer not null default 0,
  opened_count        integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.broadcasts is
  'One row per broadcast. Denormalised counts for fast dashboard reads.';

comment on column public.broadcasts.audience_type is
  'Determines how audience is resolved. "individuals" uses audience_ids array.';

comment on column public.broadcasts.audience_ids is
  'Only populated when audience_type = individuals. Array of respondent UUIDs.';

comment on column public.broadcasts.recipient_count is
  'Set when broadcast is sent. Total number of emails attempted.';

comment on column public.broadcasts.delivered_count is
  'Incremented by webhook handler when Resend fires a delivered event.';

comment on column public.broadcasts.opened_count is
  'Incremented by webhook handler when Resend fires an opened event. De-duplicated per respondent.';
```

**Indexes:**

```sql
create index idx_broadcasts_status on public.broadcasts(status);
create index idx_broadcasts_scheduled_at on public.broadcasts(scheduled_at)
  where status = 'scheduled';
create index idx_broadcasts_created_at on public.broadcasts(created_at desc);
```

> The partial index on `scheduled_at` only indexes rows where `status = 'scheduled'` — exactly what the Cron job queries. This keeps it small and fast.

---

### 3.4 `broadcast_recipients`

Denormalised snapshot of exactly who was sent a specific broadcast. Written at send time. One row per respondent per broadcast.

```sql
create table public.broadcast_recipients (
  id              uuid primary key default gen_random_uuid(),
  broadcast_id    uuid not null references public.broadcasts(id) on delete cascade,
  respondent_id   uuid not null references public.respondents(id) on delete cascade,
  email           text not null,
  resend_email_id text,
  created_at      timestamptz not null default now(),

  unique(broadcast_id, respondent_id)
);

comment on table public.broadcast_recipients is
  'Snapshot of recipients at send time. resend_email_id links Resend events back to this row.';

comment on column public.broadcast_recipients.resend_email_id is
  'The email ID returned by Resend on send. Used to match webhook events back to this recipient.';

comment on column public.broadcast_recipients.email is
  'Stored at send time. Preserves the address used even if respondent email changes.';
```

**Indexes:**

```sql
create index idx_broadcast_recipients_broadcast_id
  on public.broadcast_recipients(broadcast_id);

create index idx_broadcast_recipients_respondent_id
  on public.broadcast_recipients(respondent_id);

create index idx_broadcast_recipients_resend_email_id
  on public.broadcast_recipients(resend_email_id)
  where resend_email_id is not null;
```

---

### 3.5 `email_events`

One row per tracked email event (delivered or opened). Written by the Resend webhook handler. Covers both instant results emails and broadcast emails.

```sql
create type public.email_event_type_enum as enum (
  'delivered',
  'opened'
);

create table public.email_events (
  id                  uuid primary key default gen_random_uuid(),
  broadcast_id        uuid references public.broadcasts(id) on delete set null,
  respondent_id       uuid references public.respondents(id) on delete set null,
  resend_email_id     text not null,
  event_type          public.email_event_type_enum not null,
  occurred_at         timestamptz not null,
  raw_payload         jsonb,
  created_at          timestamptz not null default now()
);

comment on table public.email_events is
  'One row per tracked email event. broadcast_id is null for instant results emails.';

comment on column public.email_events.broadcast_id is
  'Null for instant results emails (not tied to a broadcast).';

comment on column public.email_events.resend_email_id is
  'The Resend email ID from the webhook payload. Used to correlate events to recipients.';

comment on column public.email_events.raw_payload is
  'Full Resend webhook payload stored for debugging. Not displayed in UI.';
```

**Indexes:**

```sql
create index idx_email_events_broadcast_id
  on public.email_events(broadcast_id)
  where broadcast_id is not null;

create index idx_email_events_respondent_id
  on public.email_events(respondent_id)
  where respondent_id is not null;

create index idx_email_events_resend_email_id
  on public.email_events(resend_email_id);
```

---

### 3.6 `settings`

Singleton table. Always exactly one row with `id = 1`. Stores application-level configuration that Ibironke can update from the admin settings page.

```sql
create table public.settings (
  id                  integer primary key default 1 check (id = 1),
  whatsapp_cta_url    text,
  logo_url            text,
  logo_storage_path   text,
  updated_at          timestamptz not null default now()
);

comment on table public.settings is
  'Singleton settings table. Always exactly one row (id = 1). Never insert a second row.';

comment on column public.settings.logo_url is
  'Public URL of the logo in Supabase Storage. Used in email templates.';

comment on column public.settings.logo_storage_path is
  'Internal storage path (e.g. logos/logo.png). Used for deletion when logo is replaced.';

-- Seed the single row immediately
insert into public.settings (id) values (1);
```

---

## 4. Complete migration (run order)

Run these in sequence. Each step depends on the previous.

```sql
-- Step 1: Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Step 2: Enums
create type public.score_range_enum as enum ('at_risk', 'under_strain', 'strong');
create type public.broadcast_status_enum as enum ('draft', 'scheduled', 'sent');
create type public.email_event_type_enum as enum ('delivered', 'opened');

-- Step 3: Tables (dependency order)
-- admin_profiles depends on auth.users
-- respondents has no dependencies
-- broadcasts has no dependencies
-- broadcast_recipients depends on broadcasts + respondents
-- email_events depends on broadcasts + respondents
-- settings has no dependencies

-- Step 4: Indexes (after tables)

-- Step 5: Triggers (after tables)

-- Step 6: RLS policies (after tables)

-- Step 7: Seed data
insert into public.settings (id) values (1);
```

---

## 5. Authentication and authorisation

### 5.1 Authentication architecture

Supabase Auth is the sole authentication system. No custom auth is implemented.

| Actor | Auth method | Session type |
|---|---|---|
| Ibironke (admin) | Email + password | Supabase session cookie, managed by `@supabase/ssr` |
| Respondent (parent) | None | No auth — public user, no account |

### 5.2 Admin auth flow

```
Ibironke visits /admin/*
        │
        └── middleware.ts runs on every /admin/* request
              │
              ├── calls supabase.auth.getUser()
              │
              ├── [no session] ──► redirect to /admin/login
              │
              └── [session exists]
                    │
                    ├── checks admin_profiles where id = user.id AND is_active = true
                    │
                    ├── [no profile or is_active = false] ──► redirect to /admin/login
                    │
                    └── [valid active profile] ──► allow request through
```

**Middleware implementation (`src/middleware.ts`):**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (isAdminRoute && !isLoginPage) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Verify active admin profile
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!profile?.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Redirect authenticated admin away from login page
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

### 5.3 Admin account creation

There is no self-registration UI. The admin account is created once during setup via the Supabase dashboard or a one-time setup script.

**One-time setup script (`scripts/create-admin.ts`):**

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role required for admin creation
)

async function createAdmin() {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'hello@ibironkeosemowo.com', // replace before running
    password: 'REPLACE_WITH_SECURE_PASSWORD',
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('Failed to create auth user:', authError)
    return
  }

  // 2. Create admin profile
  const { error: profileError } = await supabase
    .from('admin_profiles')
    .insert({
      id: authData.user.id,
      email: authData.user.email,
      full_name: 'Ibironke Semowo',
      is_active: true,
    })

  if (profileError) {
    console.error('Failed to create admin profile:', profileError)
    return
  }

  console.log('Admin created successfully:', authData.user.email)
}

createAdmin()
```

> Run once with `npx ts-node scripts/create-admin.ts`. Delete the script after running. Never commit credentials.

### 5.4 Public (respondent) access

Respondents are anonymous. They interact with two public surfaces:

- `POST /api/submit` — submits quiz answers, triggers results email
- `GET /results` — reads score from query params or sessionStorage (no DB read required for the page itself)

No Supabase session is created for respondents. The API route uses the **service role key** server-side to insert into `respondents` (bypassing RLS on insert, which is intentional — see RLS section).

---

## 6. Row Level Security (RLS) policies

RLS is enabled on all public tables. The principle is simple:

- **Respondents and the public** can do nothing directly via the client
- **Admins** (authenticated Supabase users with an active `admin_profile`) can read everything they need
- **Service role** (used only in API routes) bypasses RLS entirely — this is Supabase's default behaviour and is intentional for server-side operations

### 6.1 Enable RLS on all tables

```sql
alter table public.admin_profiles    enable row level security;
alter table public.respondents       enable row level security;
alter table public.broadcasts        enable row level security;
alter table public.broadcast_recipients enable row level security;
alter table public.email_events      enable row level security;
alter table public.settings          enable row level security;
```

### 6.2 Helper function: `is_active_admin()`

Used in all admin-facing RLS policies to avoid repetition.

```sql
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
    and is_active = true
  );
$$;
```

> `security definer` means this function runs with the privileges of its creator (the superuser), not the calling user. This is necessary because RLS policies on `admin_profiles` would otherwise prevent this function from reading the table during the policy check itself — a chicken-and-egg problem. This is the standard Supabase pattern for this use case.

### 6.3 `admin_profiles` policies

```sql
-- Admins can read their own profile only
create policy "admin_profiles: admin can read own profile"
  on public.admin_profiles
  for select
  to authenticated
  using (id = auth.uid());

-- No insert/update/delete via client — managed via service role only
```

### 6.4 `respondents` policies

```sql
-- Admins can read all respondents
create policy "respondents: admin can read all"
  on public.respondents
  for select
  to authenticated
  using (public.is_active_admin());

-- No client-side insert — inserts happen via service role in /api/submit
-- No client-side update or delete in v1
```

### 6.5 `broadcasts` policies

```sql
-- Admins can read all broadcasts
create policy "broadcasts: admin can read all"
  on public.broadcasts
  for select
  to authenticated
  using (public.is_active_admin());

-- Admins can insert broadcasts (composer)
create policy "broadcasts: admin can insert"
  on public.broadcasts
  for insert
  to authenticated
  with check (public.is_active_admin());

-- Admins can update broadcasts (editing drafts, saving)
create policy "broadcasts: admin can update"
  on public.broadcasts
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Admins can delete draft broadcasts only
create policy "broadcasts: admin can delete drafts"
  on public.broadcasts
  for delete
  to authenticated
  using (public.is_active_admin() and status = 'draft');
```

### 6.6 `broadcast_recipients` policies

```sql
-- Admins can read all recipients
create policy "broadcast_recipients: admin can read all"
  on public.broadcast_recipients
  for select
  to authenticated
  using (public.is_active_admin());

-- No client-side insert — written by service role at send time
```

### 6.7 `email_events` policies

```sql
-- Admins can read all email events
create policy "email_events: admin can read all"
  on public.email_events
  for select
  to authenticated
  using (public.is_active_admin());

-- No client-side insert — written by service role in webhook handler
```

### 6.8 `settings` policies

```sql
-- Admins can read settings
create policy "settings: admin can read"
  on public.settings
  for select
  to authenticated
  using (public.is_active_admin());

-- Admins can update settings (the single row)
create policy "settings: admin can update"
  on public.settings
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- No insert via client — the single row is seeded in migration
-- No delete via client
```

---

## 7. Database functions and triggers

### 7.1 `updated_at` auto-update trigger

Automatically updates `updated_at` to `now()` on any row update. Applied to all tables that have an `updated_at` column.

```sql
-- Reusable trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to admin_profiles
create trigger trg_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.handle_updated_at();

-- Apply to broadcasts
create trigger trg_broadcasts_updated_at
  before update on public.broadcasts
  for each row execute function public.handle_updated_at();

-- Apply to settings
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();
```

### 7.2 `sync_admin_email` trigger

Keeps `admin_profiles.email` in sync if the email is ever changed in `auth.users`.

```sql
create or replace function public.sync_admin_email()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.admin_profiles
  set email = new.email,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger trg_sync_admin_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_admin_email();
```

### 7.3 `increment_broadcast_counts` function

Called by the webhook handler API route to atomically increment delivered or opened counts on the broadcast row. Using a function prevents race conditions when multiple webhook events arrive simultaneously.

```sql
create or replace function public.increment_broadcast_count(
  p_broadcast_id  uuid,
  p_column        text  -- 'delivered_count' or 'opened_count'
)
returns void
language plpgsql
security definer
as $$
begin
  if p_column = 'delivered_count' then
    update public.broadcasts
    set delivered_count = delivered_count + 1
    where id = p_broadcast_id;
  elsif p_column = 'opened_count' then
    update public.broadcasts
    set opened_count = opened_count + 1
    where id = p_broadcast_id;
  end if;
end;
$$;
```

### 7.4 `get_respondents_by_range` function

Returns respondent IDs and emails for a given audience type. Used by the broadcast send logic to resolve audience before firing emails.

```sql
create or replace function public.get_broadcast_audience(
  p_audience_type  text,
  p_audience_ids   uuid[] default null
)
returns table (
  respondent_id  uuid,
  email          text,
  first_name     text
)
language plpgsql
security definer
as $$
begin
  return query
  select r.id, r.email, r.first_name
  from public.respondents r
  where r.email is not null
    and r.email != ''
    and (
      p_audience_type = 'all'
      or (p_audience_type = 'at_risk'      and r.score_range = 'at_risk')
      or (p_audience_type = 'under_strain' and r.score_range = 'under_strain')
      or (p_audience_type = 'strong'       and r.score_range = 'strong')
      or (p_audience_type = 'individuals'  and r.id = any(p_audience_ids))
    );
end;
$$;
```

### 7.5 `get_dashboard_stats` function

Returns all dashboard summary stats in a single query. Avoids multiple round-trips from the dashboard home page.

```sql
create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  select json_build_object(
    'total',        count(*),
    'at_risk',      count(*) filter (where score_range = 'at_risk'),
    'under_strain', count(*) filter (where score_range = 'under_strain'),
    'strong',       count(*) filter (where score_range = 'strong')
  )
  into v_result
  from public.respondents;

  return v_result;
end;
$$;
```

---

## 8. Key API endpoints

All API routes live in `src/app/api/`. All routes use the **service role key** (via server-side Supabase client) to bypass RLS. RLS protects the client — the server is trusted.

---

### 8.1 `POST /api/submit`

**Purpose:** Receives completed quiz submission, saves respondent, sends instant results email.

**Auth:** None (public endpoint)

**Request body:**
```ts
{
  firstName: string       // required
  email: string           // required, validated
  phone?: string          // optional
  score: number           // 12–60, validated
  scoreRange: 'at_risk' | 'under_strain' | 'strong'  // validated
  answers: Array<{
    id: string            // Q1–Q12
    section: string
    value: number         // 1–5
  }>
}
```

**Server logic:**
```
1. Validate request body with Zod schema
2. Insert row into respondents
3. Fetch whatsapp_cta_url from settings (id = 1)
4. Select correct React Email template by scoreRange
5. Send email via Resend with respondent data + cta url
6. Return { success: true, scoreRange }
```

**Response (success):**
```json
{ "success": true, "scoreRange": "under_strain" }
```

**Response (error):**
```json
{ "success": false, "error": "Validation failed" }
```

**Zod schema (`src/lib/schemas/submit.ts`):**
```ts
import { z } from 'zod'

export const submitSchema = z.object({
  firstName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  score: z.number().int().min(12).max(60),
  scoreRange: z.enum(['at_risk', 'under_strain', 'strong']),
  answers: z.array(z.object({
    id: z.string(),
    section: z.string(),
    value: z.number().int().min(1).max(5),
  })).length(12),
})
```

---

### 8.2 `POST /api/broadcasts/send`

**Purpose:** Resolves audience, fires emails via Resend, records recipients, updates broadcast status.

**Auth:** Called by Cron job (verified by `CRON_SECRET` header) or by admin confirm action (verified by Supabase session).

**Request body:**
```ts
{ broadcastId: string }
```

**Server logic:**
```
1. Verify caller (CRON_SECRET header or valid admin session)
2. Fetch broadcast by id — confirm status is 'scheduled' or being sent now
3. Call get_broadcast_audience(audience_type, audience_ids)
4. For each recipient:
   a. Render broadcast email template with recipient data
   b. Send via Resend
   c. Insert row into broadcast_recipients with resend_email_id
5. Update broadcast:
   - status → 'sent'
   - sent_at → now()
   - recipient_count → count of recipients attempted
6. Return { success: true, sent: count }
```

**Note on error handling:** If Resend fails for a subset of recipients, those failures are logged but do not roll back the entire broadcast. The recipient row is still inserted with `resend_email_id = null` to indicate failure.

---

### 8.3 `POST /api/webhooks/resend`

**Purpose:** Receives delivery and open events from Resend. Updates email tracking data.

**Auth:** Verifies Resend webhook signature header before processing.

**Handled event types:**
- `email.delivered`
- `email.opened`

**Server logic:**
```
1. Verify Resend signature (svix header verification)
2. Parse event type and resend_email_id from payload
3. Look up broadcast_recipients row by resend_email_id
4. Insert row into email_events
5. If event = delivered:
   - call increment_broadcast_count(broadcast_id, 'delivered_count')
6. If event = opened AND no prior opened event exists for this resend_email_id:
   - call increment_broadcast_count(broadcast_id, 'opened_count')
   (de-duplication prevents counting multiple opens per recipient)
7. Return 200 OK
```

**Signature verification:**
```ts
import { Webhook } from 'svix'

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
const payload = wh.verify(rawBody, {
  'svix-id': headers.get('svix-id')!,
  'svix-timestamp': headers.get('svix-timestamp')!,
  'svix-signature': headers.get('svix-signature')!,
})
```

> Add `svix` to dependencies: `npm install svix`

---

### 8.4 `GET /api/cron/send-broadcasts`

**Purpose:** Scheduled job. Finds all broadcasts due to send and fires them.

**Auth:** `Authorization: Bearer CRON_SECRET` header (set in `vercel.json` cron config).

**Server logic:**
```
1. Verify CRON_SECRET header
2. Query broadcasts where status = 'scheduled' AND scheduled_at <= now()
3. For each result:
   - POST to /api/broadcasts/send with { broadcastId }
4. Return { fired: count }
```

**Cron schedule:** Every minute (`* * * * *` in `vercel.json`).

---

### 8.5 `GET /api/admin/respondents`

**Purpose:** Returns paginated respondents list for admin dashboard.

**Auth:** Supabase session (admin only — middleware protects all `/admin` routes, but API routes verify session independently).

**Query params:**
```
?range=all|at_risk|under_strain|strong
&sort=submitted_at_desc|submitted_at_asc|score_desc|score_asc
&page=1
&limit=50
```

**Response:**
```json
{
  "data": [ ...respondent rows... ],
  "count": 47,
  "page": 1,
  "totalPages": 1
}
```

---

### 8.6 `PATCH /api/admin/settings`

**Purpose:** Updates the single settings row.

**Auth:** Supabase session (admin only).

**Request body (partial — send only fields being updated):**
```ts
{
  whatsapp_cta_url?: string
  logo_url?: string
  logo_storage_path?: string
}
```

**Server logic:**
```
1. Verify admin session
2. Validate fields with Zod
3. Update settings where id = 1
4. Return updated settings row
```

---

## 9. Supabase Storage configuration

### 9.1 Bucket setup

One storage bucket is required.

| Bucket name | Public | Purpose |
|---|---|---|
| `logos` | Yes (public) | Stores Ibironke's logo for use in broadcast emails |

```sql
-- Run in Supabase Storage SQL or via dashboard
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true);
```

### 9.2 Storage RLS policies

```sql
-- Admins can upload to logos bucket
create policy "logos: admin can upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and public.is_active_admin()
  );

-- Admins can update (replace) logos
create policy "logos: admin can update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'logos'
    and public.is_active_admin()
  );

-- Admins can delete logos
create policy "logos: admin can delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and public.is_active_admin()
  );

-- Anyone can read logos (needed for email rendering)
create policy "logos: public can read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'logos');
```

### 9.3 Logo upload flow

```
Admin selects file in settings page
        │
        ├── Client validates: PNG or JPG, max 2MB
        │
        ├── Upload to Supabase Storage: logos/logo.[ext]
        │   (replaces existing file at same path)
        │
        ├── Get public URL:
        │   supabase.storage.from('logos').getPublicUrl('logo.[ext]')
        │
        └── PATCH /api/admin/settings with:
              { logo_url: publicUrl, logo_storage_path: 'logo.[ext]' }
```

---

## 10. Database relationship diagram

```
auth.users
    │ (1:1)
    ▼
admin_profiles
    id (PK = auth.users.id)
    email
    full_name
    is_active


respondents ──────────────────────────────────────────────────────────┐
    id (PK)                                                            │
    first_name                                                         │
    email                                                              │
    phone                                                              │
    score                                                              │
    score_range                                                        │
    answers (jsonb)                                                    │
    submitted_at                                                       │
         │                                                             │
         │ (1:many)                                                    │ (1:many)
         ▼                                                             ▼
email_events                                              broadcast_recipients
    id (PK)                                                   id (PK)
    broadcast_id (FK → broadcasts, nullable)                  broadcast_id (FK → broadcasts)
    respondent_id (FK → respondents, nullable)                respondent_id (FK → respondents)
    resend_email_id                                           email
    event_type                                                resend_email_id
    occurred_at                                               created_at
    raw_payload
         ▲
         │ (1:many)
broadcasts ───────────────────────────────────────────────────────────┘
    id (PK)
    subject
    body_html
    cta_label
    cta_url
    include_logo
    audience_type
    audience_ids (uuid[])
    status
    scheduled_at
    sent_at
    recipient_count
    delivered_count
    opened_count
    created_at
    updated_at


settings (singleton)
    id = 1 (always)
    whatsapp_cta_url
    logo_url
    logo_storage_path
    updated_at
```

---

## 11. Environment variables required by the backend

| Variable | Used in | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Public — safe in client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase client, middleware | Public — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | All API routes | **Server only. Never expose to client.** Bypasses RLS. |
| `RESEND_API_KEY` | `/api/submit`, `/api/broadcasts/send` | Server only |
| `RESEND_WEBHOOK_SECRET` | `/api/webhooks/resend` | Server only. Get from Resend dashboard after adding webhook URL. |
| `CRON_SECRET` | `/api/cron/send-broadcasts` | Server only. Any long random string. Set in Vercel env vars. |

---

## 12. Security checklist

- [ ] RLS enabled on all six public tables
- [ ] `is_active_admin()` function uses `security definer` to avoid RLS recursion
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never prefixed with `NEXT_PUBLIC_`
- [ ] Resend webhook verified with svix signature on every call
- [ ] Cron endpoint verified with `CRON_SECRET` bearer token on every call
- [ ] Admin middleware checks both session existence AND active profile on every request
- [ ] No admin routes accessible without a valid `admin_profiles` row
- [ ] Storage bucket RLS allows public reads (for email logo rendering) but admin-only writes
- [ ] `get_broadcast_audience` and other `security definer` functions are owned by a superuser role
- [ ] Zod validation on all API route inputs — never trust raw request body
- [ ] `raw_payload` column stores webhook payloads for debugging but is never surfaced in the UI

---

## 13. Complete SQL migration file

Save as `supabase/migrations/001_initial_schema.sql` and run via `supabase db push` or the Supabase dashboard SQL editor.

```sql
-- ============================================================
-- Family Connection Diagnosis™ — Initial Schema Migration
-- Run order: extensions → enums → tables → indexes →
--            functions → triggers → RLS → seed
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.score_range_enum as enum (
  'at_risk', 'under_strain', 'strong'
);

create type public.broadcast_status_enum as enum (
  'draft', 'scheduled', 'sent'
);

create type public.email_event_type_enum as enum (
  'delivered', 'opened'
);

-- ============================================================
-- TABLES
-- ============================================================

create table public.admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.respondents (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null,
  email        text not null,
  phone        text,
  score        smallint not null check (score >= 12 and score <= 60),
  score_range  public.score_range_enum not null,
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);

create table public.broadcasts (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  body_html        text not null,
  cta_label        text,
  cta_url          text,
  include_logo     boolean not null default false,
  audience_type    text not null check (
                     audience_type in ('all','at_risk','under_strain','strong','individuals')
                   ),
  audience_ids     uuid[],
  status           public.broadcast_status_enum not null default 'draft',
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  recipient_count  integer not null default 0,
  delivered_count  integer not null default 0,
  opened_count     integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.broadcast_recipients (
  id              uuid primary key default gen_random_uuid(),
  broadcast_id    uuid not null references public.broadcasts(id) on delete cascade,
  respondent_id   uuid not null references public.respondents(id) on delete cascade,
  email           text not null,
  resend_email_id text,
  created_at      timestamptz not null default now(),
  unique(broadcast_id, respondent_id)
);

create table public.email_events (
  id              uuid primary key default gen_random_uuid(),
  broadcast_id    uuid references public.broadcasts(id) on delete set null,
  respondent_id   uuid references public.respondents(id) on delete set null,
  resend_email_id text not null,
  event_type      public.email_event_type_enum not null,
  occurred_at     timestamptz not null,
  raw_payload     jsonb,
  created_at      timestamptz not null default now()
);

create table public.settings (
  id                  integer primary key default 1 check (id = 1),
  whatsapp_cta_url    text,
  logo_url            text,
  logo_storage_path   text,
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_respondents_score_range   on public.respondents(score_range);
create index idx_respondents_submitted_at  on public.respondents(submitted_at desc);
create index idx_respondents_email         on public.respondents(email);

create index idx_broadcasts_status         on public.broadcasts(status);
create index idx_broadcasts_scheduled_at   on public.broadcasts(scheduled_at)
  where status = 'scheduled';
create index idx_broadcasts_created_at     on public.broadcasts(created_at desc);

create index idx_broadcast_recipients_broadcast_id
  on public.broadcast_recipients(broadcast_id);
create index idx_broadcast_recipients_respondent_id
  on public.broadcast_recipients(respondent_id);
create index idx_broadcast_recipients_resend_email_id
  on public.broadcast_recipients(resend_email_id)
  where resend_email_id is not null;

create index idx_email_events_broadcast_id
  on public.email_events(broadcast_id)
  where broadcast_id is not null;
create index idx_email_events_respondent_id
  on public.email_events(respondent_id)
  where respondent_id is not null;
create index idx_email_events_resend_email_id
  on public.email_events(resend_email_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_active_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.sync_admin_email()
returns trigger language plpgsql security definer as $$
begin
  update public.admin_profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create or replace function public.increment_broadcast_count(
  p_broadcast_id uuid,
  p_column text
)
returns void language plpgsql security definer as $$
begin
  if p_column = 'delivered_count' then
    update public.broadcasts
    set delivered_count = delivered_count + 1
    where id = p_broadcast_id;
  elsif p_column = 'opened_count' then
    update public.broadcasts
    set opened_count = opened_count + 1
    where id = p_broadcast_id;
  end if;
end;
$$;

create or replace function public.get_broadcast_audience(
  p_audience_type text,
  p_audience_ids uuid[] default null
)
returns table (respondent_id uuid, email text, first_name text)
language plpgsql security definer as $$
begin
  return query
  select r.id, r.email, r.first_name
  from public.respondents r
  where r.email is not null and r.email != ''
    and (
      p_audience_type = 'all'
      or (p_audience_type = 'at_risk'      and r.score_range = 'at_risk')
      or (p_audience_type = 'under_strain' and r.score_range = 'under_strain')
      or (p_audience_type = 'strong'       and r.score_range = 'strong')
      or (p_audience_type = 'individuals'  and r.id = any(p_audience_ids))
    );
end;
$$;

create or replace function public.get_dashboard_stats()
returns json language plpgsql security definer as $$
declare v_result json;
begin
  select json_build_object(
    'total',        count(*),
    'at_risk',      count(*) filter (where score_range = 'at_risk'),
    'under_strain', count(*) filter (where score_range = 'under_strain'),
    'strong',       count(*) filter (where score_range = 'strong')
  )
  into v_result
  from public.respondents;
  return v_result;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger trg_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.handle_updated_at();

create trigger trg_broadcasts_updated_at
  before update on public.broadcasts
  for each row execute function public.handle_updated_at();

create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

create trigger trg_sync_admin_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_admin_email();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.admin_profiles        enable row level security;
alter table public.respondents           enable row level security;
alter table public.broadcasts            enable row level security;
alter table public.broadcast_recipients  enable row level security;
alter table public.email_events          enable row level security;
alter table public.settings              enable row level security;

-- admin_profiles
create policy "admin_profiles: admin can read own"
  on public.admin_profiles for select to authenticated
  using (id = auth.uid());

-- respondents
create policy "respondents: admin can read all"
  on public.respondents for select to authenticated
  using (public.is_active_admin());

-- broadcasts
create policy "broadcasts: admin can read all"
  on public.broadcasts for select to authenticated
  using (public.is_active_admin());

create policy "broadcasts: admin can insert"
  on public.broadcasts for insert to authenticated
  with check (public.is_active_admin());

create policy "broadcasts: admin can update"
  on public.broadcasts for update to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "broadcasts: admin can delete drafts"
  on public.broadcasts for delete to authenticated
  using (public.is_active_admin() and status = 'draft');

-- broadcast_recipients
create policy "broadcast_recipients: admin can read all"
  on public.broadcast_recipients for select to authenticated
  using (public.is_active_admin());

-- email_events
create policy "email_events: admin can read all"
  on public.email_events for select to authenticated
  using (public.is_active_admin());

-- settings
create policy "settings: admin can read"
  on public.settings for select to authenticated
  using (public.is_active_admin());

create policy "settings: admin can update"
  on public.settings for update to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Storage
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

create policy "logos: admin can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: admin can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: admin can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.is_active_admin());

create policy "logos: public can read"
  on storage.objects for select to public
  using (bucket_id = 'logos');

-- ============================================================
-- SEED
-- ============================================================

insert into public.settings (id) values (1);
```
