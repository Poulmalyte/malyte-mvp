import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientProfileMenu from './ClientProfileMenu'
import ReviewForm from './ReviewForm'

export default async function MyPlansPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: purchases } = await supabase
    .from('purchases')
    .select(`*, products ( title, description, duration_months, experts ( name, category ) )`)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const purchaseIds = purchases?.map((p: any) => p.id) || []
  const { data: reviews } = purchaseIds.length > 0
    ? await supabase.from('reviews').select('purchase_id, rating, comment').in('purchase_id', purchaseIds)
    : { data: [] }

  const reviewMap: Record<string, { rating: number; comment: string | null }> = {}
  reviews?.forEach((r: any) => { reviewMap[r.purchase_id] = r })

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <Link href="/marketplace" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              ← Marketplace
            </Link>
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
            <ClientProfileMenu email={user.email || ''} />
          </div>
          <div style={{ paddingBottom: '24px' }}>
            <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 26, color: '#0F172A', margin: '0 0 4px' }}>
              My Plans
            </h1>
            <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
              Your personalized programs
            </p>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '24px 24px 48px' }}>
        {!purchases || purchases.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1px solid #E8EDF8' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 18, color: '#0F172A', marginBottom: 8 }}>No plans yet</p>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 24 }}>Browse the marketplace to find your perfect program</p>
            <Link href="/marketplace" style={{ background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 24px', borderRadius: 100, textDecoration: 'none' }}>
              Browse marketplace →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {purchases.map((purchase: any) => {
              const product = purchase.products
              const expert = product?.experts
              const existingReview = reviewMap[purchase.id] || null
              return (
                <div key={purchase.id} style={{
                  background: '#FFFFFF', borderRadius: 14, padding: '20px 24px',
                  border: '1px solid #E8EDF8',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: existingReview || true ? 12 : 0 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {expert?.category} · {expert?.name}
                      </p>
                      <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 17, color: '#0F172A', marginBottom: 4 }}>
                        {product?.title}
                      </h2>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                        {product?.duration_months} month program
                      </p>
                    </div>
                    <Link href={`/my-plans/${purchase.id}/plan`} style={{
                      background: '#7C5CFC', color: '#fff',
                      fontWeight: 600, fontSize: 13, padding: '10px 20px',
                      borderRadius: 100, textDecoration: 'none',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      Open plan →
                    </Link>
                  </div>
                  <ReviewForm purchaseId={purchase.id} existingReview={existingReview} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '20px 24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>© 2026 Malyte · AI-powered wellness programs</p>
      </div>
    </main>
  )
}