import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, surname, category, email, password } = body

    // 1. Aggiorna experts
    const expertUpdate: Record<string, any> = {}
    if (name !== undefined) expertUpdate.name = name.trim()
    if (surname !== undefined) expertUpdate.surname = surname.trim()
    if (category !== undefined) expertUpdate.category = category

    if (Object.keys(expertUpdate).length > 0) {
      const { error: expertError } = await supabaseAdmin
        .from('experts')
        .update(expertUpdate)
        .eq('id', user.id)
      if (expertError) return NextResponse.json({ error: expertError.message }, { status: 500 })
      if (expertUpdate.name) {
        await supabaseAdmin.from('profiles').update({ name: expertUpdate.name }).eq('id', user.id)
      }
    }

    // 2. Aggiorna email
    if (email && email.trim() !== user.email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email: email.trim() }
      )
      if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 })
      return NextResponse.json({ ok: true, emailChanged: true })
    }

    // 3. Aggiorna password
    if (password && password.length >= 6) {
      const { data: { user: fullUser } } = await supabaseAdmin.auth.admin.getUserById(user.id)
      const isOAuth = fullUser?.app_metadata?.provider === 'google'
      if (isOAuth) return NextResponse.json({ error: 'Cannot change password for Google accounts' }, { status: 400 })
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
      if (pwError) return NextResponse.json({ error: pwError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, emailChanged: false })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}