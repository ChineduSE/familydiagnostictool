'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/respondents', label: 'Respondents' },
  { href: '/admin/broadcasts', label: 'Broadcasts' },
  { href: '/admin/settings', label: 'Settings' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ adminEmail, children }: { adminEmail: string; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-black p-5 text-brand-white">
      <p className="mb-8 text-sm font-bold">Family Connection Diagnosis</p>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              'border-l-2 px-4 py-2 text-sm transition-colors',
              isActive(pathname, item.href)
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-white/70 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="mb-2 truncate text-xs text-white/50">{adminEmail}</p>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="text-sm text-white/70 transition-colors hover:text-brand-gold disabled:opacity-50"
        >
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-offwhite">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="flex items-center gap-3 bg-brand-black p-4 text-brand-white lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="text-2xl leading-none"
        >
          ≡
        </button>
        <span className="text-sm font-bold">Family Connection Diagnosis</span>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">{sidebar}</div>
        </div>
      )}

      <main className="p-4 lg:ml-64 lg:p-6">{children}</main>
    </div>
  )
}
