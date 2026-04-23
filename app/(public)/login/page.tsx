'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Incorrect email or password')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* HERO DARK */}
      <div style={{ background: '#14182A', padding: '32px 24px 48px', textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 24, color: '#4DFFD2' }}>malyte</span>
        </Link>
        <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 28, color: '#F1F3F9', margin: '16px 0 8px' }}>
          Welcome back
        </h1>
        <p style={{ color: '#8B92A5', fontSize: 14, margin: 0 }}>
          Sign in to your Malyte account
        </p>
      </div>

      {/* BODY LIGHT */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', borderRadius: 16, padding: '36px', width: '100%', maxWidth: 420 }}>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: '#fff', border: '1.5px solid #E2DDD6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#111827',
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 0 0 1.83 5.43L4.5 7.5c.67-2 2.52-3.92 4.48-3.92z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#EDE9E2' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#EDE9E2' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: '#F9F8F6', border: '1px solid #EDE9E2', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 8 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: '#F9F8F6', border: '1px solid #EDE9E2', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,92,122,0.08)', border: '1px solid rgba(255,92,122,0.25)', borderRadius: 10, padding: '12px 16px', color: '#FF5C7A', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: loading ? '#E5E2D9' : '#7C5CFC', color: loading ? '#9CA3AF' : '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif" }}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9CA3AF' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 500 }}>Sign up</Link>
          </p>
        </div>
      </div>

      {/* FOOTER DARK */}
      <div style={{ background: '#1E2337', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>
          © 2025 Malyte · AI-powered wellness programs
        </p>
      </div>

    </main>
  )
}