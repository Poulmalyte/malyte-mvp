import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Suspense } from 'react'
import MarketplaceNav from './MarketplaceNav'
import GoalPills from './GoalPills'
import SearchBar from './SearchBar'

type Expert = {
  id: string
  name: string
  slug: string
  category: string
  methodology_name: string | null
  client_count: number
  product_count: number
}

type Product = {
  id: string
  title: string
  price: number
  pricing_model: string | null
  duration_months: number | null
  expert_name: string
  expert_slug: string
  expert_category: string
}

function getBadge(clients: number): { label: string; color: string } | null {
  if (clients >= 20) return { label: 'Top Rated',   color: '#7C5CFC' }
  if (clients >= 10) return { label: 'Trending',    color: '#F59E0B' }
  if (clients >= 5)  return { label: 'Best Seller', color: '#4DFFD2' }
  return null
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; goal?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { q, goal: goalParam } = await searchParams
  const query = q?.trim() || ''
  const goal  = goalParam?.trim() || ''

  // Fetch experts
  let expertQuery = supabase
    .from('experts')
    .select('id, name, slug, category, methodology_name')
    .eq('is_published', true)

  if (goal)  expertQuery = expertQuery.eq('category', goal)
  if (query) expertQuery = expertQuery.ilike('name', `%${query}%`)

  const { data: expertsRaw } = await expertQuery

  // Prodotti pubblicati per conteggi
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, expert_id')
    .eq('is_published', true)

  const productToExpert: Record<string, string> = {}
  const productsByExpert: Record<string, string[]> = {}
  for (const p of allProducts || []) {
    productToExpert[p.id] = p.expert_id
    if (!productsByExpert[p.expert_id]) productsByExpert[p.expert_id] = []
    productsByExpert[p.expert_id].push(p.id)
  }

  // Clienti unici per expert
  const { data: allPurchases } = await supabase
    .from('purchases')
    .select('product_id, client_id')

  const clientsByExpert: Record<string, Set<string>> = {}
  for (const p of allPurchases || []) {
    const expertId = productToExpert[p.product_id]
    if (!expertId) continue
    if (!clientsByExpert[expertId]) clientsByExpert[expertId] = new Set()
    clientsByExpert[expertId].add(p.client_id)
  }

  const experts: Expert[] = (expertsRaw || []).map((e) => ({
    ...e,
    client_count:  clientsByExpert[e.id]?.size ?? 0,
    product_count: productsByExpert[e.id]?.length ?? 0,
  }))

  // Top 5 prodotti
  let productQuery = supabase
    .from('products')
    .select(`
      id, title, price, pricing_model, duration_months,
      experts!inner ( name, slug, category )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)

  if (query) productQuery = productQuery.ilike('title', `%${query}%`)

  const { data: productsRaw } = await productQuery

  const products: Product[] = (productsRaw || []).map((p: any) => ({
    id:              p.id,
    title:           p.title,
    price:           p.price,
    pricing_model:   p.pricing_model,
    duration_months: p.duration_months,
    expert_name:     p.experts?.name     ?? '',
    expert_slug:     p.experts?.slug     ?? '',
    expert_category: p.experts?.category ?? '',
  }))

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#070B14' }}>

      <MarketplaceNav />

      {/* ── Hero ── */}
      <section style={{ background: '#070B14', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', textAlign: 'center' }}>
        <div>
          <p style={{ color: '#4DFFD2', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Wellness · Fitness · Nutrition · Skincare
          </p>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 800, color: '#E8EDF8', margin: 0, lineHeight: 1.15 }}>
            Find your expert.<br />
            <span style={{ color: '#7C5CFC' }}>Get your plan.</span>
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '16px', maxWidth: '460px', margin: '16px auto 0', lineHeight: 1.7 }}>
            Real methodologies from real experts — personalized for you in minutes.
          </p>
        </div>

        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>

        <Suspense fallback={null}>
          <GoalPills />
        </Suspense>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: '#0D1525', padding: '64px 24px', borderTop: '1px solid rgba(99,130,255,0.1)', borderBottom: '1px solid rgba(99,130,255,0.1)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 700, color: '#E8EDF8', marginBottom: '48px' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
            {[
              { icon: '🔍', n: '1', title: 'Choose your expert',     desc: 'Browse certified experts and their unique methodologies.' },
              { icon: '📋', n: '2', title: 'Answer a few questions', desc: 'Tell them your goals, habits, and lifestyle.' },
              { icon: '✨', n: '3', title: 'Get your plan',          desc: 'Receive a personalized plan built just for you.' },
            ].map((item) => (
              <div key={item.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '32px' }}>{item.icon}</div>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#7C5CFC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {item.n}
                </div>
                <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '16px', fontWeight: 700, color: '#E8EDF8', margin: 0 }}>
                  {item.title}
                </h3>
                <p style={{ color: '#6B7A99', fontSize: '14px', margin: 0, lineHeight: 1.65 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Expert Cards ── */}
      <section style={{ background: '#070B14', padding: '64px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 700, color: '#E8EDF8', marginBottom: '6px' }}>
            {goal ? `${goal} Experts` : 'Meet our experts'}
          </h2>
          <p style={{ color: '#6B7A99', fontSize: '14px', marginBottom: '32px' }}>
            {experts.length} expert{experts.length !== 1 ? 's' : ''} available
          </p>

          {experts.length === 0 ? (
            <p style={{ color: '#6B7A99', textAlign: 'center', padding: '60px 0' }}>
              No experts found. Try a different search or filter.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {experts.map((expert) => {
                const badge = getBadge(expert.client_count)
                return (
                  <div key={expert.id} style={{ background: '#0D1525', border: '1px solid rgba(99,130,255,0.15)', borderRadius: '20px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>
                        {getInitials(expert.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '16px', color: '#E8EDF8' }}>
                            {expert.name}
                          </span>
                          {badge && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: badge.color + '22', color: badge.color }}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: 'rgba(124,92,252,0.15)', color: '#A78BFA' }}>
                          {expert.category}
                        </span>
                      </div>
                    </div>

                    {expert.methodology_name && (
                      <p style={{ color: '#6B7A99', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                        <span style={{ color: '#4DFFD2', fontWeight: 600 }}>Method: </span>
                        {expert.methodology_name}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '20px', color: '#E8EDF8' }}>{expert.client_count}</div>
                        <div style={{ fontSize: '12px', color: '#6B7A99' }}>clients</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '20px', color: '#E8EDF8' }}>{expert.product_count}</div>
                        <div style={{ fontSize: '12px', color: '#6B7A99' }}>plans</div>
                      </div>
                    </div>

                    <Link href={`/expert/${expert.slug}`} style={{ display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: '12px', background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
                      View Profile →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Top Products ── */}
      {products.length > 0 && (
        <section style={{ background: '#0D1525', padding: '64px 24px', borderTop: '1px solid rgba(99,130,255,0.1)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 700, color: '#E8EDF8', marginBottom: '6px' }}>
              Top products
            </h2>
            <p style={{ color: '#6B7A99', fontSize: '14px', marginBottom: '32px' }}>Handcrafted plans ready for you</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {products.map((product) => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: '#111D35', border: '1px solid rgba(99,130,255,0.15)', borderRadius: '16px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '15px', color: '#E8EDF8' }}>
                      {product.title}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#6B7A99' }}>by {product.expert_name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: 'rgba(124,92,252,0.15)', color: '#A78BFA' }}>
                        {product.expert_category}
                      </span>
                      {product.duration_months && (
                        <span style={{ fontSize: '12px', color: '#6B7A99' }}>
                          {product.duration_months} month{product.duration_months > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '20px', color: '#E8EDF8' }}>
                      €{Number(product.price).toFixed(0)}
                    </span>
                    <Link href={`/expert/${product.expert_slug}`} style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid rgba(124,92,252,0.4)', color: '#A78BFA', fontWeight: 600, fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      View Expert →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section style={{ background: '#070B14', padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(99,130,255,0.1)' }}>
        <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#E8EDF8', margin: 0 }}>
          Ready to start?
        </h2>
        <p style={{ color: '#6B7A99', fontSize: '16px', maxWidth: '400px', margin: 0, lineHeight: 1.7 }}>
          Your personalized plan is one expert away. No subscriptions — just results.
        </p>
        <Link href="/marketplace" style={{ padding: '14px 36px', borderRadius: '14px', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
          Browse experts →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0D1525', borderTop: '1px solid rgba(99,130,255,0.1)', padding: '40px 24px', textAlign: 'center', color: '#6B7A99', fontSize: '14px' }}>
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: '18px', color: '#E8EDF8' }}>malyte</span>
        </div>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} Malyte. Empowering experts to scale their methodology.</p>
      </footer>

    </div>
  )
}