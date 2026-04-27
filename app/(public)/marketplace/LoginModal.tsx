'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import LoginModal from './LoginModal'

export default function MarketplaceNav() {
  const [user, setUser] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
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

  if (!loaded) return null

  return (
    <>
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}

      <div style={{
        position: 'fixed', top: 0, right: 0,
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', gap: '12px',
        zIndex: 100,
      }}>
        {!user ? (
          <>
            <button onClick={() => setShowModal(true)} style={{
              background: '#FFFFFF', border: '1px solid #E8EDF8',
              borderRadius: '100px', padding: '8px 20px',
              color: '#0F172A', fontFamily: 'Inter, sans-serif',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              Log in
            </button>
            <Link href="/signup" style={{
              background: '#7C5CFC', border: 'none',
              borderRadius: '100px', padding: '8px 20px',
              color: '#fff', fontFamily: 'Inter, sans-serif',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            }}>
              Sign up free
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" style={{
              background: '#FFFFFF', border: '1px solid #E8EDF8',
              borderRadius: '100px', padding: '8px 18px',
              color: '#0F172A', fontFamily: 'Inter, sans-serif',
              fontSize: '14px', fontWeight: 500, textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              Dashboard
            </Link>
            <button onClick={handleSignOut} style={{
              background: '#FFFFFF', border: '1px solid #FECACA',
              borderRadius: '100px', padding: '8px 18px',
              color: '#EF4444', fontFamily: 'Inter, sans-serif',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              Sign out
            </button>
          </>
        )}
      </div>
    </>
  )
}