import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default async function ExpertPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: expert } = await supabase
    .from('experts').select('*').eq('slug', slug).eq('is_published', true).single()
  if (!expert) notFound()

  const { data: products } = await supabase
    .from('products').select('*').eq('expert_id', expert.id).eq('is_published', true).order('created_at', { ascending: false })

  const productIds = products?.map((p: any) => p.id) || []
  const { data: purchases } = productIds.length > 0
    ? await supabase.from('purchases').select('id, client_id, product_id, created_at').in('product_id', productIds)
    : { data: [] }

  const { data: clientPlans } = purchases && purchases.length > 0
    ? await supabase.from('client_plans').select('purchase_id, current_week, total_weeks').in('purchase_id', (purchases || []).map((p: any) => p.id))
    : { data: [] }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, client_id, profiles(full_name)')
    .eq('expert_id', expert.id)
    .order('created_at', { ascending: false })

  const reviewCount = reviews?.length || 0
  const avgRating = reviewCount > 0
    ? Math.round((reviews!.reduce((sum, r: any) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0

  const totalClients = new Set((purchases || []).map((p: any) => p.client_id)).size
  const totalPurchases = (purchases || []).length
  const engagedCount = (clientPlans || []).filter((p: any) => (p.current_week || 1) >= 3).length
  const engagedPct = totalPurchases > 0 ? Math.round((engagedCount / totalPurchases) * 100) : 0
  const avgWeek = clientPlans && clientPlans.length > 0
    ? Math.round((clientPlans.reduce((sum: number, p: any) => sum + (p.current_week || 1), 0) / clientPlans.length) * 10) / 10
    : 0

  const categoryLabel: Record<string, string> = {
    nutrition: 'Nutrition', fitness: 'Fitness & Training',
    skincare: 'Skincare', wellness: 'Wellness', mindset: 'Mindset & Coaching',
  }
  const categoryIcon: Record<string, string> = {
    nutrition: '🥗', fitness: '💪', skincare: '✨', wellness: '🧘', mindset: '🧠',
  }

  const socials = [
    { label: 'Instagram', url: expert.instagram_url, icon: '📸' },
    { label: 'TikTok', url: expert.tiktok_url, icon: '🎵' },
    { label: 'YouTube', url: expert.youtube_url, icon: '▶️' },
    { label: 'LinkedIn', url: expert.linkedin_url, icon: '💼' },
    { label: 'Website', url: expert.website_url, icon: '🌐' },
  ].filter(s => s.url)

  const stats = [
    { value: totalClients > 0 ? totalClients.toString() : '—', label: 'Happy clients', color: '#7C5CFC' },
    { value: avgWeek > 0 ? `${avgWeek}` : '—', label: 'Avg week reached', color: '#059669' },
    { value: engagedPct > 0 ? `${engagedPct}%` : '—', label: 'Past week 3', color: '#6385FF' },
  ]

  const firstName = expert.name?.split(' ')[0] || 'this expert'

  function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ color: n <= rating ? '#F59E0B' : '#E8EDF8' }}>★</span>
        ))}
      </span>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER NAV */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 20, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </Link>
          <Link href="/marketplace" style={{ color: '#64748B', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← Back to Marketplace
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
              background: expert.avatar_url ? 'transparent' : 'linear-gradient(135deg, #7C5CFC, #6385FF)',
              border: '3px solid #E8EDF8', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {expert.avatar_url ? (
                <img src={expert.avatar_url} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 36, color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                  {expert.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ background: '#EDE9FE', color: '#7C5CFC', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.04em' }}>
                  {categoryIcon[expert.category] || '⭐'} {categoryLabel[expert.category] || expert.category}
                </span>
                {totalClients > 0 && (
                  <span style={{ background: '#D1FDF3', color: '#059669', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 100 }}>
                    {totalClients} client{totalClients !== 1 ? 's' : ''} on Malyte
                  </span>
                )}
                {reviewCount > 0 && (
                  <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ★ {avgRating} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                  </span>
                )}
              </div>

              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 32px)', color: '#0F172A', margin: '0 0 8px', lineHeight: 1.1 }}>
                {expert.name}
              </h1>

              {(expert.tagline || expert.methodology_name) && (
                <p style={{ color: '#64748B', fontSize: 15, margin: '0 0 14px', lineHeight: 1.6, maxWidth: 480 }}>
                  {expert.tagline || `My method: ${expert.methodology_name}`}
                </p>
              )}

              {socials.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socials.map((s, i) => (
                    <a key={i} href={s.url!} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 100,
                      border: '1px solid #E8EDF8', background: '#F5F7FA',
                      color: '#64748B', textDecoration: 'none', fontSize: 12,
                    }}>
                      <span>{s.icon}</span> {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {products && products.length > 0 && (
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link href={`/product/${products[0].id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#7C5CFC', color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12 }}>
                  Get your personalized plan →
                </div>
              </Link>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>
                Starting from €{Math.min(...(products || []).map((p: any) => p.price))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SOCIAL PROOF */}
      {totalClients > 0 && (
        <div style={{ background: '#EDE9FE', borderBottom: '1px solid #C4B5FD' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
            <p style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px', textAlign: 'center' }}>
              ✦ Trusted by real people
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid #C4B5FD' : 'none', padding: '0 20px' }}>
                  <div style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: s.color, lineHeight: 1.1, marginBottom: 6 }}>
                    {s.value}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BODY */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 120px' }}>

        {expert.methodology_name && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF8', borderRadius: 16, padding: '24px 28px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {categoryIcon[expert.category] || '⭐'}
            </div>
            <div>
              <p style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>My Method</p>
              <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: '0 0 8px' }}>{expert.methodology_name}</h3>
              {expert.methodology_description && (
                <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{expert.methodology_description}</p>
              )}
            </div>
          </div>
        )}

        {expert.bio && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px 28px', border: '1px solid #E8EDF8', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', margin: '0 0 12px' }}>About {firstName}</h2>
            <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.8, margin: 0 }}>{expert.bio}</p>
          </div>
        )}

        {expert.credentials?.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px 28px', border: '1px solid #E8EDF8', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', margin: '0 0 14px' }}>Credentials</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {expert.credentials.map((c: string, i: number) => (
                <span key={i} style={{ background: '#EDE9FE', border: '1px solid #C4B5FD', color: '#7C5CFC', fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 100 }}>
                  ✓ {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', margin: 0 }}>
              Programs by {firstName}
            </h2>
            {products && products.length > 1 && (
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{products.length} available</span>
            )}
          </div>

          {products && products.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {products.map((product: any, idx: number) => (
                <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#FFFFFF', borderRadius: 16, padding: '22px 24px',
                    border: idx === 0 ? '2px solid #7C5CFC' : '1px solid #E8EDF8',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
                    position: 'relative', overflow: 'hidden',
                    boxShadow: idx === 0 ? '0 4px 20px rgba(124,92,252,0.10)' : 'none',
                  }}>
                    {idx === 0 && products.length > 1 && (
                      <div style={{ position: 'absolute', top: 0, right: 20, background: '#7C5CFC', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.05em' }}>
                        MOST POPULAR
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A' }}>{product.title}</span>
                        {product.duration_months && (
                          <span style={{ background: '#EDE9FE', color: '#7C5CFC', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>
                            {product.duration_months} month{product.duration_months > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 }}>
                        {product.description?.slice(0, 120)}{product.description?.length > 120 ? '…' : ''}
                      </p>
                      <span style={{ display: 'inline-block', background: '#D1FDF3', color: '#059669', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, border: '1px solid #A7F3D0' }}>
                        ✓ AI-personalized for you
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 26, color: '#7C5CFC', marginBottom: 2 }}>€{product.price}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>{product.pricing_model === 'one_time' ? 'one-time' : 'per month'}</div>
                      <div style={{ background: '#7C5CFC', color: '#fff', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        Get this plan →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: 14 }}>No programs available yet.</p>
          )}
        </div>

        {/* REVIEWS */}
        {reviewCount > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', margin: 0 }}>Reviews</h2>
              <span style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700 }}>★ {avgRating}</span>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>({reviewCount})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews!.map((review: any) => {
                const name = review.profiles?.full_name
                const initials = name
                  ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : '?'
                return (
                  <div key={review.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8EDF8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, color: '#fff',
                      }}>
                        {initials}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: '0 0 2px' }}>
                          {name || 'Verified client'}
                        </p>
                        <StarDisplay rating={review.rating} size={13} />
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && (
                      <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{review.comment}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* CTA STICKY */}
      {products && products.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid #E8EDF8', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <p style={{ color: '#0F172A', fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 15, margin: 0 }}>
              Ready to start with {firstName}?
            </p>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0 0' }}>
              Get your personalized plan in minutes
            </p>
          </div>
          <Link href={`/product/${products[0].id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ background: '#7C5CFC', color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px 24px', borderRadius: 12, whiteSpace: 'nowrap' }}>
              Get your plan →
            </div>
          </Link>
        </div>
      )}

      <Footer />
    </main>
  )
}