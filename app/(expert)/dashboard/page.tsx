import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PublishToggle from './PublishToggle'

async function getExpertData(supabase: any, userId: string) {
  // Expert profile
  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', userId)
    .single()

  // Products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('expert_id', userId)
    .order('created_at', { ascending: false })

  const productIds = products?.map((p: any) => p.id) || []

  // Purchases
  const { data: purchases } = productIds.length > 0
    ? await supabase
        .from('purchases')
        .select('*, products(title)')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // KPIs
  const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0
  const totalClients = new Set(purchases?.map((p: any) => p.client_id)).size
  const publishedProducts = products?.filter((p: any) => p.is_published).length || 0

  // Monthly revenue (last 6 months)
  const monthlyData = buildMonthlyData(purchases || [])

  return { expert, products: products || [], purchases: purchases || [], totalRevenue, totalClients, publishedProducts, monthlyData }
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
    label: new Date(key + '-01').toLocaleDateString('it-IT', { month: 'short' }),
    value,
  }))
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { expert, products, purchases, totalRevenue, totalClients, publishedProducts, monthlyData } = await getExpertData(supabase, user.id)

  const maxMonthly = Math.max(...monthlyData.map(m => m.value), 1)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ color: 'var(--neon)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22 }}>maly<span style={{ color: 'var(--neon)' }}>te</span></span>
          </div>
          <h1 style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 4px 0' }}>
            Benvenuto {expert?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
            Sei loggato come <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          <KpiCard label="Guadagni totali" value={`€${totalRevenue.toFixed(2)}`} accent="#4DFFD2" icon="€" />
          <KpiCard label="Clienti totali" value={String(totalClients)} accent="#7C5CFC" icon="👤" />
          <KpiCard label="Prodotti live" value={String(publishedProducts)} accent="#6385FF" icon="✦" />
        </div>

        {/* Grafico guadagni */}
        <Section title="Guadagni ultimi 6 mesi">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120, padding: '0 4px' }}>
            {monthlyData.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#4DFFD2', fontSize: 11, fontWeight: 600 }}>
                  {m.value > 0 ? `€${m.value}` : ''}
                </span>
                <div style={{
                  width: '100%',
                  height: `${Math.max((m.value / maxMonthly) * 90, 4)}px`,
                  background: m.value > 0
                    ? 'linear-gradient(180deg, #4DFFD2, #7C5CFC)'
                    : 'rgba(99,130,255,0.1)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s',
                }} />
                <span style={{ color: '#6B7A99', fontSize: 11 }}>{m.label}</span>
              </div>
            ))}
          </div>
          {totalRevenue === 0 && (
            <p style={{ color: '#6B7A99', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
              Nessun acquisto ancora — i dati appariranno qui quando arriveranno i primi clienti.
            </p>
          )}
        </Section>

        {/* Prodotti */}
        <Section title={`I tuoi prodotti (${products.length})`}>
          {products.length === 0 ? (
            <p style={{ color: '#6B7A99', fontSize: 14 }}>Nessun prodotto ancora. <a href="/onboarding" style={{ color: '#7C5CFC' }}>Completa l'onboarding</a> per crearne uno.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {products.map((product: any) => (
                <div key={product.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'var(--surface2)',
                  borderRadius: 12,
                  border: '1px solid rgba(99,130,255,0.08)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{product.title}</span>
                      <span style={{
                        background: product.is_published ? 'rgba(77,255,210,0.1)' : 'rgba(107,122,153,0.15)',
                        color: product.is_published ? '#4DFFD2' : '#6B7A99',
                        fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 100,
                      }}>
                        {product.is_published ? '● Live' : '○ Bozza'}
                      </span>
                    </div>
                    <div style={{ color: '#6B7A99', fontSize: 13 }}>
                      €{product.price} · {product.pricing_model}
                      {!product.ai_generated_content && (
                        <span style={{ color: '#FF6B6B', marginLeft: 12 }}>⚠ Contenuto AI non generato</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!product.ai_generated_content && (
                      <a href="/generate" style={{
                        color: '#7C5CFC', fontSize: 13, fontWeight: 600,
                        padding: '6px 14px', border: '1px solid rgba(124,92,252,0.4)',
                        borderRadius: 100, textDecoration: 'none',
                      }}>
                        Genera AI →
                      </a>
                    )}
                    <PublishToggle productId={product.id} isPublished={product.is_published} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Ultimi acquisti */}
        <Section title={`Ultimi acquisti (${purchases.length})`}>
          {purchases.length === 0 ? (
            <p style={{ color: '#6B7A99', fontSize: 14 }}>Nessun acquisto ancora. Arriveranno dopo l'integrazione Stripe al Giorno 8.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {purchases.slice(0, 10).map((purchase: any) => (
                <div key={purchase.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--surface2)',
                  borderRadius: 10,
                }}>
                  <div>
                    <span style={{ color: 'var(--text)', fontSize: 14 }}>{purchase.products?.title || 'Prodotto'}</span>
                    <span style={{ color: '#6B7A99', fontSize: 12, marginLeft: 12 }}>
                      {new Date(purchase.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <span style={{ color: '#4DFFD2', fontWeight: 600, fontSize: 15 }}>€{Number(purchase.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Azioni rapide */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
          <a href="/generate" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)',
              borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>Genera / Rigenera AI</div>
              <div style={{ color: '#6B7A99', fontSize: 13, marginTop: 4 }}>Aggiorna il contenuto del tuo prodotto</div>
            </div>
          </a>
          <a href="/onboarding" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid rgba(99,130,255,0.15)',
              borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚙</div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>Aggiorna metodologia</div>
              <div style={{ color: '#6B7A99', fontSize: 13, marginTop: 4 }}>Modifica profilo e prodotto</div>
            </div>
          </a>
        </div>

      </div>
    </main>
  )
}

// Componenti helper
function KpiCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent}30`,
      borderRadius: 16,
      padding: '24px 20px',
    }}>
      <div style={{ color: accent, fontSize: 22, marginBottom: 12 }}>{icon}</div>
      <div style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, marginBottom: 4 }}>{value}</div>
      <div style={{ color: '#6B7A99', fontSize: 13 }}>{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        color: '#6385FF', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        margin: '0 0 12px 0',
      }}>{title}</h2>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '20px',
        border: '1px solid rgba(99,130,255,0.1)',
      }}>
        {children}
      </div>
    </div>
  )
}