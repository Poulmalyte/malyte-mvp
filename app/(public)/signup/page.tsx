'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

type Role = 'expert' | 'client'

export default function SignupPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignup = async () => {
    if (!role) {
      setError('Please select an account type before continuing.')
      return
    }
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signUpData.session) {
      const role = signUpData.session.user.user_metadata?.role || 'client'
      await supabase.from('profiles').upsert({
        id: signUpData.session.user.id,
        name: signUpData.session.user.email?.split('@')[0] || '',
        role,
      }, { onConflict: 'id' })
      router.push(role === 'expert' ? '/dashboard' : '/client-onboarding')
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    if (!role) {
      setError('Please select an account type first.')
      return
    }
    localStorage.setItem('pending_role', role)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>✉️</div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '28px', fontWeight: 800, color: '#E8EDF8', marginBottom: '16px' }}>
            Check your email
          </h1>
          <p style={{ color: '#6B7A99', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: '#E8EDF8' }}>{email}</strong>.<br />
            Click the link to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '28px', fontWeight: 800, color: '#E8EDF8' }}>
            mal<span style={{ color: '#7C5CFC' }}>yte</span>
          </span>
        </div>

        <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '24px', fontWeight: 800, color: '#E8EDF8', textAlign: 'center', marginBottom: '8px' }}>
          Create your account
        </h1>
        <p style={{ color: '#6B7A99', fontFamily: "'Inter', sans-serif", textAlign: 'center', marginBottom: '32px' }}>
          First things first — who are you?
        </p>

        {/* Role Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => setRole('expert')}
            style={{
              background: role === 'expert' ? 'rgba(124, 92, 252, 0.15)' : '#0D1525',
              border: role === 'expert' ? '2px solid #7C5CFC' : '2px solid rgba(99,130,255,0.15)',
              borderRadius: '16px',
              padding: '24px 16px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
            <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '16px', fontWeight: 700, color: role === 'expert' ? '#A78BFA' : '#E8EDF8', marginBottom: '6px' }}>
              Expert
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#6B7A99', lineHeight: 1.5 }}>
              Upload your methodology and sell digital plans
            </div>
          </button>

          <button
            onClick={() => setRole('client')}
            style={{
              background: role === 'client' ? 'rgba(77, 255, 210, 0.08)' : '#0D1525',
              border: role === 'client' ? '2px solid #4DFFD2' : '2px solid rgba(99,130,255,0.15)',
              borderRadius: '16px',
              padding: '24px 16px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
            <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '16px', fontWeight: 700, color: role === 'client' ? '#4DFFD2' : '#E8EDF8', marginBottom: '6px' }}>
              Client
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#6B7A99', lineHeight: 1.5 }}>
              Discover experts and get your personalized plan
            </div>
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              background: '#0D1525',
              border: '1px solid rgba(99,130,255,0.2)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#E8EDF8',
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password (minimum 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              background: '#0D1525',
              border: '1px solid rgba(99,130,255,0.2)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#E8EDF8',
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px',
              outline: 'none',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#FF6B6B', fontFamily: "'Inter', sans-serif", fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #7C5CFC, #6385FF)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px',
            color: 'white',
            fontFamily: "'Satoshi', sans-serif",
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '16px',
          }}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,130,255,0.15)' }} />
          <span style={{ color: '#6B7A99', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,130,255,0.15)' }} />
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignup}
          style={{
            width: '100%',
            background: '#0D1525',
            border: '1px solid rgba(99,130,255,0.2)',
            borderRadius: '12px',
            padding: '14px',
            color: '#E8EDF8',
            fontFamily: "'Inter', sans-serif",
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', color: '#6B7A99', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#A78BFA', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}