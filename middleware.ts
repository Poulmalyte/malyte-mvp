import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LEGACY_B2C_PREFIXES = ['/marketplace', '/product', '/expert', '/my-plans']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Vecchio mondo marketplace B2C (pre-pivot, checkout Lemon Squeezy) → app Shopify
  if (LEGACY_B2C_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'))) {
    return NextResponse.redirect(new URL('/shopify', request.url))
  }
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Check admin_users table server-side
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminData) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/marketplace/:path*', '/marketplace', '/product/:path*', '/expert/:path*', '/expert', '/my-plans/:path*', '/my-plans'],
}
