'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PANELS = [
  {
    tag: 'For Shopify brands',
    headline: ['Every order,', 'becomes a routine.'],
    sub: 'Malyte builds a personalized routine from your catalog after every order, and introduces the next product when the customer is ready for it.',
    steps: [
      { n: '01', title: 'Connect your store',           sub: 'Your Shopify catalog syncs on install' },
      { n: '02', title: 'Every order becomes a routine', sub: 'Built only from products you actually sell' },
      { n: '03', title: 'The next product arrives',      sub: 'Weekly check-ins, recommendations timed to the routine' },
    ],
  },
  {
    tag: 'For their customers',
    headline: ['A routine that', 'adapts every week.'],
    sub: 'Your customers get a plan built around what they bought, and it changes based on how their skin responds.',
    steps: [
      { n: '01', title: 'They answer your questions', sub: 'You decide what the routine is built on' },
      { n: '02', title: 'They get their routine',     sub: 'Morning and evening, with a reason for each step' },
      { n: '03', title: 'It adapts every week',       sub: 'Check-ins reshape the plan, step by step' },
    ],
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelIndex, setPanelIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setPanelIndex(i => (i + 1) % PANELS.length)
        setFading(false)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animFrame: number
    let t = 0
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      t += 0.004
      const cx = w * 0.45 + Math.sin(t * 0.7) * 20
      const cy = h * 0.42 + Math.cos(t * 0.5) * 16
      const r  = Math.min(w, h) * 0.42 + Math.sin(t) * 14
      // blob 1 — viola
      const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.22, 0, cx, cy, r)
      grad.addColorStop(0,    'rgba(124, 92, 252, 0.18)')
      grad.addColorStop(0.5, 'rgba(124, 92, 252, 0.08)')
      grad.addColorStop(1,   'rgba(124, 92, 252, 0.00)')
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad; ctx.fill()
      // blob 2 — neon
      const cx2 = w * 0.62 + Math.cos(t * 0.6) * 24
      const cy2 = h * 0.64 + Math.sin(t * 0.8) * 18
      const r2  = r * 0.55 + Math.cos(t * 1.2) * 9
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2)
      grad2.addColorStop(0,   'rgba(77, 255, 210, 0.20)')
      grad2.addColorStop(0.6, 'rgba(99, 133, 255, 0.08)')
      grad2.addColorStop(1,   'rgba(77, 255, 210, 0.00)')
      ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2)
      ctx.fillStyle = grad2; ctx.fill()
      animFrame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener('resize', resize) }
  }, [])

  async function handleLogin() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Incorrect email or password'); setLoading(false); return }
    const params = new URLSearchParams(window.location.search); const next = params.get("next") || "/dashboard"; router.push(next); router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const panel = PANELS[panelIndex]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid #E8EDF8', background: '#F5F7FA',
    color: '#0F172A', fontSize: '14px',
    fontFamily: "'Satoshi', 'Inter', sans-serif",
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  }

  const EyeOpen = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
  const EyeOff = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

  return (
    <main style={{ display: 'flex', minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Satoshi', 'Inter', sans-serif" }}>

      {/* LEFT PANEL */}
      <div className="left-panel" style={{
        flex: '1 1 55%', position: 'relative', display: 'flex',
        flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', overflow: 'hidden', background: '#F5F7FA',
      }}>
        <canvas ref={canvasRef} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
        }} />

        <Link href="/" style={{ textDecoration: 'none', position: 'relative', zIndex: 2, marginBottom: '72px', display: 'block' }}>
          <span style={{ fontWeight: 800, fontSize: '22px', color: '#0F172A', letterSpacing: '-0.5px' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </Link>

        <div style={{
          position: 'relative', zIndex: 2, maxWidth: '480px',
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '100px',
            border: '1px solid rgba(77,255,210,0.4)',
            background: '#D1FDF3', marginBottom: '20px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', letterSpacing: '0.3px' }}>
              {panel.tag}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 4.5vw, 60px)', fontWeight: 800,
            lineHeight: 1.06, letterSpacing: '-2px', color: '#0F172A', margin: '0 0 22px',
          }}>
            {panel.headline[0]}<br />
            <span style={{ color: '#7C5CFC' }}>{panel.headline[1]}</span>
          </h1>

          <p style={{
            fontSize: '17px', fontWeight: 300, lineHeight: 1.7,
            color: '#64748B', margin: '0 0 48px', maxWidth: '370px',
          }}>
            {panel.sub}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {panel.steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#7C5CFC', letterSpacing: '0.5px', minWidth: '22px', marginTop: '3px' }}>
                  {s.n}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{s.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 400, color: '#94A3B8', lineHeight: 1.5 }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '36px', left: '64px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {PANELS.map((_, i) => (
            <button key={i} onClick={() => { setFading(true); setTimeout(() => { setPanelIndex(i); setFading(false) }, 400) }}
              style={{
                width: i === panelIndex ? '20px' : '6px', height: '6px', borderRadius: '100px',
                background: i === panelIndex ? '#7C5CFC' : '#C7D2F0',
                border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div style={{
        flex: '0 0 420px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', background: '#FFFFFF',
        borderLeft: '1px solid #E8EDF8',
      }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>

          <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: '#0F172A', margin: '0 0 6px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 32px', fontWeight: 400 }}>
            Sign in to your Malyte account
          </p>

          {/* Google */}
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              border: '1px solid #E8EDF8', background: '#F5F7FA',
              color: '#0F172A', fontSize: '14px', fontWeight: 500,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'inherit', marginBottom: '20px', transition: 'background 0.2s',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E8EDF8' }} />
            <span style={{ fontSize: '12px', color: '#C7D2F0', letterSpacing: '0.5px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E8EDF8' }} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
              EMAIL
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e  => (e.target.style.borderColor = '#E8EDF8')}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e  => (e.target.style.borderColor = '#E8EDF8')}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: showPassword ? '#7C5CFC' : '#94A3B8',
                  display: 'flex', alignItems: 'center', padding: 0, transition: 'color 0.2s',
                }}
              >
                {showPassword ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '10px', padding: '12px 14px',
              color: '#EF4444', fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: loading ? '#C4B5FD' : '#7C5CFC',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.2px', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94A3B8', fontWeight: 400 }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 600 }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .left-panel { display: none !important; } }
      `}</style>
    </main>
  )
}