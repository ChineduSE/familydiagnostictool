import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protects every /admin route. Unauthenticated or non-active-admin users are
// redirected to the login page. Authenticated active admins on the login page
// are sent to the dashboard.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isLoginPage = path === '/admin/login'

  async function isActiveAdmin(): Promise<boolean> {
    if (!user) return false
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()
    return !!profile?.is_active
  }

  if (path.startsWith('/admin') && !isLoginPage) {
    if (!(await isActiveAdmin())) {
      if (user) await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (isLoginPage && user && (await isActiveAdmin())) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
