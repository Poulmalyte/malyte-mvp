'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface SellerDetail {
  merchant: any
  stats: {
    customers: number
    quizCompletions: number
    checkinsCompleted: number
    ordersInfluenced: number
    revenueInfluenced: number
    conversionRate: number
  }
  attribution: {
    emailMatch: { count: number; revenue: number }
    productMatch: { count: number; revenue: number }
    temporalMatch: { count: number; revenue: number }
  }
  recentOrders: any[]
  recentCheckins: any[]
}

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(2)}`
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'Satoshi, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-light)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function AttrBar({ label, count, revenue, total }: { label: string; count: number; revenue: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{count} orders · {fmt(revenue)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--violet)', borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function SellerDetailPage() {
  const params = useParams()
  const sellerId = params.seller_id as string

  const [data, setData] = useState<SellerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'orders' | 'checkins'>('orders')

  useEffect(() => {
    fetch(`/api/admin/sellers/${sellerId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [sellerId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Caricamento...</div>
    </div>
  )

  if (!data?.merchant) return (
    <div style={{ padding: 32, color: 'var(--danger)', fontSize: 14 }}>Seller non trovato</div>
  )

  const { merchant, stats, attribution, recentOrders, recentCheckins } = data
  const totalAttr = attribution.emailMatch.count + attribution.productMatch.count + attribution.temporalMatch.count

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <Link href="/admin/sellers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        ← Back to Sellers
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {merchant.name || merchant.shopify_shop_domain}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{merchant.shopify_shop_domain}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
          <div>Installato: {new Date(merchant.created_at).toLocaleDateString('it-IT')}</div>
          <div style={{ marginTop: 4 }}>Categoria: <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{merchant.category || '—'}</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <Stat label="Customers" value={stats.customers} />
        <Stat label="Quiz Completions" value={stats.quizCompletions} />
        <Stat label="Check-ins Completed" value={stats.checkinsCompleted} />
        <Stat label="Orders Influenced" value={stats.ordersInfluenced} />
        <Stat label="Revenue Influenced" value={fmt(stats.revenueInfluenced)} />
        <Stat label="Conversion Rate" value={`${stats.conversionRate}%`} sub="customers → buyer" />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          Attribution Breakdown
        </div>
        <AttrBar label="Email Match" count={attribution.emailMatch.count} revenue={attribution.emailMatch.revenue} total={totalAttr} />
        <AttrBar label="Product Match" count={attribution.productMatch.count} revenue={attribution.productMatch.revenue} total={totalAttr} />
        <AttrBar label="Temporal Match" count={attribution.temporalMatch.count} revenue={attribution.temporalMatch.revenue} total={totalAttr} />
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
        {(['orders', 'checkins'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--violet)' : 'transparent'}`,
            color: tab === t ? 'var(--violet)' : 'var(--muted)', marginBottom: -1,
          }}>
            {t === 'orders' ? `Recent Orders (${recentOrders.length})` : `Recent Check-ins (${recentCheckins.length})`}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {tab === 'orders' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                {['Order ID', 'Customer', 'Revenue', 'Attribution', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted-light)' }}>Nessun ordine</td></tr>
              ) : recentOrders.map((o, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{o.shopify_order_number || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{o.customer_email}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--violet)' }}>{fmt(parseFloat(o.order_value) || 0)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--violet)', background: 'var(--violet-dim)', padding: '3px 8px', borderRadius: 20 }}>
                      {(o.attribution_type || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted-light)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'checkins' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                {['Customer', 'Status', 'Completed'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCheckins.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted-light)' }}>Nessun check-in</td></tr>
              ) : recentCheckins.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{c.customer_email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: '#10b98115', padding: '3px 8px', borderRadius: 20 }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted-light)', fontSize: 12 }}>
                    {c.completed_at ? new Date(c.completed_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}