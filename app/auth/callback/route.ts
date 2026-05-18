import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      const userId = session.user.id

      const pendingCookie = cookieStore.get('pending_signup')?.value
      let pendingData: {
        role?: string
        consent_terms?: boolean
        consent_health?: boolean
        consent_marketing?: boolean
        consent_timestamp?: string
      } | null = null
      if (pendingCookie) {
        try { pendingData = JSON.parse(decodeURIComponent(pendingCookie)) } catch {}
      }

      cookieStore.set('pending_signup', '', { path: '/', maxAge: 0 })

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      let redirectPath = '/login'

      if (existingProfile?.role) {
        if (existingProfile.role === 'expert') {
          const { data: expertProfile } = await supabase
            .from('experts')
            .select('id, slug')
            .eq('id', userId)
            .single()
          redirectPath = expertProfile?.slug ? '/dashboard' : '/onboarding'
        } else {
          redirectPath = '/my-plans'
        }
      } else {
        const role = pendingData?.role || (session.user.user_metadata?.role as string) || 'client'

        await supabase.from('profiles').upsert({
          id: userId,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          role,
          consent_terms: pendingData?.consent_terms ?? false,
          consent_health: pendingData?.consent_health ?? false,
          consent_marketing: pendingData?.consent_marketing ?? false,
          consent_timestamp: pendingData?.consent_timestamp ?? new Date().toISOString(),
        }, { onConflict: 'id' })

        redirectPath = role === 'expert' ? '/onboarding' : '/client-onboarding'
      }

      // Crea la redirect response e copia TUTTI i cookie su di essa
      const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
      cookieStore.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, {
          path: '/',
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        })
      })
      return response
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}