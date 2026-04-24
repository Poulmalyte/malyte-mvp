'use client'

import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  name: string
  email: string
}

export default function ClientProfileMenu({ name, email }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : email?.slice(0, 2).toUpperCase() || '?'

  const menuItems = [
    { label: 'My plans',          href: '/my-plans',     icon: '◈' },
    { label: 'Browse marketplace', href: '/marketplace',  icon: '◎' },
    { label: 'Account',           href: '/account',      icon: '▦' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4DFFD2, #6385FF)',
          border: open ? '2px solid #4DFFD2' : '2px solid rgba(77,255,210,0.3)',
          color: '#070B14', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s',
          fontFamily: "'Satoshi', 'Inter', sans-serif",
        }}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 230, background: '#14182A',
          border: '1px solid rgba(77,255,210,0.15)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 100,
          animation: 'fadeIn 0.15s ease',
        }}>

          {/* header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(77,255,210,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E8EDF8', fontFamily: "'Satoshi', sans-serif" }}>
                {name || 'Client'}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#4DFFD2',
                background: 'rgba(77,255,210,0.12)',
                border: '1px solid rgba(77,255,210,0.25)',
                padding: '2px 8px', borderRadius: 100, letterSpacing: '0.3px',
              }}>
                CLIENT
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#6B7A99', wordBreak: 'break-all' }}>{email}</span>
          </div>

          {/* nav items */}
          <div style={{ padding: '8px 0' }}>
            {menuItems.map(item => (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', fontSize: 13, color: '#C4CBE0', fontWeight: 500,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 14, opacity: 0.6 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          {/* subscription */}
          <div style={{ borderTop: '1px solid rgba(77,255,210,0.08)', padding: '8px 0' }}>
            <Link href="/subscription" onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', fontSize: 13, color: '#C4CBE0', fontWeight: 500,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14, opacity: 0.6 }}>◇</span>
                Subscription
              </div>
            </Link>
          </div>

          {/* sign out */}
          <div style={{ borderTop: '1px solid rgba(77,255,210,0.08)', padding: '8px 0' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', fontSize: 13, color: '#FF6B6B', fontWeight: 500,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: "'Satoshi', 'Inter', sans-serif", transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 14, opacity: 0.7 }}>→</span>
              Sign out
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}