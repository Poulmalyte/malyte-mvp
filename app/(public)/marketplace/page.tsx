import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Suspense } from 'react'
import MarketplaceNav from './MarketplaceNav'
import SearchBar from './SearchBar'

type Product = {
  id: string
  title: string
  price: number
  duration_months: number | null
  expert_name: string
  expert_slug: string
  expert_category: string
  client_count: number
}

function getBadge(clientCount: number) {
  if (clientCount >= 20) return { label: 'Top Rated', bg: '#FEF3C7', color: '#D97706' }
  if (clientCount >= 10) return { label: 'Bestseller', bg: '#FEF3C7', color: '#D97706' }
  if (clientCount >= 3)  return { label: 'Popular',    bg: '#D1FDF3', color: '#059669' }
  return null
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const categoryGradients: Record<string, string> = {
  nutrition: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
  fitness:   'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
  skincare:  'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
  wellness:  'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
  mental:    'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
}

const categoryEmoji: Record<string, string> = {
  nutrition: '🥗', fitness: '💪', skincare: '✨', wellness: '🧘', mental: '🧠',
}

const CATEGORIES = [
  { id: '',          label: 'All',       emoji: '🌟' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'fitness',   label: 'Fitness',   emoji: '💪' },
  { id: 'skincare',  label: 'Skincare',  emoji: '✨' },
  { id: 'wellness',  label: 'Wellness',  emoji: '🧘' },
  { id: 'mental',    label: 'Mindset',   emoji: '🧠' },
]

const HOW_IT_WORKS = [
  {
    n: '01', emoji: '🔍', title: 'Browse expert plans',
    desc: 'Explore programs designed by professionals: nutritionists, personal trainers, skincare specialists. Every plan is built on a real, tested methodology.',
    proof: 'Not generic advice. Real expertise.',
  },
  {
    n: '02', emoji: '📋', title: 'Answer a few questions',
    desc: "After purchase, you'll fill in a short questionnaire about your goals, habits, lifestyle and starting point. This takes just a few seconds.",
    proof: 'Your plan adapts to YOU, not the other way around.',
  },
  {
    n: '03', emoji: '✨', title: 'Get your personalized plan',
    desc: "Our AI reads the expert's methodology and your answers, then generates a week-by-week plan built specifically for you. No fluff, no filler.",
    proof: 'Delivered in a few seconds. Built to last months.',
  },
  {
    n: '04', emoji: '📈', title: 'Evolve every week',
    desc: "At the end of each week, you complete a quick check-in. The AI adapts the next week's plan based on your progress.",
    proof: 'It gets smarter as you improve.',
  },
]

const TRUST_POINTS = [
  { icon: '⚡', text: 'Delivered in seconds' },
  { icon: '🔄', text: 'Adapts every week' },
  { icon: '💳', text: 'One-time or subscription' },
  { icon: '✅', text: 'Real client results' },
]

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; goal?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { q, goal: goalParam } = await searchParams
  const query = q?.trim() || ''
  const goal  = goalParam?.trim() || ''

  let productQuery = supabase
    .from('products')
    .select(`id, title, price, duration_months, experts!inner(name, slug, category)`)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (goal)  productQuery = productQuery.eq('experts.category', goal)
  if (query) productQuery = productQuery.ilike('title', `%${query}%`)
  const { data: productsRaw } = await productQuery

  const { data: allPurchases } = await supabase.from('purchases').select('product_id, client_id')
  const clientsByProduct: Record<string, Set<string>> = {}
  for (const p of allPurchases || []) {
    if (!clientsByProduct[p.product_id]) clientsByProduct[p.product_id] = new Set()
    clientsByProduct[p.product_id].add(p.client_id)
  }

  const products: Product[] = (productsRaw || []).map((p: any) => ({
    id: p.id, title: p.title, price: p.price,
    duration_months: p.duration_months,
    expert_name: p.experts?.name ?? '',
    expert_slug: p.experts?.slug ?? '',
    expert_category: p.experts?.category ?? '',
    client_count: clientsByProduct[p.id]?.size ?? 0,
  }))

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .hero-padding { padding: 32px 16px 24px !important; }
          .hero-title { font-size: 26px !important; line-height: 1.2 !important; }
          .hero-sub { font-size: 14px !important; }
          .cat-wrap { justify-content: flex-start !important; }
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .how-padding { padding: 36px 16px !important; }
          .trust-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .cta-pad { padding: 28px 16px !important; }
        }
        @media (max-width: 380px) {
          .product-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>

        <MarketplaceNav />

        {/* HERO */}
        <div className="hero-padding" style={{ background: '#F5F7FA', borderBottom: '1px solid #E8EDF8', padding: '48px 20px 36px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <h1 className="hero-title" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'clamp(26px, 5vw, 44px)', color: '#0F172A', marginBottom: 12, lineHeight: 1.15 }}>
              Find the perfect wellness plan<br />
              <span style={{ color: '#7C5CFC' }}>tailored just for you</span>
            </h1>
            <p className="hero-sub" style={{ color: '#64748B', fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>
              Real expert methodologies. Personalized by AI in seconds.<br />
              A plan that actually fits your life.
            </p>
            <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
              <Suspense fallback={null}><SearchBar /></Suspense>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Lose weight', 'Build muscle', 'Clear skin', 'Eat better', 'Mental wellness'].map(s => (
                <span key={s} style={{ fontSize: 12, color: '#7C5CFC', background: '#EDE9FE', padding: '5px 12px', borderRadius: 100, cursor: 'pointer', fontWeight: 500 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div style={{ borderBottom: '1px solid #E8EDF8', background: '#FFFFFF' }}>
          <div className="cat-wrap" style={{ display: 'flex', padding: '0 16px', justifyContent: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as any}>
            {CATEGORIES.map(cat => {
              const active = goal === cat.id || (!goal && cat.id === '')
              return (
                <Link key={cat.id} href={cat.id ? `/marketplace?goal=${cat.id}` : '/marketplace'} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
                    color: active ? '#7C5CFC' : '#64748B',
                    borderBottom: active ? '2px solid #7C5CFC' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    {cat.label}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 0' }}>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            <strong style={{ color: '#0F172A' }}>{products.length}</strong>{' '}
            {goal ? `${goal} plans` : 'plans'} available
          </p>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 15, color: '#64748B' }}>No plans found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
              {products.map((product) => {
                const badge    = getBadge(product.client_count)
                const gradient = categoryGradients[product.expert_category] || 'linear-gradient(135deg, #EDE9FE, #C4B5FD)'
                const emoji    = categoryEmoji[product.expert_category] || '⭐'
                const username = product.expert_name.toLowerCase().replace(/\s+/g, '')
                return (
                  <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0',
                      overflow: 'hidden', cursor: 'pointer',
                    }}>
                      <div style={{ height: 120, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ fontSize: 40 }}>{emoji}</span>
                        {badge && (
                          <div style={{ position: 'absolute', top: 8, left: 8, background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                            {badge.label}
                          </div>
                        )}
                        {product.duration_months && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(255,255,255,0.92)', color: '#334155', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                            {product.duration_months} mo
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #6385FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {getInitials(product.expert_name)}
                          </div>
                          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 34 }}>
                          {product.title}
                        </p>
                        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>Starting at</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>€{Number(product.price).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* HOW IT WORKS */}
        <div className="how-padding" style={{ background: '#F5F7FA', borderTop: '1px solid #E8EDF8', borderBottom: '1px solid #E8EDF8', padding: '56px 16px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7C5CFC', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                How it works
              </span>
              <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'clamp(22px, 4vw, 34px)', color: '#0F172A', marginBottom: 12, lineHeight: 1.2 }}>
                From browsing to your personal plan<br />in under 5 minutes
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
                Unlike generic apps, Malyte takes a real expert&apos;s methodology and uses AI to build something that fits only you.
              </p>
            </div>

            <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 32 }}>
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: i % 2 === 0 ? '#EDE9FE' : '#D1FDF3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {step.emoji}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7C5CFC', letterSpacing: '0.08em' }}>STEP {step.n}</span>
                    <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '3px 0 6px', lineHeight: 1.3 }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 8 }}>
                      {step.desc}
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 100, padding: '3px 10px' }}>
                      <span style={{ color: '#059669', fontSize: 10 }}>✓</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>{step.proof}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TRUST BAR */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px', marginBottom: 32 }}>
              <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                Why people choose Malyte
              </p>
              <div className="trust-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 460, margin: '0 auto' }}>
                {TRUST_POINTS.map((point, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F5F7FA', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{point.icon}</span>
                    <span style={{ fontSize: 12, color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>{point.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BIG CTA */}
            <div className="cta-pad" style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #6385FF 100%)', borderRadius: 18, padding: '36px 24px', color: '#fff', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 'clamp(18px, 3vw, 28px)', marginBottom: 10, lineHeight: 1.2 }}>
                Stop following plans made for someone else.
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 1.6 }}>
                Your body, your goals, your habits — your plan.<br />
                Built in seconds by an expert who knows what works.
              </p>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'inline-block', background: '#FFFFFF', color: '#7C5CFC', fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 14, padding: '12px 24px', borderRadius: 100, cursor: 'pointer' }}>
                  Get your personalized plan →
                </div>
              </Link>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 12 }}>
                One-time purchase or monthly plan — you choose.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '20px 16px', textAlign: 'center', background: '#FFFFFF', borderTop: '1px solid #E8EDF8' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A', cursor: 'pointer' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </Link>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>© 2026 Malyte · AI-powered wellness plans</p>
        </div>
      </div>
    </>
  )
}