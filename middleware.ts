import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const EXPERT_ROUTES = ['/dashboard', '/onboarding', '/profile']
const CLIENT_ROUTES = ['/my-plans', '/account']
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isProtected = [...EXPERT_ROUTES, ...CLIENT_ROUTES].some(r => pathname.startsWith(r))

  // Non autenticato → login
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Autenticato → logica redirect basata sul role
  if (session) {
    const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
    const isExpertRoute = EXPERT_ROUTES.some(r => pathname.startsWith(r))
    const isClientRoute = CLIENT_ROUTES.some(r => pathname.startsWith(r))
    const isOnboardingClient = pathname === '/client-onboarding'

    // Client senza profilo completo → onboarding obbligatorio
    if (!isAuthRoute && !isOnboardingClient) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, country')
        .eq('id', session.user.id)
        .single()

      const role = profile?.role || 'client'

      if (role === 'client' && (!profile?.name || !profile?.country)) {
        return NextResponse.redirect(new URL('/client-onboarding', req.url))
      }

      // Expert che prova ad accedere a route client
      if (role === 'expert' && isClientRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Client che prova ad accedere a route expert
      if (role === 'client' && isExpertRoute) {
        return NextResponse.redirect(new URL('/marketplace', req.url))
      }
    }

    // Redirect da login/signup se già loggato
    if (isAuthRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      const role = profile?.role || 'client'
      return NextResponse.redirect(new URL(role === 'expert' ? '/dashboard' : '/marketplace', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}