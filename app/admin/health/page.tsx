'use client'

import { useEffect, useState } from 'react'

interface HealthData {
  summary: {
    webhookSuccessRate: number
    webhookFailureRate: number
    ordersProcessedToday: number
    ordersFailedToday: number
    attributionJobsProcessed: number
    attributionFailures: number
    recentErrorsCount: number
  }
  failedWebhooks: any[]
  attributionErrors: any[]
}

function HealthCard({ label, value, sub, status }: { label: string; value: string | number; sub?: string; status?: 'good' | 'warn' | 'error' | 'neutral' }) {
  const colors = { good: 'var(--success)', warn: '#f59e0b', error: 'var(--danger)', neutral: 'var(--text)' }
  const borders = { good: '#10b98130', warn: '#f59e0b30', error: '#ef444430', neutral: 'var(--border)' }
  const s = status || 'neutral'
  return (
    <div style={{ background: '#fff', border: `1px solid ${borders[s]}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors[s], fontFamily: 'Satoshi, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, background: '#ef444415', color: 'var(--danger)', padding: '2px 8px', borderRadius: 20 }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div style={{ padding: '16px 20px', color: 'var(--success)', fontSize: 13 }}>✓ {text}</div>
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/health')
    const d = await res.json()
    setData(d)
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Caricamento...</div>
    </div>
  )
  if (!data) return null

  const s = data.summary
  const wsStatus = s.webhookSuccessRate >= 95 ? 'good' : s.webhookSuccessRate >= 80 ? 'warn' : 'error'
  const errStatus = s.recentErrorsCount === 0 ? 'good' : s.recentErrorsCount < 5 ? 'warn' : 'error'

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>System Health</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Auto-refresh ogni 60s · Last: {lastRefresh.toLocaleTimeString('it-IT')}</p>
        </div>
        <button onClick={load} disabled={loading} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
          opacity: loading ? 0.5 : 1,
        }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <HealthCard label="Webhook Success Rate" value={`${s.webhookSuccessRate}%`} sub="ultimi 7 giorni" status={wsStatus} />
        <HealthCard label="Webhook Failure Rate" value={`${s.webhookFailureRate}%`} sub="ultimi 7 giorni" status={s.webhookFailureRate === 0 ? 'good' : 'error'} />
        <HealthCard label="Orders Today" value={s.ordersProcessedToday} sub="webhook success" status="neutral" />
        <HealthCard label="Failed Today" value={s.ordersFailedToday} status={s.ordersFailedToday === 0 ? 'good' : 'error'} />
        <HealthCard label="Attribution Jobs" value={s.attributionJobsProcessed} sub="processati (7d)" status="neutral" />
        <HealthCard label="Attribution Failures" value={s.attributionFailures} status={s.attributionFailures === 0 ? 'good' : 'error'} />
        <HealthCard label="Recent Errors (24h)" value={s.recentErrorsCount} status={errStatus} />
        <HealthCard
          label="System Status"
          value={wsStatus === 'good' && errStatus === 'good' ? '✓ OK' : '⚠ Check'}
          status={wsStatus === 'good' && errStatus === 'good' ? 'good' : 'warn'}
        />
      </div>

      <Section title="Failed Webhooks" badge={data.failedWebhooks.length}>
        {data.failedWebhooks.length === 0 ? <EmptyRow text="Nessun webhook fallito" /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8f9fb' }}>
              {['Store', 'Topic', 'Error', 'Time'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.failedWebhooks.map((w, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{w.shopify_domain || '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#f59e0b' }}>{w.topic}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--danger)', fontSize: 12, maxWidth: 300 }}>{w.error_message || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted-light)', fontSize: 12 }}>{new Date(w.received_at).toLocaleString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Attribution Errors (unresolved)" badge={data.attributionErrors.length}>
        {data.attributionErrors.length === 0 ? <EmptyRow text="Nessun errore di attribution" /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8f9fb' }}>
              {['Store', 'Order', 'Error Type', 'Message', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.attributionErrors.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{e.shopify_domain || '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{e.order_id?.slice(-8) || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', background: '#f59e0b15', padding: '3px 8px', borderRadius: 20 }}>{e.error_type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--danger)', fontSize: 12 }}>{e.error_message || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted-light)', fontSize: 12 }}>{new Date(e.created_at).toLocaleString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}