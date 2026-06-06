'use client'

import { useEffect, useState } from 'react'

interface OverviewData {
  totalSellers: number
  activeSellers: number
  totalCustomers: number
  totalQuizCompletions: number
  totalCheckins: number
  totalAttributedOrders: number
  totalRevenueInfluenced: number
  last30dRevenueInfluenced: number
  last30dCustomerGrowth: number
}

function Card({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${accent ? 'var(--violet-light)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? 'var(--violet)' : 'var(--text)', fontFamily: 'Satoshi, sans-serif' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-light)' }}>{sub}</div>}
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Caricamento...</div>
    </div>
  )

  if (!data) return <div style={{ padding: 32, color: 'var(--danger)' }}>Errore nel caricamento</div>

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Platform-wide metrics — live</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card label="Total Sellers" value={data.totalSellers} sub={`${data.activeSellers} attivi ultimi 30gg`} />
        <Card label="Active Sellers" value={data.activeSellers} sub="≥1 quiz in 30 giorni" />
        <Card label="Total Customers" value={data.totalCustomers.toLocaleString()} sub={`+${data.last30dCustomerGrowth} ultimi 30gg`} />
        <Card label="Quiz Completions" value={data.totalQuizCompletions.toLocaleString()} />
        <Card label="Check-ins Completed" value={data.totalCheckins.toLocaleString()} />
        <Card label="Orders Influenced" value={data.totalAttributedOrders.toLocaleString()} />
        <Card label="Total Revenue Influenced" value={fmt(data.totalRevenueInfluenced)} accent />
        <Card label="Revenue (Last 30d)" value={fmt(data.last30dRevenueInfluenced)} sub="ultimi 30 giorni" accent />
        <Card label="Customer Growth (30d)" value={data.last30dCustomerGrowth.toLocaleString()} sub="nuovi email unici" />
      </div>

      <div style={{
        marginTop: 32, background: '#fff', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Formule
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Active Seller', 'merchant con ≥1 quiz negli ultimi 30gg'],
            ['Customer', 'email unica in customers'],
            ['Revenue Influenced', 'SUM(attributed_orders.order_value)'],
            ['Orders Influenced', 'COUNT(attributed_orders)'],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{k}</span> — {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}