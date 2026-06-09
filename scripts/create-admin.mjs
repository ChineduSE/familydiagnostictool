// One-time admin account creation.
//
// Usage:
//   node --env-file=.env.local scripts/create-admin.mjs <email> <password> "[full name]"
//
// Creates a Supabase auth user (email pre-confirmed) and the matching
// admin_profiles row so the account can log in to the dashboard. Run it once
// per admin you want to add. Safe to re-run with a new email for a second admin.

import { createClient } from '@supabase/supabase-js'

const [, , email, password, ...nameParts] = process.argv
const fullName = nameParts.join(' ') || null

if (!email || !password) {
  console.error(
    'Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> "[full name]"'
  )
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (error || !data?.user) {
  console.error('Failed to create auth user:', error?.message ?? 'unknown error')
  process.exit(1)
}

const { error: profileError } = await supabase.from('admin_profiles').insert({
  id: data.user.id,
  email: data.user.email,
  full_name: fullName,
  is_active: true,
})

if (profileError) {
  console.error('Auth user created, but admin_profiles insert failed:', profileError.message)
  process.exit(1)
}

console.log('✓ Admin created and active:', data.user.email)
