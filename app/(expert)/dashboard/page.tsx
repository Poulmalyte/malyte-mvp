import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PublishToggle from './PublishToggle'
import SignOutButton from './SignOutButton'
import ShareButton from './ShareButton'

async function getExpertData(supabase: any, userId: string) {
  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*, product_questions(count)')
    .eq('expert_id', userId)
    .order('created_at', { ascending: false })

  const productIds = products?.map((p: any) => p.id) || []

  const { data: purchases } = productIds.length > 0
    ? await supabase
        .from('purchases')
        .select('*, products(title)')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0
  const totalClients = new Set(purchases?.map((p: any) => p.client_id)).size
  const publishedProducts = products?.filter((p: any) => p.is_published).length || 0
  const monthlyData = buildMonthlyData(purchases || [])

  return { expert, products: products || [], purchases: purchases || [], totalRevenue, totalClients, publishedProducts, monthlyData }
}

async function getAnalyticsData(supabase: any, userId: string, purchases: any[], products: any[]) {
  const clientIds = [...new Set(purchases.map((p: any) => p.client_id))]

  const { data: profiles } = clientIds.length > 0
    ? await supabase.from('profiles').select('birth_date, sex, country').in('id', clientIds)
    : { data: [] }

  const { data: checkins } = purchases.length > 0
    ? await supabase.from('weekly_checkins').select('week_number, purchase_id').in('purchase_id',
        purchases.map((p: any) => p.id))
    : { data: [] }

  const ageBuckets: Record<string, number> = { '18–24': 0, '25–34': 0, '35–44': 0, '45–54': 0, '55+': 0 }
  profiles?.forEach((p: any) => {
    if (!p.birth_date) return
    const age = new Date().getFullYear() - new Date(p.birth_date).getFullYear()
    if (age < 25) ageBuckets['18–24']++
    else if (age < 35) ageBuckets['25–34']++
    else if (age < 45) ageBuckets['35–44']++
    else if (age < 55) ageBuckets['45–54']++
    else ageBuckets['55+']++
  })

  const sexBuckets: Record<string, number> = { Female: 0, Male: 0, Other: 0 }
  profiles?.forEach((p: any) => {
    const s = p.sex?.toLowerCase()
    if (s === 'female' || s === 'f') sexBuckets['Female']++
    else if (s === 'male' || s === 'm') sexBuckets['Male']++
    else if (p.sex) sexBuckets['Other']++
  })

  const countryMap: Record<string, number> = {}
  profiles?.forEach((p: any) => {
    if (!p.country) return
    countryMap[p.country] = (countryMap[p.country] || 0) + 1
  })
  const totalWithCountry = Object.values(countryMap).reduce((a, b) => a + b, 0) || 1
  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([country, count]) => ({
      country,
      count,
      pct: Math.round((count / totalWithCountry) * 100),
    }))

  const checkinByWeek: Record<number, Set<string>> = {}
  checkins?.forEach((c: any) => {
    if (!checkinByWeek[c.week_number]) checkinByWeek[c.week_number] = new Set()
    checkinByWeek[c.week_number].add(c.purchase_id)
  })
  const totalPurchases = purchases.length || 1
  const dropoff = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    rate: Math.round(((checkinByWeek[i + 1]?.size || 0) / totalPurchases) * 100),
  }))

  const productPerformance = products.map((p: any) => {
    const productPurchases = purchases.filter((pur: any) => pur.product_id === p.id)
    const revenue = productPurchases.reduce((s: number, pur: any) => s + Number(pur.amount || 0), 0)
    const productCheckins = checkins?.filter((c: any) =>
      productPurchases.some((pur: any) => pur.id === c.purchase_id)
    ) || []
    const checkinRate = productPurchases.length > 0
      ? Math.round((new Set(productCheckins.map((c: any) => c.purchase_id)).size / productPurchases.length) * 100)
      : 0
    return { name: p.title, sales: productPurchases.length, revenue, checkinRate }
  })

  return { ageBuckets, sexBuckets, topCountries, dropoff, productPerformance, totalProfiles: profiles?.length || 0 }
}

