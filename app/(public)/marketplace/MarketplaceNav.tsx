'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import LoginModal from './LoginModal'
import SignupModal from './SignupModal'

export default function MarketplaceNav() {
  const [user, setUser] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!loaded) return <div style={{ height: 56 }} />

  return (
    <>
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true) }}
        />
      )}
      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true) }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E8EDF8',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 20, color: '#0F172A', cursor: 'pointer' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!user ? (
            <>
              <button onClick={() => setShowLogin(true)} style={{
                background: '#FFFFFF', border: '1px solid #E8EDF8',
                borderRadius: 100, padding: '7px 16px',
                color: '#0F172A', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                Log in
              </button>
              <button onClick={() => setShowSignup(true)} style={{
                background: '#7C5CFC', border: 'none',
                borderRadius: 100, padding: '7px 16px',
                color: '#fff', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Sign up free
              </button>
            </>
          ) : (
            <>
              <Link href="/dashboard" style={{
                background: '#FFFFFF', border: '1px solid #E8EDF8',
                borderRadius: 100, padding: '7px 16px',
                color: '#0F172A', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                Dashboard
              </Link>
              <button onClick={handleSignOut} style={{
                background: '#FFFFFF', border: '1px solid #FECACA',
                borderRadius: 100, padding: '7px 16px',
                color: '#EF4444', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ height: 56 }} />
    </>
  )
}