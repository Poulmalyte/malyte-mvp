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

      // Controlla se il profilo esiste già
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (existingProfile?.role) {
        // Expert già esistente con onboarding completato → dashboard
        // Expert nuovo → onboarding
        if (existingProfile.role === 'expert') {
          const { data: expertProfile } = await supabase
            .from('experts')
            .select('id, slug')
            .eq('id', userId)
            .single()
          const redirectPath = expertProfile?.slug ? '/dashboard' : '/onboarding'
          return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
        }
        return NextResponse.redirect(new URL('/marketplace', requestUrl.origin))
      }

      // Nuovo utente — legge role da user_metadata
      const role = (session.user.user_metadata?.role as string) || 'client'

      await supabase.from('profiles').upsert({
        id: userId,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
        role,
      }, { onConflict: 'id' })

      const redirectPath = role === 'expert' ? '/onboarding' : '/client-onboarding'
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}