function buildMonthlyData(purchases: any[]) {
  const months: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = 0
  }
  purchases.forEach(p => {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in months) months[key] += Number(p.amount || 0)
  })
  return Object.entries(months).map(([key, value]) => ({
    label: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short' }),
    value,
  }))
}

const COLORS = ['#7C5CFC', '#4DFFD2', '#A78BFA', '#6385FF', '#FF8C69']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'analytics' ? 'analytics' : 'overview'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { expert, products, purchases, totalRevenue, totalClients, publishedProducts, monthlyData } =
    await getExpertData(supabase, user.id)

  const analytics = activeTab === 'analytics'
    ? await getAnalyticsData(supabase, user.id, purchases, products)
    : null

  const maxMonthly = Math.max(...monthlyData.map(m => m.value), 1)

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif" }}>

      {/* HERO DARK */}
      <div style={{ background: '#14182A', padding: '24px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <span style={{ color: '#4DFFD2', fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22 }}>malyte</span>
              <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 26, color: '#F1F3F9', margin: '8px 0 4px' }}>
                Welcome {expert?.name?.split(' ')[0]} 👋
              </h1>
              <p style={{ color: '#8B92A5', fontSize: 13, margin: 0 }}>{user.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <div style={{ color: '#8B92A5', fontWeight: 500, fontSize: 13, padding: '10px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                  Edit Profile
                </div>
              </Link>
              <ShareButton slug={expert?.slug || ''} />
              <SignOutButton />
              <Link href="/create-product" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 22px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  + Create product
                </div>
              </Link>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total revenue', value: `€${totalRevenue.toFixed(2)}`, color: '#4DFFD2' },
              { label: 'Total clients', value: String(totalClients), color: '#A78BFA' },
              { label: 'Live products', value: String(publishedProducts), color: '#6385FF' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{kpi.label}</p>
                <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 24, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Overview', value: 'overview', href: '/dashboard' },
              { label: 'Analytics', value: 'analytics', href: '/dashboard?tab=analytics' },
            ].map(t => (
              <Link key={t.value} href={t.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 24px', fontSize: 13, fontWeight: 600,
                  color: activeTab === t.value ? '#E8EDF8' : '#6B7A99',
                  borderBottom: activeTab === t.value ? '2px solid #7C5CFC' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {t.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 48px' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Revenue last 6 months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#7C5CFC', fontSize: 10, fontWeight: 600 }}>{m.value > 0 ? `€${m.value}` : ''}</span>
                    <div style={{ width: '100%', height: `${Math.max((m.value / maxMonthly) * 80, 4)}px`, background: m.value > 0 ? '#7C5CFC' : '#F0EEE8', borderRadius: '4px 4px 0 0' }} />
                    <span style={{ color: '#9CA3AF', fontSize: 10 }}>{m.label}</span>
                  </div>
                ))}
              </div>
              {totalRevenue === 0 && <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 12 }}>No purchases yet — data will appear here when your first clients arrive.</p>}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Your products ({products.length})</p>
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>No products yet.</p>
                  <Link href="/create-product" style={{ textDecoration: 'none' }}>
                    <span style={{ background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 24px', borderRadius: 100 }}>+ Create your first product</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {products.map((product: any) => {
                    const questionCount = product.product_questions?.[0]?.count || 0
                    return (
                      <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#FAFAF8', borderRadius: 10, border: '1px solid #F0EEE8' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{product.title}</span>
                            <span style={{ background: product.is_published ? 'rgba(16,185,129,0.1)' : '#F0EEE8', color: product.is_published ? '#10B981' : '#9CA3AF', fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 100 }}>
                              {product.is_published ? '● Live' : '○ Draft'}
                            </span>
                          </div>
                          <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>€{product.price} · {product.pricing_model} · {questionCount} question{questionCount !== 1 ? 's' : ''}</p>
                        </div>
                        <PublishToggle productId={product.id} isPublished={product.is_published} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Recent purchases ({purchases.length})</p>
              {purchases.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 13 }}>No purchases yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {purchases.slice(0, 10).map((purchase: any) => (
                    <div key={purchase.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FAFAF8', borderRadius: 10, border: '1px solid #F0EEE8' }}>
                      <div>
                        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{purchase.products?.title || 'Product'}</span>
                        <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 10 }}>{new Date(purchase.created_at).toLocaleDateString('en-US')}</span>
                      </div>
                      <span style={{ color: '#7C5CFC', fontWeight: 700, fontSize: 14 }}>€{Number(purchase.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && analytics && (
          <>
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Revenue Trend — Last 6 months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#7C5CFC', fontSize: 10, fontWeight: 600 }}>{m.value > 0 ? `€${m.value}` : ''}</span>
                    <div style={{ width: '100%', height: `${Math.max((m.value / maxMonthly) * 100, 4)}px`, background: i === monthlyData.length - 1 ? 'linear-gradient(180deg,#7C5CFC,#4DFFD2)' : '#7C5CFC', opacity: i === monthlyData.length - 1 ? 1 : 0.4, borderRadius: '4px 4px 0 0' }} />
                    <span style={{ color: '#9CA3AF', fontSize: 10 }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Age Distribution</p>
                {Object.values(analytics.ageBuckets).every(v => v === 0) ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Not enough data — add birth dates to client profiles.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(analytics.ageBuckets).map(([label, count], i) => {
                      const total = Object.values(analytics.ageBuckets).reduce((a, b) => a + b, 0) || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS[i] }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#F0EEE8', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: 100 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Gender</p>
                {Object.values(analytics.sexBuckets).every(v => v === 0) ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Not enough data — add gender to client profiles.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(analytics.sexBuckets).map(([label, count], i) => {
                      const total = Object.values(analytics.sexBuckets).reduce((a, b) => a + b, 0) || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS[i] }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#F0EEE8', borderRadius: 100 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: 100 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Top Countries</p>
              {analytics.topCountries.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 13 }}>Not enough data — clients need to add their country in Account settings.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {analytics.topCountries.map((c: any, i: number) => (
                    <div key={c.country}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', minWidth: 18 }}>#{i + 1}</span>
                          <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{c.country}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{c.count} client{c.count !== 1 ? 's' : ''}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[i % COLORS.length], minWidth: 36, textAlign: 'right' }}>{c.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: '#F0EEE8', borderRadius: 100 }}>
                        <div style={{ height: '100%', width: `${c.pct}%`, background: COLORS[i % COLORS.length], borderRadius: 100 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Product Performance</p>
              {analytics.productPerformance.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 13 }}>No products yet.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 1fr', marginBottom: 8 }}>
                    {['Product', 'Sales', 'Revenue', 'Check-in Rate'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: 8 }}>{h}</div>
                    ))}
                  </div>
                  {analytics.productPerformance.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 1fr', alignItems: 'center', borderTop: '1px solid #F0EEE8', padding: '12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 28, background: COLORS[i % COLORS.length], borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{p.sales}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#7C5CFC' }}>€{p.revenue.toLocaleString()}</span>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.checkinRate >= 70 ? '#10B981' : p.checkinRate >= 40 ? '#F59E0B' : '#EF4444' }}>{p.checkinRate}%</span>
                        <div style={{ height: 4, background: '#F0EEE8', borderRadius: 100, width: 100, marginTop: 4 }}>
                          <div style={{ height: '100%', width: `${p.checkinRate}%`, background: p.checkinRate >= 70 ? '#10B981' : p.checkinRate >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 100 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Check-in Drop-off</p>
                <span style={{ fontSize: 11, color: '#6B7280' }}>% clients completing each week</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
                {analytics.dropoff.map((w: any, i: number) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{w.rate > 0 ? `${w.rate}%` : ''}</span>
                    <div style={{ width: '100%', height: `${Math.max(w.rate, 4)}%`, background: `rgba(124,92,252,${0.2 + (w.rate / 100) * 0.8})`, borderRadius: '4px 4px 0 0' }} />
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{w.week}</span>
                  </div>
                ))}
              </div>
              {analytics.dropoff.every((w: any) => w.rate === 0) && (
                <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 12 }}>No check-in data yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ background: '#1E2337', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>© 2025 Malyte · AI-powered wellness programs</p>
      </div>

    </main>
  )
}