import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'

// Wraps every admin panel page (everything under /admin except /admin/login)
// in the sidebar shell. Middleware already guards these routes; this is a
// second check and supplies the logged-in admin's email to the shell.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  return <AdminShell adminEmail={user.email ?? ''}>{children}</AdminShell>
}
