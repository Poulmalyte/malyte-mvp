'use client'

import { useEffect, useState } from 'react'

interface Segment {
  segment: string
  label: string
  customers: number
  revenue: number
  revenuePerCustomer: number
  ordersPerCustomer: number
  repeatPurchaseRate: number
  averageOrderValue: number
  avgDaysBetweenOrders: number
}

interface Merchant {
  id: string
  name: string
  shopify_shop_domain: string
}

const SEG_COLORS = ['var(--muted)', 'var(--violet)', 'var(--success)', 'var(--neon2)']
const SEG_BG = ['#f8f9fb', 'var(--violet-dim)', '#d1fdf3', '#eef2ff']
const SEG_BORDER = ['var(--border)', 'var(--violet-light)', 'var(--neon)', 'var(--neon2)']

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 28, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, borderRadius: 8, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function AdminEngagementPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/sellers?page=1&limit=100')
      .then(r => r.json())
      .then(d => setMerchants(d.sellers || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = selectedMerchant === 'all'
      ? '/api/admin/engagement'
      : `/api/admin/engagement?merchant_id=${selectedMerchant}`
    fetch(url).then(r => r.json()).then(d => { setSegments(d.segments || []); setLoading(false) })
  }, [selectedMerchant])

  const maxRev = Math.max(...segments.map(s => s.revenuePerCustomer), 1)
  const maxRepeat = Math.max(...segments.map(s => s.repeatPurchaseRate), 1)

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Customer Engagement</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>L'engagement con i check-in correla con il revenue?</p>
        </div>
        <select
          value={selectedMerchant}
          onChange={e => setSelectedMerchant(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: '#fff', fontSize: 13, color: 'var(--text)', cursor: 'pointer',
            minWidth: 200,
          }}
        >
          <option value="all">Tutti i brand</option>
          {merchants.map((m: any) => (
            <option key={m.id} value={m.id}>{m.shopName || m.shopify_shop_domain}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Caricamento...</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {segments.map((s, i) => (
              <div key={s.segment} style={{
                background: SEG_BG[i], border: `1px solid ${SEG_BORDER[i]}`,
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: SEG_COLORS[i], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Segment {s.segment}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'Satoshi, sans-serif' }}>{s.customers}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>customers</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Revenue', value: fmt(s.revenue) },
                    { label: 'Rev/Customer', value: fmt(s.revenuePerCustomer), highlight: i > 0 },
                    { label: 'Orders/Customer', value: s.ordersPerCustomer.toFixed(1) },
                    { label: 'Repeat Rate', value: `${s.repeatPurchaseRate}%`, highlight: s.repeatPurchaseRate > 30 },
                    { label: 'Avg AOV', value: fmt(s.averageOrderValue) },
                    { label: 'Days Between', value: s.avgDaysBetweenOrders > 0 ? `${s.avgDaysBetweenOrders}d` : '—' },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '10px 8px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: highlight ? SEG_COLORS[i] : 'var(--text)' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Revenue per Customer per Segment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {segments.map((s, i) => (
                <div key={s.segment} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 72, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Seg {s.segment}</div>
                  <Bar value={s.revenuePerCustomer} max={maxRev} color={SEG_COLORS[i]} />
                  <div style={{ width: 60, fontSize: 12, fontWeight: 600, color: SEG_COLORS[i], textAlign: 'right', flexShrink: 0 }}>
                    {fmt(s.revenuePerCustomer)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Repeat Purchase Rate per Segment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {segments.map((s, i) => (
                <div key={s.segment} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 72, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Seg {s.segment}</div>
                  <Bar value={s.repeatPurchaseRate} max={maxRepeat} color={SEG_COLORS[i]} />
                  <div style={{ width: 60, fontSize: 12, fontWeight: 600, color: SEG_COLORS[i], textAlign: 'right', flexShrink: 0 }}>
                    {s.repeatPurchaseRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--violet-dim)', border: '1px solid var(--violet-light)', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--violet)', lineHeight: 1.6 }}>
              <strong>Come leggere:</strong> se il Segment D (4+ check-in) mostra revenue/customer e repeat rate più alti di A, i check-in stanno generando LTV reale. Usalo nel pitch ai brand.
            </p>
          </div>
        </>
      )}
    </div>
  )
}