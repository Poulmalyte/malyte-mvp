'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function MarketplaceNav() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!user) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 100,
    }}>
      <Link
        href="/account"
        style={{
          background: '#0D1525',
          border: '1px solid rgba(99,130,255,0.2)',
          borderRadius: '100px',
          padding: '8px 18px',
          color: '#E8EDF8',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Account
      </Link>
      <button
        onClick={handleSignOut}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,100,100,0.3)',
          borderRadius: '100px',
          padding: '8px 18px',
          color: '#FF8080',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  )
}