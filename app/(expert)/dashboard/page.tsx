import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PublishToggle from './PublishToggle'
import ShareButton from './ShareButton'
import ProfileMenu from './ProfileMenu'
import IbanForm from './IbanForm'
import MethodSection from './MethodSection'
import RevenueChart from './RevenueChart'
import AccountSettings from './AccountSettings'
import ProfileSection from './ProfileSection'
import Footer from '@/components/Footer'

async function getExpertData(supabase: any, userId: string) {
  const { data: expert } = await supabase.from('experts').select('*').eq('id', userId).single()
  const { data: products } = await supabase.from('products').select('*, product_questions(count)').eq('expert_id', userId).order('created_at', { ascending: false })
  const productIds = products?.map((p: any) => p.id) || []
  const { data: purchases } = productIds.length > 0
    ? await supabase.from('purchases').select('*, products(title)').in('product_id', productIds).order('created_at', { ascending: false })
    : { data: [] }
  const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0
  const totalClients = new Set(purchases?.map((p: any) => p.client_id)).size
  const publishedProducts = products?.filter((p: any) => p.is_published).length || 0
  const monthlyData = buildMonthlyData(purchases || [])
  const soldByProduct: Record<string, number> = {}
  for (const p of purchases || []) {
    soldByProduct[p.product_id] = (soldByProduct[p.product_id] || 0) + 1
  }
  return { expert, products: products || [], purchases: purchases || [], totalRevenue, totalClients, publishedProducts, monthlyData, soldByProduct }
}

async function getClientsData(supabase: any, purchases: any[]) {
  const clientIds = [...new Set(purchases.map((p: any) => p.client_id))] as string[]
  if (clientIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, country, birth_date, sex')
    .in('id', clientIds)

  const { data: clientPlans } = await supabase
    .from('client_plans')
    .select('id, purchase_id, current_week')
    .in('purchase_id', purchases.map((p: any) => p.id))

  const profileMap: Record<string, any> = {}
  profiles?.forEach((p: any) => { profileMap[p.id] = p })

  const planMap: Record<string, any> = {}
  clientPlans?.forEach((cp: any) => { planMap[cp.purchase_id] = cp })

  return clientIds.map((clientId) => {
    const profile = profileMap[clientId] || {}
    const clientPurchases = purchases.filter((p: any) => p.client_id === clientId)
    const totalSpent = clientPurchases.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const latestPurchase = clientPurchases[0]
    const plan = planMap[latestPurchase?.id]
    return {
      clientId,
      name: profile.full_name || null,
      email: profile.email || null,
      country: profile.country || null,
      purchases: clientPurchases,
      totalSpent,
      latestProduct: latestPurchase?.products?.title || '—',
      latestPurchaseDate: latestPurchase?.created_at || null,
      currentWeek: plan?.current_week || null,
    }
  })
}

async function getAnalyticsData(supabase: any, userId: string, purchases: any[], products: any[]) {
  const clientIds = [...new Set(purchases.map((p: any) => p.client_id))]
  const { data: profiles } = clientIds.length > 0
    ? await supabase.from('profiles').select('birth_date, sex, country').in('id', clientIds)
    : { data: [] }
  const { data: checkins } = purchases.length > 0
    ? await supabase.from('weekly_checkins').select('week_number, purchase_id').in('purchase_id', purchases.map((p: any) => p.id))
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
  profiles?.forEach((p: any) => { if (p.country) countryMap[p.country] = (countryMap[p.country] || 0) + 1 })
  const totalWithCountry = Object.values(countryMap).reduce((a, b) => a + b, 0) || 1
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([country, count]) => ({ country, count, pct: Math.round((count / totalWithCountry) * 100) }))

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
    const pp = purchases.filter((pur: any) => pur.product_id === p.id)
    const revenue = pp.reduce((s: number, pur: any) => s + Number(pur.amount || 0), 0)
    const pc = checkins?.filter((c: any) => pp.some((pur: any) => pur.id === c.purchase_id)) || []
    const checkinRate = pp.length > 0 ? Math.round((new Set(pc.map((c: any) => c.purchase_id)).size / pp.length) * 100) : 0
    return { name: p.title, sales: pp.length, revenue, checkinRate }
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

function buildProductMonthlyData(purchases: any[], products: any[]) {
  const now = new Date()
  const monthKeys: string[] = []
  const monthLabels: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }))
  }
  return products.map((product: any) => ({
    name: product.title,
    data: monthKeys.map((key, i) => {
      const val = purchases
        .filter((p: any) => {
          const d = new Date(p.created_at)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return p.product_id === product.id && k === key
        })
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      return { label: monthLabels[i], value: val }
    }),
  }))
}

