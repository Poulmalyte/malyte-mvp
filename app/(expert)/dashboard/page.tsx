import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>
            maly<span style={{ color: 'var(--neon)' }}>te</span>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
          Benvenuto 👋
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: '40px' }}>
          Sei loggato come <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
        </p>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '32px', maxWidth: '500px'
        }}>
          <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7 }}>
            🎉 Login funzionante! La dashboard completa verrà costruita nel Giorno 6.
          </p>
        </div>
      </div>
    </main>
  )
}