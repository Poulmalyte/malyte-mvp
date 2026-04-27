'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function MarketplaceNav() {
  const [user, setUser] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
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
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!loaded) return null

  if (!user) return (
    <div style={{
      position: 'fixed', top: 0, right: 0,
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 100,
    }}>
      <Link href="/login" style={{
        background: '#FFFFFF',
        border: '1px solid #E8EDF8',
        borderRadius: '100px',
        padding: '8px 20px',
        color: '#0F172A',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        textDecoration: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        Log in
      </Link>
      <Link href="/signup" style={{
        background: '#7C5CFC',
        border: 'none',
        borderRadius: '100px',
        padding: '8px 20px',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
      }}>
        Sign up free
      </Link>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0,
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 100,
    }}>
      <Link href="/dashboard" style={{
        background: '#FFFFFF',
        border: '1px solid #E8EDF8',
        borderRadius: '100px',
        padding: '8px 18px',
        color: '#0F172A',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        textDecoration: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        Dashboard
      </Link>
      <button onClick={handleSignOut} style={{
        background: '#FFFFFF',
        border: '1px solid #FECACA',
        borderRadius: '100px',
        padding: '8px 18px',
        color: '#EF4444',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        Sign out
      </button>
    </div>
  )
}