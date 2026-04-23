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

      // Controlla se il profilo esiste già con un role
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (existingProfile?.role) {
        const redirectPath = existingProfile.role === 'expert' ? '/dashboard' : '/marketplace'
        return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
      }

      // Legge il role da user_metadata (impostato durante signup email)
      const role = (session.user.user_metadata?.role as string) || 'client'

      // Salva il profilo con il role
      await supabase.from('profiles').upsert({
        id: userId,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
        role,
      }, { onConflict: 'id' })

      const redirectPath = role === 'expert' ? '/dashboard' : '/marketplace'
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}