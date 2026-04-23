import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ExpertPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!expert) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('expert_id', expert.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const productIds = products?.map((p: any) => p.id) || []

  const { data: purchases } = productIds.length > 0
    ? await supabase
        .from('purchases')
        .select('id, client_id, product_id, created_at')
        .in('product_id', productIds)
    : { data: [] }

  const { data: clientPlans } = purchases && purchases.length > 0
    ? await supabase
        .from('client_plans')
        .select('purchase_id, current_week, total_weeks')
        .in('purchase_id', (purchases || []).map((p: any) => p.id))
    : { data: [] }

  const totalClients = new Set((purchases || []).map((p: any) => p.client_id)).size
  const totalPurchases = (purchases || []).length
  const engagedCount = (clientPlans || []).filter((p: any) => (p.current_week || 1) >= 3).length
  const engagedPct = totalPurchases > 0 ? Math.round((engagedCount / totalPurchases) * 100) : 0
  const avgWeek = clientPlans && clientPlans.length > 0
    ? Math.round((clientPlans.reduce((sum: number, p: any) => sum + (p.current_week || 1), 0) / clientPlans.length) * 10) / 10
    : 0

  const categoryLabel: Record<string, string> = {
    nutrition: 'Nutrition',
    fitness: 'Fitness & Training',
    skincare: 'Skincare',
    wellness: 'Wellness',
    mindset: 'Mindset & Coaching',
  }

  const categoryIcon: Record<string, string> = {
    nutrition: '🥗',
    fitness: '💪',
    skincare: '✨',
    wellness: '🧘',
    mindset: '🧠',
  }

  const socials = [
    { label: 'Instagram', url: expert.instagram_url, icon: '📸' },
    { label: 'TikTok', url: expert.tiktok_url, icon: '🎵' },
    { label: 'YouTube', url: expert.youtube_url, icon: '▶️' },
    { label: 'LinkedIn', url: expert.linkedin_url, icon: '💼' },
    { label: 'Website', url: expert.website_url, icon: '🌐' },
  ].filter(s => s.url)

  const stats = [
    { value: totalClients > 0 ? totalClients.toString() : '—', label: 'Happy clients', icon: '👥' },
    { value: avgWeek > 0 ? `${avgWeek}` : '—', label: 'Avg week reached', icon: '📈' },
    { value: engagedPct > 0 ? `${engagedPct}%` : '—', label: 'Past week 3', icon: '🔥' },
  ]

  const firstName = expert.name?.split(' ')[0] || 'this expert'

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,800&display=swap" rel="stylesheet" />

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0D1525 0%, #14182A 60%, #1a1040 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow sfondo */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(77,255,210,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 52px', position: 'relative' }}>

          {/* Breadcrumb */}
          <Link href="/marketplace" style={{ color: '#6B7A99', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← Marketplace
          </Link>

          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, marginTop: 32 }}>

            {/* Avatar grande */}
            <div style={{
              width: 110, height: 110, borderRadius: '50%', flexShrink: 0,
              background: expert.avatar_url ? 'transparent' : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
              border: '3px solid rgba(124,92,252,0.4)',
              boxShadow: '0 0 40px rgba(124,92,252,0.2)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {expert.avatar_url ? (
                <img src={expert.avatar_url} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40, color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                  {expert.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, paddingTop: 4 }}>
              {/* Badge categoria */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(77,255,210,0.12)', color: '#4DFFD2',
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100,
                  border: '1px solid rgba(77,255,210,0.2)',
                  letterSpacing: '0.05em',
                }}>
                  {categoryIcon[expert.category] || '⭐'} {categoryLabel[expert.category] || expert.category}
                </span>
                {totalClients > 0 && (
                  <span style={{
                    background: 'rgba(255,255,255,0.06)', color: '#8B92A5',
                    fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {totalClients} client{totalClients !== 1 ? 's' : ''} on Malyte
                  </span>
                )}
              </div>

              {/* Nome */}
              <h1 style={{
                fontFamily: 'Satoshi, sans-serif', fontWeight: 800,
                fontSize: 'clamp(26px, 4vw, 36px)',
                color: '#F1F3F9', margin: '0 0 10px', lineHeight: 1.1,
              }}>
                {expert.name}
              </h1>

              {/* Tagline o methodology come headline */}
              {(expert.tagline || expert.methodology_name) && (
                <p style={{
                  color: '#A0AEC0', fontSize: 16, margin: '0 0 16px',
                  lineHeight: 1.6, maxWidth: 480,
                }}>
                  {expert.tagline || `My method: ${expert.methodology_name}`}
                </p>
              )}

              {/* Social */}
              {socials.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socials.map((s, i) => (
                    <a key={i} href={s.url!} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 100,
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#8B92A5', textDecoration: 'none', fontSize: 12,
                      transition: 'all 0.2s',
                    }}>
                      <span>{s.icon}</span> {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA principale nell'hero */}
          {products && products.length > 0 && (
            <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link href={`/product/${products[0].id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #7C5CFC, #6385FF)',
                  color: '#fff', fontFamily: 'Satoshi, sans-serif',
                  fontWeight: 700, fontSize: 16,
                  padding: '14px 32px', borderRadius: 14,
                  boxShadow: '0 4px 24px rgba(124,92,252,0.35)',
                  cursor: 'pointer',
                }}>
                  Get your personalized plan →
                </div>
              </Link>
              <span style={{ color: '#6B7A99', fontSize: 13 }}>
                Starting from €{Math.min(...(products || []).map((p: any) => p.price))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SOCIAL PROOF — stat grandi ── */}
      {totalClients > 0 && (
        <div style={{ background: '#0D1525', borderBottom: '1px solid rgba(99,130,255,0.1)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
            <p style={{
              color: '#4DFFD2', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              margin: '0 0 24px', textAlign: 'center',
            }}>
              ✦ Trusted by real people
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  borderRight: i < 2 ? '1px solid rgba(99,130,255,0.15)' : 'none',
                  padding: '0 20px',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{
                    fontFamily: 'Satoshi, sans-serif',
                    fontSize: 'clamp(32px, 5vw, 48px)',
                    fontWeight: 800,
                    background: i === 0
                      ? 'linear-gradient(135deg, #7C5CFC, #4DFFD2)'
                      : i === 1
                      ? 'linear-gradient(135deg, #4DFFD2, #6385FF)'
                      : 'linear-gradient(135deg, #6385FF, #A78BFA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1, marginBottom: 6,
                  }}>
                    {s.value}
                  </div>
                  <div style={{ color: '#6B7A99', fontSize: 13 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: '#2D3748', fontSize: 11, margin: '20px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
              Real data from verified purchases on Malyte
            </p>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 120px' }}>

        {/* Methodology banner */}
        {expert.methodology_name && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,92,252,0.08), rgba(77,255,210,0.06))',
            border: '1px solid rgba(124,92,252,0.2)',
            borderRadius: 16, padding: '24px 28px', marginBottom: 20,
            display: 'flex', alignItems: 'flex-start', gap: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {categoryIcon[expert.category] || '⭐'}
            </div>
            <div>
              <p style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                My Method
              </p>
              <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 18, color: '#14182A', margin: '0 0 8px' }}>
                {expert.methodology_name}
              </h3>
              {expert.methodology_description && (
                <p style={{ color: '#4A5568', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {expert.methodology_description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {expert.bio && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #EAE7E0', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#14182A', margin: '0 0 14px' }}>
              About {firstName}
            </h2>
            <p style={{ color: '#4A5568', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
              {expert.bio}
            </p>
          </div>
        )}

        {/* Credentials */}
        {expert.credentials?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #EAE7E0', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#14182A', margin: '0 0 16px' }}>
              Credentials
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {expert.credentials.map((c: string, i: number) => (
                <span key={i} style={{
                  background: '#F0EDFF', border: '1px solid rgba(124,92,252,0.2)',
                  color: '#5B3FBD', fontSize: 13, fontWeight: 500,
                  padding: '6px 14px', borderRadius: 100,
                }}>
                  ✓ {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Products ── */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#14182A', margin: 0 }}>
              Programs by {firstName}
            </h2>
            {products && products.length > 1 && (
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>{products.length} available</span>
            )}
          </div>

          {products && products.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {products.map((product: any, idx: number) => (
                <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: 20, padding: '24px 28px',
                    border: idx === 0 ? '2px solid rgba(124,92,252,0.3)' : '1px solid #EAE7E0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
                    position: 'relative', overflow: 'hidden',
                    boxShadow: idx === 0 ? '0 4px 24px rgba(124,92,252,0.08)' : 'none',
                  }}>
                    {/* Badge "Most popular" sul primo */}
                    {idx === 0 && products.length > 1 && (
                      <div style={{
                        position: 'absolute', top: 0, right: 24,
                        background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        padding: '4px 12px', borderRadius: '0 0 8px 8px',
                        letterSpacing: '0.05em',
                      }}>
                        MOST POPULAR
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 17, color: '#14182A' }}>
                          {product.title}
                        </span>
                        {product.duration_months && (
                          <span style={{
                            background: 'rgba(124,92,252,0.1)', color: '#7C5CFC',
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                          }}>
                            {product.duration_months} month{product.duration_months > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 12px', lineHeight: 1.6 }}>
                        {product.description?.slice(0, 120)}{product.description?.length > 120 ? '…' : ''}
                      </p>
                      <span style={{
                        display: 'inline-block',
                        background: '#F0FDF4', color: '#16A34A',
                        fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100,
                        border: '1px solid #BBF7D0',
                      }}>
                        ✓ AI-personalized for you
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 28, color: '#7C5CFC', marginBottom: 2 }}>
                        €{product.price}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
                        {product.pricing_model === 'one_time' ? 'one-time' : 'per month'}
                      </div>
                      <div style={{
                        background: '#7C5CFC', color: '#fff',
                        fontSize: 13, fontWeight: 700,
                        padding: '10px 20px', borderRadius: 12,
                        whiteSpace: 'nowrap',
                      }}>
                        Get this plan →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>No programs available yet.</p>
          )}
        </div>
      </div>

      {/* ── CTA STICKY ── */}
      {products && products.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(13,21,37,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(124,92,252,0.2)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <p style={{ color: '#E8EDF8', fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 15, margin: 0 }}>
              Ready to start with {firstName}?
            </p>
            <p style={{ color: '#6B7A99', fontSize: 12, margin: '2px 0 0' }}>
              Get your personalized plan in minutes
            </p>
          </div>
          <Link href={`/product/${products[0].id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #7C5CFC, #6385FF)',
              color: '#fff', fontFamily: 'Satoshi, sans-serif',
              fontWeight: 700, fontSize: 15,
              padding: '12px 28px', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(124,92,252,0.4)',
              whiteSpace: 'nowrap',
            }}>
              Get your plan →
            </div>
          </Link>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ background: '#1E2337', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>© 2025 Malyte · AI-powered wellness programs</p>
      </div>
    </main>
  )
}