const COLORS = ['#7C5CFC', '#4DFFD2', '#A78BFA', '#6385FF', '#F59E0B']

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const activeTab = tab === 'analytics' ? 'analytics'
    : tab === 'settings' ? 'settings'
    : tab === 'method' ? 'method'
    : tab === 'clients' ? 'clients'
    : tab === 'profile' ? 'profile'
    : 'overview'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isGoogleUser = user.app_metadata?.provider === 'google'

  const { expert, products, purchases, totalRevenue, totalClients, publishedProducts, monthlyData, soldByProduct } =
    await getExpertData(supabase, user.id)

  const productMonthlyData = buildProductMonthlyData(purchases, products)

  const analytics = activeTab === 'analytics'
    ? await getAnalyticsData(supabase, user.id, purchases, products)
    : null

  const clients = activeTab === 'clients'
    ? await getClientsData(supabase, purchases)
    : null

  const methodCompleted = expert?.method_onboarding_completed === true

  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 16,
    border: '1px solid #E8EDF8', padding: '16px', marginBottom: 12,
  }

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 14px 0 0 !important; }
          .dash-actions { width: 100% !important; justify-content: flex-start !important; flex-wrap: wrap !important; }
          .dash-title { font-size: 20px !important; }
          .dash-kpi { grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; }
          .dash-kpi-value { font-size: 18px !important; }
          .dash-kpi-label { font-size: 10px !important; }
          .dash-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .dash-tabs a { flex-shrink: 0 !important; }
          .dash-tab { padding: 10px 14px !important; font-size: 12px !important; white-space: nowrap !important; }
          .dash-body { padding: 16px 12px 48px !important; }
          .dash-banner { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .dash-banner-btn { width: 100% !important; text-align: center !important; }
          .analytics-grid { grid-template-columns: 1fr !important; }
          .method-warning { font-size: 11px !important; padding: 8px 14px !important; }
        }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 16px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 0' }}>
              <div>
                <Link href="/" style={{ textDecoration: 'none' }}>
                  <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', cursor: 'pointer' }}>
                    malyte<span style={{ color: '#7C5CFC' }}>.</span>
                  </span>
                </Link>
                <h1 className="dash-title" style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '4px 0 2px' }}>
                  Welcome back{expert?.name ? `, ${expert.name.split(' ')[0]}` : ''} 👋
                </h1>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>{user.email}</p>
              </div>
              <div className="dash-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShareButton url={`https://malyte.com/expert/${expert?.slug || ''}`} />
                {methodCompleted ? (
                  <Link href="/create-product" style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                      + Create product
                    </div>
                  </Link>
                ) : (
                  <Link href="/dashboard?tab=method" style={{ textDecoration: 'none' }}>
                    <div className="method-warning" style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: 12, padding: '9px 16px', borderRadius: 100, whiteSpace: 'nowrap', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 5 }}>
                      ⚠️ Complete My Method first
                    </div>
                  </Link>
                )}
                <ProfileMenu name={expert?.name || ''} email={user.email || ''} slug={expert?.slug || ''} />
              </div>
            </div>

            <div className="dash-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '16px 0 0' }}>
              {[
                { label: 'Total revenue', value: `€${totalRevenue.toFixed(2)}`, color: '#7C5CFC', bg: '#EDE9FE' },
                { label: 'Total customers', value: String(totalClients), color: '#059669', bg: '#D1FDF3' },
                { label: 'Live products', value: String(publishedProducts), color: '#6385FF', bg: '#EEF2FF' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: kpi.bg, borderRadius: 10, padding: '12px 14px' }}>
                  <p className="dash-kpi-label" style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500 }}>{kpi.label}</p>
                  <p className="dash-kpi-value" style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 22, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="dash-tabs" style={{ display: 'flex', gap: 0, marginTop: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as any}>
              {[
                { label: 'Overview', value: 'overview', href: '/dashboard' },
                { label: 'Customers', value: 'clients', href: '/dashboard?tab=clients' },
                { label: 'Analytics', value: 'analytics', href: '/dashboard?tab=analytics' },
                { label: 'My Method', value: 'method', href: '/dashboard?tab=method' },
                { label: 'Profile', value: 'profile', href: '/dashboard?tab=profile' },
                { label: 'Settings', value: 'settings', href: '/dashboard?tab=settings' },
              ].map(t => (
                <Link key={t.value} href={t.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="dash-tab" style={{
                    padding: '12px 20px', fontSize: 13, fontWeight: 600,
                    color: activeTab === t.value ? '#7C5CFC' : '#94A3B8',
                    borderBottom: activeTab === t.value ? '2px solid #7C5CFC' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}>
                    {t.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-body" style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 48px' }}>

          {activeTab === 'overview' && (
            <>
              {!methodCompleted && (
                <div className="dash-banner" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#92400E', margin: '0 0 2px' }}>Complete your method to start selling</p>
                      <p style={{ fontSize: 12, color: '#B45309', margin: 0 }}>Upload your PDFs, answer the questions, and create your first product.</p>
                    </div>
                  </div>
                  <Link href="/dashboard?tab=method" style={{ textDecoration: 'none', flexShrink: 0 }} className="dash-banner-btn">
                    <div style={{ background: '#D97706', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                      Go to My Method →
                    </div>
                  </Link>
                </div>
              )}

              <div style={card}>
                <RevenueChart monthlyData={monthlyData} productData={productMonthlyData} />
              </div>

              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Your products ({products.length})</p>
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 14 }}>No products yet.</p>
                    {methodCompleted ? (
                      <Link href="/create-product" style={{ textDecoration: 'none' }}>
                        <span style={{ background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 24px', borderRadius: 100 }}>+ Create your first product</span>
                      </Link>
                    ) : (
                      <Link href="/dashboard?tab=method" style={{ textDecoration: 'none' }}>
                        <span style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 100, border: '1px solid #FDE68A' }}>⚠️ Complete My Method first</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {products.map((product: any) => {
                      const questionCount = product.product_questions?.[0]?.count || 0
                      const sold = soldByProduct[product.id] || 0
                      return (
                        <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F5F7FA', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{product.title}</span>
                              {sold > 0 && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 100 }}>
                                  {sold} sold
                                </span>
                              )}
                            </div>
                            <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>
                              €{product.price} · {product.pricing_model} · {questionCount} q
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <ShareButton url={`https://malyte.com/product/${product.id}`} label="Share" />
                            <PublishToggle productId={product.id} isPublished={product.is_published} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Recent purchases ({purchases.length})</p>
                {purchases.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 13 }}>No purchases yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {purchases.slice(0, 10).map((purchase: any) => (
                      <div key={purchase.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F5F7FA', borderRadius: 8, border: '1px solid #E8EDF8' }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 160 }}>{purchase.products?.title || 'Product'}</span>
                          <span style={{ color: '#94A3B8', fontSize: 10 }}>{new Date(purchase.created_at).toLocaleDateString('en-US')}</span>
                        </div>
                        <span style={{ color: '#7C5CFC', fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>€{Number(purchase.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'clients' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Your customers ({clients?.length || 0})
                </p>
                {(clients?.length || 0) > 0 && (
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    €{clients!.reduce((s, c) => s + c.totalSpent, 0).toFixed(2)} total revenue
                  </span>
                )}
              </div>
              {!clients || clients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                  <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 6 }}>No customers yet.</p>
                  <p style={{ color: '#CBD5E1', fontSize: 12 }}>Your customers will appear here once they purchase a plan.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {clients.map((client) => {
                    const initials = client.name
                      ? client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?'
                    const shortId = client.clientId.slice(0, 8)
                    return (
                      <div key={client.clientId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                              {client.name || `Customer #${shortId}`}
                            </span>
                            {client.country && (
                              <span style={{ fontSize: 10, color: '#94A3B8', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>{client.country}</span>
                            )}
                            {client.currentWeek && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#7C5CFC', background: '#EDE9FE', padding: '1px 6px', borderRadius: 4 }}>Week {client.currentWeek}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#64748B' }}>{client.latestProduct}</span>
                            {client.latestPurchaseDate && (
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>· {new Date(client.latestPurchaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            )}
                            {client.purchases.length > 1 && (
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>· {client.purchases.length} purchases</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#7C5CFC', margin: '0 0 2px' }}>€{client.totalSpent.toFixed(2)}</p>
                          <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>total spent</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <>
              <div style={card}>
                <RevenueChart monthlyData={monthlyData} productData={productMonthlyData} />
              </div>
              <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { title: 'Age Distribution', data: analytics.ageBuckets, empty: 'Not enough data yet.' },
                  { title: 'Gender', data: analytics.sexBuckets, empty: 'Not enough data yet.' },
                ].map(({ title, data, empty }) => (
                  <div key={title} style={{ ...card, marginBottom: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{title}</p>
                    {Object.values(data).every(v => v === 0) ? (
                      <p style={{ color: '#94A3B8', fontSize: 12 }}>{empty}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(data).map(([label, count], i) => {
                          const total = Object.values(data).reduce((a: number, b) => a + (b as number), 0) || 1
                          const pct = Math.round(((count as number) / total) * 100)
                          return (
                            <div key={label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#64748B' }}>{label}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS[i] }}>{pct}%</span>
                              </div>
                              <div style={{ height: 5, background: '#E8EDF8', borderRadius: 100 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: 100 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Top Countries</p>
                {analytics.topCountries.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 12 }}>Not enough data yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analytics.topCountries.map((c: any, i: number) => (
                      <div key={c.country}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', minWidth: 16 }}>#{i + 1}</span>
                            <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{c.country}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{c.pct}%</span>
                        </div>
                        <div style={{ height: 5, background: '#E8EDF8', borderRadius: 100 }}>
                          <div style={{ height: '100%', width: `${c.pct}%`, background: COLORS[i % COLORS.length], borderRadius: 100 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Product Performance</p>
                {analytics.productPerformance.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 12 }}>No products yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analytics.productPerformance.map((p: any, i: number) => (
                      <div key={i} style={{ borderTop: i > 0 ? '1px solid #E8EDF8' : 'none', paddingTop: i > 0 ? 10 : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 4, height: 24, background: COLORS[i % COLORS.length], borderRadius: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC' }}>€{p.revenue.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, paddingLeft: 12 }}>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.sales} sales</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: p.checkinRate >= 70 ? '#059669' : p.checkinRate >= 40 ? '#D97706' : '#EF4444' }}>{p.checkinRate}% check-in</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Check-in Drop-off</p>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>% per week</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                  {analytics.dropoff.map((w: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${Math.max(w.rate, 4)}%`, background: `rgba(124,92,252,${0.15 + (w.rate / 100) * 0.85})`, borderRadius: '3px 3px 0 0' }} />
                      <span style={{ fontSize: 9, color: '#94A3B8' }}>{w.week}</span>
                    </div>
                  ))}
                </div>
                {analytics.dropoff.every((w: any) => w.rate === 0) && (
                  <p style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 10 }}>No check-in data yet.</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'method' && <MethodSection expert={expert} />}

          {activeTab === 'profile' && (
            <div style={card}>
              <ProfileSection />
            </div>
          )}

          {activeTab === 'settings' && (
            <>
              <AccountSettings email={user.email || ''} isGoogleUser={isGoogleUser} />
              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Payout settings</p>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
                  Enter your IBAN to receive payments. Payouts are processed manually by the Malyte team within 5 business days.
                </p>
                <IbanForm currentIban={expert?.iban || ''} expertId={user.id} />
              </div>
            </>
          )}
        </div>

        <Footer />
      </main>
    </>
  )
}