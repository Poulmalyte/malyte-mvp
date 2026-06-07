'use client'

import { useEffect, useState } from 'react'

interface AttributionData {
  totals: {
    attributedOrders: number
    emailMatch: number
    productMatch: number
    temporalMatch: number
    unmatchedOrders: number
    attributionRate: number
  }
  dailyChart: { date: string; orders: number; revenue: number }[]
  recentOrders: any[]
}

const ATTR_COLORS: Record<string, string> = {
  email_match: 'var(--violet)',
  product_match: 'var(--success)',
  temporal_match: '#f59e0b',
}

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

function Card({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${accent ? accent + '40' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || 'var(--text)', fontFamily: 'Satoshi, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-light)' }}>{sub}</div>}
    </div>
  )
}

function MiniChart({ data, valueKey, color }: { data: any[]; valueKey: string; color: string }) {
  const last14 = data.slice(-14)
  const max = Math.max(...last14.map(d => d[valueKey]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
      {last14.map((d, i) => (
        <div key={i} style={{ flex: 1, position: 'relative' }} className="group">
          <div style={{
            height: `${Math.max((d[valueKey] / max) * 100, 4)}%`,
            background: color, borderRadius: 3, opacity: 0.8,
            transition: 'opacity 0.15s',
          }} />
        </div>
      ))}
    </div>
  )
}

export default function AdminAttributionPage() {
  const [data, setData] = useState<AttributionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/attribution').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Caricamento...</div>
    </div>
  )
  if (!data) return null

  const { totals, dailyChart, recentOrders } = data

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Attribution Monitor</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Verifica salute dell'attribution engine</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Total Attributed Orders" value={totals.attributedOrders} />
        <Card label="Email Match" value={totals.emailMatch} accent="var(--violet)" />
        <Card label="Product Match" value={totals.productMatch} accent="var(--success)" />
        <Card label="Temporal Match" value={totals.temporalMatch} accent="#f59e0b" />
        <Card label="Unmatched Orders" value={totals.unmatchedOrders} accent={totals.unmatchedOrders > 0 ? 'var(--danger)' : undefined} />
        <Card
          label="Attribution Rate"
          value={`${totals.attributionRate}%`}
          sub="attributed / total webhooks"
          accent={totals.attributionRate >= 70 ? 'var(--success)' : totals.attributionRate >= 40 ? '#f59e0b' : 'var(--danger)'}
        />
      </div>

      {dailyChart.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {[
            { title: 'Attributed Orders / Day', key: 'orders', color: 'var(--violet)' },
            { title: 'Revenue Influenced / Day', key: 'revenue', color: 'var(--neon2)' },
          ].map(({ title, key, color }) => (
            <div key={key} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 16 }}>{title}</div>
              <MiniChart data={dailyChart} valueKey={key} color={color} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted-light)', marginTop: 8 }}>
                <span>{dailyChart[0]?.date.slice(5)}</span>
                <span>{dailyChart[dailyChart.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Recent Attributed Orders
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              {['Order ID', 'Customer', 'Revenue', 'Attribution', 'Store', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px 16px', color: 'var(--muted-light)', textAlign: 'center' }}>Nessun ordine attribuito</td></tr>
            ) : recentOrders.map((o, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{o.shopify_order_number || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{o.customer_email}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--violet)' }}>{fmt(parseFloat(o.order_value) || 0)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ATTR_COLORS[o.attribution_type] || 'var(--muted)', background: (ATTR_COLORS[o.attribution_type] || '#999') + '15', padding: '3px 8px', borderRadius: 20 }}>
                    {(o.attribution_type || '').replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>{o.shopifyDomain}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted-light)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('it-IT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}