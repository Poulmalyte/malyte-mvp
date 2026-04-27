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
    if (!role) { setError('Please select an account type before continuing.'); return }
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { role }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (signUpData.session) {
      const r = signUpData.session.user.user_metadata?.role || 'client'
      await supabase.from('profiles').upsert({
        id: signUpData.session.user.id,
        name: signUpData.session.user.email?.split('@')[0] || '',
        role: r,
      }, { onConflict: 'id' })
      router.push(r === 'expert' ? '/dashboard' : '/client-onboarding')
      return
    }
    setSuccess(true); setLoading(false)
  }

  const handleGoogleSignup = async () => {
    if (!role) { setError('Please select an account type first.'); return }
    localStorage.setItem('pending_role', role)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center', background: '#FFFFFF', borderRadius: '24px', padding: '48px 40px', border: '1px solid #E8EDF8' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>✉️</div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
            Check your email
          </h1>
          <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '15px' }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: '#0F172A' }}>{email}</strong>.<br />
            Click the link to activate your account.
          </p>
        </div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    border: '1px solid #E8EDF8', background: '#F5F7FA',
    color: '#0F172A', fontFamily: "'Inter', sans-serif",
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '460px', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </Link>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '40px 36px', border: '1px solid #E8EDF8' }}>

          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '24px', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: '6px' }}>
            Create your account
          </h1>
          <p style={{ color: '#94A3B8', textAlign: 'center', marginBottom: '28px', fontSize: '14px' }}>
            First things first — who are you?
          </p>

          {/* Role Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
            <button onClick={() => setRole('expert')} style={{
              background: role === 'expert' ? '#EDE9FE' : '#F5F7FA',
              border: role === 'expert' ? '2px solid #7C5CFC' : '2px solid #E8EDF8',
              borderRadius: '16px', padding: '20px 14px',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎓</div>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '15px', fontWeight: 700, color: role === 'expert' ? '#7C5CFC' : '#0F172A', marginBottom: '4px' }}>
                Expert
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                Upload your methodology and sell digital plans
              </div>
            </button>

            <button onClick={() => setRole('client')} style={{
              background: role === 'client' ? '#D1FDF3' : '#F5F7FA',
              border: role === 'client' ? '2px solid #4DFFD2' : '2px solid #E8EDF8',
              borderRadius: '16px', padding: '20px 14px',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>✨</div>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '15px', fontWeight: 700, color: role === 'client' ? '#059669' : '#0F172A', marginBottom: '4px' }}>
                Client
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                Discover experts and get your personalized plan
              </div>
            </button>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e  => (e.target.style.borderColor = '#E8EDF8')}
            />
            <input type="password" placeholder="Password (minimum 6 characters)" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e  => (e.target.style.borderColor = '#E8EDF8')}
            />
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '10px', padding: '12px 14px',
              color: '#EF4444', fontSize: '13px', marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          <button onClick={handleSignup} disabled={loading} style={{
            width: '100%', background: '#7C5CFC', border: 'none',
            borderRadius: '12px', padding: '14px',
            color: '#fff', fontFamily: "'Satoshi', sans-serif",
            fontSize: '16px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginBottom: '16px',
            transition: 'opacity 0.2s',
          }}>
            {loading ? 'Creating account...' : 'Create account →'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E8EDF8' }} />
            <span style={{ color: '#C7D2F0', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E8EDF8' }} />
          </div>

          <button onClick={handleGoogleSignup} style={{
            width: '100%', background: '#F5F7FA',
            border: '1px solid #E8EDF8', borderRadius: '12px', padding: '13px',
            color: '#0F172A', fontFamily: "'Inter', sans-serif",
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '24px', transition: 'background 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F5F7FA')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}