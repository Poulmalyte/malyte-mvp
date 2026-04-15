'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email o password non corretti')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '48px',
        width: '100%',
        maxWidth: '440px',
      }}>
        <div style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: '24px',
          marginBottom: '32px', textAlign: 'center'
        }}>
          maly<span style={{ color: 'var(--neon)' }}>te</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          Bentornato
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
          Accedi al tuo account Malyte
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="la-tua@email.com"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '14px', outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '14px', outline: 'none'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#FF5C7A', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, #7C5CFC, #5B3FD4)',
            color: 'white', fontWeight: 600, fontSize: '15px',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Accesso in corso...' : 'Accedi →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Non hai un account?{' '}
          <Link href="/signup" style={{ color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 500 }}>
            Registrati
          </Link>
        </p>
      </div>
    </main>
  )
}