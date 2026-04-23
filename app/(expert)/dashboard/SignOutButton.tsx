'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        color: '#6B7A99', fontWeight: 500, fontSize: 13,
        padding: '10px 18px', borderRadius: 100,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'transparent', cursor: 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
      }}
    >
      Sign out
    </button>
  )
}