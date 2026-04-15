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

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', maxWidth: '900px' }}>

  {/* Card genera prodotto */}
  <a href="/generate" style={{ textDecoration: 'none' }}>
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(124,92,252,0.4)',
      borderRadius: 20,
      padding: '32px',
      cursor: 'pointer',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
      <h2 style={{ color: '#E8EDF8', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 8px 0' }}>
        Genera prodotto AI
      </h2>
      <p style={{ color: '#6B7A99', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        Trasforma la tua metodologia in un prodotto digitale. L'AI usa solo le tue parole.
      </p>
      <div style={{ marginTop: 20, color: '#7C5CFC', fontSize: 13, fontWeight: 600 }}>
        Inizia →
      </div>
    </div>
  </a>

  {/* Card profilo pubblico */}
  <a href="/onboarding" style={{ textDecoration: 'none' }}>
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(99,130,255,0.15)',
      borderRadius: 20,
      padding: '32px',
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⚙</div>
      <h2 style={{ color: '#E8EDF8', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 8px 0' }}>
        Aggiorna metodologia
      </h2>
      <p style={{ color: '#6B7A99', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        Modifica il tuo profilo, metodologia e dettagli del prodotto.
      </p>
      <div style={{ marginTop: 20, color: '#6385FF', fontSize: 13, fontWeight: 600 }}>
        Modifica →
      </div>
    </div>
  </a>

</div>
</div>
    </main>
  )
}