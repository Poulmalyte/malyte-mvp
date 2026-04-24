'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PANELS = [
  {
    tag: 'For experts',
    headline: ['Your expertise,', 'scaled by AI.'],
    sub: 'Upload your methodology. AI builds personalized plans for every client — automatically.',
    steps: [
      { n: '01', title: 'Upload your methodology',     sub: 'Docs, frameworks, your way of working' },
      { n: '02', title: 'AI builds your product',      sub: 'Claude structures it into a sellable digital plan' },
      { n: '03', title: 'Clients get it personalized', sub: 'Every buyer receives a plan tailored to them' },
    ],
  },
  {
    tag: 'For clients',
    headline: ['A plan built', 'just for you.'],
    sub: 'Browse programs from top wellness experts. Answer a few questions. Get your personalized AI plan.',
    steps: [
      { n: '01', title: 'Browse expert programs',    sub: 'Nutritionists, trainers, skincare specialists' },
      { n: '02', title: 'Answer a few questions',    sub: 'Tell us your goals, habits and starting point' },
      { n: '03', title: 'Get your personalized plan', sub: 'AI generates a plan built around you, instantly' },
    ],
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelIndex, setPanelIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Auto-switch panels ────────────────────────────────────────
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

  // ── Animated orb ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      t += 0.004

      const cx = w * 0.45 + Math.sin(t * 0.7) * 20
      const cy = h * 0.42 + Math.cos(t * 0.5) * 16
      const r  = Math.min(w, h) * 0.40 + Math.sin(t) * 14

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8)
      glow.addColorStop(0,   'rgba(124, 92, 252, 0.20)')
      glow.addColorStop(0.5, 'rgba(77, 255, 210, 0.07)')
      glow.addColorStop(1,   'rgba(7, 11, 20, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.22, 0, cx, cy, r)
      grad.addColorStop(0,    'rgba(168, 139, 250, 0.90)')
      grad.addColorStop(0.38, 'rgba(124, 92,  252, 0.72)')
      grad.addColorStop(0.68, 'rgba(77,  255, 210, 0.30)')
      grad.addColorStop(1,    'rgba(77,  255, 210, 0.00)')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      const cx2 = w * 0.60 + Math.cos(t * 0.6) * 24
      const cy2 = h * 0.62 + Math.sin(t * 0.8) * 18
      const r2  = r * 0.52 + Math.cos(t * 1.2) * 9
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2)
      grad2.addColorStop(0,   'rgba(77, 255, 210, 0.42)')
      grad2.addColorStop(0.5, 'rgba(99, 133, 255, 0.16)')
      grad2.addColorStop(1,   'rgba(77, 255, 210, 0.00)')
      ctx.beginPath()
      ctx.arc(cx2, cy2, r2, 0, Math.PI * 2)
      ctx.fillStyle = grad2
      ctx.fill()

      animFrame = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── Auth handlers ─────────────────────────────────────────────
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const panel = PANELS[panelIndex]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(99,130,255,0.22)',
    background: 'rgba(255,255,255,0.04)',
    color: '#E8EDF8',
    fontSize: '14px',
    fontFamily: "'Satoshi', 'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#070B14',
      fontFamily: "'Satoshi', 'Inter', sans-serif",
    }}>

      {/* LEFT PANEL */}
      <div
        className="left-panel"
        style={{
          flex: '1 1 55%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }} />

        {/* logo */}
        <Link href="/" style={{ textDecoration: 'none', position: 'relative', zIndex: 2, marginBottom: '72px', display: 'block' }}>
          <span style={{ fontWeight: 800, fontSize: '22px', color: '#E8EDF8', letterSpacing: '-0.5px' }}>
            malyte<span style={{ color: '#4DFFD2' }}>.</span>
          </span>
        </Link>

        {/* animated content */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '480px',
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
          {/* tag pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '100px',
            border: '1px solid rgba(77,255,210,0.25)',
            background: 'rgba(77,255,210,0.06)',
            marginBottom: '20px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4DFFD2', display: 'block' }} />
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#4DFFD2', letterSpacing: '0.3px' }}>
              {panel.tag}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 4.5vw, 62px)',
            fontWeight: '800',
            lineHeight: '1.06',
            letterSpacing: '-2px',
            color: '#E8EDF8',
            margin: '0 0 22px',
          }}>
            {panel.headline[0]}<br />
            <span style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #4DFFD2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {panel.headline[1]}
            </span>
          </h1>

          <p style={{
            fontSize: '17px',
            fontWeight: '300',
            lineHeight: '1.7',
            color: 'rgba(232,237,248,0.50)',
            margin: '0 0 48px',
            maxWidth: '370px',
          }}>
            {panel.sub}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {panel.steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#4DFFD2', letterSpacing: '0.5px', minWidth: '22px', marginTop: '3px' }}>
                  {s.n}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: '#E8EDF8', lineHeight: '1.4' }}>{s.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: '300', color: 'rgba(232,237,248,0.40)', lineHeight: '1.5' }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* dot indicators */}
        <div style={{
          position: 'absolute',
          bottom: '36px',
          left: '64px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {PANELS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFading(true)
                setTimeout(() => { setPanelIndex(i); setFading(false) }, 400)
              }}
              style={{
                width: i === panelIndex ? '20px' : '6px',
                height: '6px',
                borderRadius: '100px',
                background: i === panelIndex ? '#4DFFD2' : 'rgba(232,237,248,0.20)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        flex: '0 0 420px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: 'rgba(13,21,37,0.65)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderLeft: '1px solid rgba(99,130,255,0.10)',
      }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>

          <h2 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', color: '#E8EDF8', margin: '0 0 6px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(232,237,248,0.42)', margin: '0 0 32px', fontWeight: '300' }}>
            Sign in to your Malyte account
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              border: '1px solid rgba(99,130,255,0.22)',
              background: 'rgba(255,255,255,0.04)',
              color: '#E8EDF8', fontSize: '14px', fontWeight: '500',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'inherit', marginBottom: '20px', transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
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
            <div style={{ flex: 1, height: '1px', background: 'rgba(99,130,255,0.12)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(232,237,248,0.28)', letterSpacing: '0.5px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(99,130,255,0.12)' }} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(232,237,248,0.45)', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(124,92,252,0.65)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(99,130,255,0.22)')}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(232,237,248,0.45)', display: 'block', marginBottom: '6px', letterSpacing: '0.4px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(124,92,252,0.65)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(99,130,255,0.22)')}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,92,122,0.08)',
              border: '1px solid rgba(255,92,122,0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#FF5C7A',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: loading ? 'rgba(124,92,252,0.45)' : 'linear-gradient(135deg, #7C5CFC 0%, #6385FF 100%)',
              color: '#fff', fontSize: '15px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.2px',
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            onMouseDown={e  => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'rgba(232,237,248,0.35)', fontWeight: '300' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#A78BFA', textDecoration: 'none', fontWeight: '500' }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .left-panel { display: none !important; }
        }
      `}</style>
    </main>
  )
}