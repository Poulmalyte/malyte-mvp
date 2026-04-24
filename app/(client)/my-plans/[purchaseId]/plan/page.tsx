import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyPlansPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: purchases } = await supabase
    .from('purchases')
    .select(`*, products ( title, description, duration_months, experts ( name, category ) )`)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* HERO DARK */}
      <div style={{ background: '#14182A', padding: '24px 24px 36px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/marketplace" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
            ← Marketplace
          </Link>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 26, color: '#F1F3F9', margin: '0 0 6px' }}>
            My Plans
          </h1>
          <p style={{ color: '#8B92A5', fontSize: 13, margin: 0 }}>
            Your personalized programs
          </p>
        </div>
      </div>

      {/* BODY LIGHT */}
      <div style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '24px 24px 48px' }}>
        {!purchases || purchases.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1px solid #EDE9E2' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 8 }}>No plans yet</p>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24 }}>Browse the marketplace to find your perfect program</p>
            <Link href="/marketplace"
              style={{ background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 24px', borderRadius: 100, textDecoration: 'none' }}>
              Browse marketplace →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {purchases.map((purchase: any) => {
              const product = purchase.products
              const expert = product?.experts
              return (
                <div key={purchase.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '20px 24px', border: '1px solid #EDE9E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {expert?.category} · {expert?.name}
                    </p>
                    <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 4 }}>
                      {product?.title}
                    </h2>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {product?.duration_months} month program
                    </p>
                  </div>
                  <Link href={`/my-plans/${purchase.id}/plan`}
                    style={{ background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 100, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Open plan →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FOOTER DARK */}
      <div style={{ background: '#1E2337', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>© 2025 Malyte · AI-powered wellness programs</p>
      </div>

    </main>
  )
}