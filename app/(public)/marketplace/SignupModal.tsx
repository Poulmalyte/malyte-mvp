'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface SignupModalProps {
  onClose: () => void
  onSwitchToLogin: () => void
}

type Role = 'expert' | 'client'

export default function SignupModal({ onClose, onSwitchToLogin }: SignupModalProps) {
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSignup = async () => {
    if (!role) { setError('Please select an account type.'); return }
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { role }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.session) {
      const r = data.session.user.user_metadata?.role || 'client'
      await supabase.from('profiles').upsert({ id: data.session.user.id, name: email.split('@')[0], role: r }, { onConflict: 'id' })
      router.push(r === 'expert' ? '/onboarding' : '/client-onboarding')
      onClose(); return
    }
    setSuccess(true); setLoading(false)
  }

  const handleGoogle = async () => {
    if (!role) { setError('Please select an account type first.'); return }
    localStorage.setItem('pending_role', role)
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #E8EDF8', background: '#F5F7FA',
    color: '#0F172A', fontSize: 14, fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001, width: '100%', maxWidth: 440,
        background: '#FFFFFF', borderRadius: 20,
        padding: '40px 36px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: 'Inter, sans-serif',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: '#94A3B8', lineHeight: 1,
        }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 12 }}>Check your email</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              We sent a confirmation link to <strong style={{ color: '#0F172A' }}>{email}</strong>.<br />Click the link to activate your account.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 6, textAlign: 'center' }}>
              Create your account
            </h2>
            <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 20, textAlign: 'center' }}>
              First things first — who are you?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setRole('expert')} style={{
                background: role === 'expert' ? '#EDE9FE' : '#F5F7FA',
                border: `2px solid ${role === 'expert' ? '#7C5CFC' : '#E8EDF8'}`,
                borderRadius: 14, padding: '16px 12px', cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎓</div>
                <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, fontWeight: 700, color: role === 'expert' ? '#7C5CFC' : '#0F172A', marginBottom: 4 }}>Expert</div>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>Sell your methodology as digital plans</div>
              </button>
              <button onClick={() => setRole('client')} style={{
                background: role === 'client' ? '#D1FDF3' : '#F5F7FA',
                border: `2px solid ${role === 'client' ? '#4DFFD2' : '#E8EDF8'}`,
                borderRadius: 14, padding: '16px 12px', cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
                <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, fontWeight: 700, color: role === 'client' ? '#059669' : '#0F172A', marginBottom: 4 }}>Client</div>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>Get your personalized wellness plan</div>
              </button>
            </div>

            <button onClick={handleGoogle} disabled={googleLoading} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              border: '1px solid #E8EDF8', background: '#F5F7FA',
              color: '#0F172A', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit', marginBottom: 14, transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F5F7FA')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/>
                <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 0 0 1.83 5.43L4.5 7.5c.67-2 2.52-3.92 4.48-3.92z"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#E8EDF8' }} />
              <span style={{ fontSize: 12, color: '#C7D2F0' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E8EDF8' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, letterSpacing: '0.04em' }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, letterSpacing: '0.04em' }}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', color: '#EF4444', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button onClick={handleSignup} disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: loading ? '#C4B5FD' : '#7C5CFC',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Satoshi, sans-serif', marginBottom: 16,
            }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} style={{ color: '#7C5CFC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </>
  )
}