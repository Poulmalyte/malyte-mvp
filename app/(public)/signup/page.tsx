'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSignup() {
    setLoading(true)
    setError('')

    if (!name || !email || !password) {
      setError('Compila tutti i campi')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '48px', width: '100%', maxWidth: '440px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>📧</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
            Controlla la tua email
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
            Ti abbiamo inviato un link di conferma a <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Clicca il link per attivare il tuo account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '48px', width: '100%', maxWidth: '440px',
      }}>
        <div style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: '24px',
          marginBottom: '32px', textAlign: 'center'
        }}>
          maly<span style={{ color: 'var(--neon)' }}>te</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          Crea il tuo account
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
          Inizia a scalare la tua expertise con Malyte
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Nome completo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mario Rossi"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '14px', outline: 'none'
            }}
          />
        </div>

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
            placeholder="Minimo 6 caratteri"
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
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
          onClick={handleSignup}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, #4DFFD2, #3BC4A8)',
            color: loading ? 'var(--muted)' : '#070B14',
            fontWeight: 700, fontSize: '15px',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Registrazione...' : 'Crea account →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Hai già un account?{' '}
          <Link href="/login" style={{ color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 500 }}>
            Accedi
          </Link>
        </p>
      </div>
    </main>
  )
}