'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ShopifyLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #E8EDF8', background: '#F8FAFC',
    color: '#0F172A', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  async function handleSubmit() {
    setLoading(true); setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      setLoading(false); return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false); return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Incorrect email or password.'); setLoading(false); return }
      router.push('/shopify')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: email.split('@')[0],
          role: 'expert',
          consent_terms: true,
          consent_timestamp: new Date().toISOString(),
        }, { onConflict: 'id' })
        await supabase.from('experts').upsert({
          id: data.user.id,
          name: email.split('@')[0],
          slug: `expert-${data.user.id.slice(0, 8)}`,
          category: 'Skincare',
        }, { onConflict: 'id' })
        router.push('/shopify')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#F5F7FA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Satoshi', 'Inter', sans-serif", padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/shopify/home" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: 26, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </Link>
          <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>Shopify App for wellness professionals</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EDF8', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          <div style={{ display: 'flex', background: '#F5F7FA', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#0F172A' : '#94A3B8',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: loading ? '#C4B5FD' : '#7C5CFC',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}>
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          {mode === 'signup' && (
            <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" target="_blank" style={{ color: '#7C5CFC', textDecoration: 'none' }}>Terms</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" style={{ color: '#7C5CFC', textDecoration: 'none' }}>Privacy Policy</a>.
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94A3B8' }}>
          <Link href="/shopify/home" style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}