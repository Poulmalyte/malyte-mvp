'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Activity, RefreshCw } from 'lucide-react'

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

function HealthCard({
  label,
  value,
  sub,
  status = 'neutral',
}: {
  label: string
  value: string | number
  sub?: string
  status?: 'good' | 'warn' | 'error' | 'neutral'
}) {
  const colors = {
    good: 'border-emerald-500/20 bg-emerald-500/5',
    warn: 'border-amber-500/20 bg-amber-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    neutral: 'border-white/[0.06] bg-white/[0.02]',
  }
  const textColors = {
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    neutral: 'text-white',
  }
  const icons = {
    good: <CheckCircle size={14} className="text-emerald-400" />,
    warn: <AlertTriangle size={14} className="text-amber-400" />,
    error: <XCircle size={14} className="text-red-400" />,
    neutral: <Activity size={14} className="text-white/30" />,
  }

  return (
    <div className={`border rounded-xl p-5 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40 uppercase tracking-widest font-medium">{label}</span>
        {icons[status]}
      </div>
      <div className={`text-3xl font-bold ${textColors[status]}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/health')
      const d = await res.json()
      setData(d)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  )

  const s = data?.summary
  if (!s) return null

  const webhookStatus = s.webhookSuccessRate >= 95 ? 'good' : s.webhookSuccessRate >= 80 ? 'warn' : 'error'
  const errorStatus = s.recentErrorsCount === 0 ? 'good' : s.recentErrorsCount < 5 ? 'warn' : 'error'

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">System Health</h1>
          <p className="text-sm text-white/30 mt-0.5">
            Auto-refresh ogni 60s · Last: {lastRefresh.toLocaleTimeString('it-IT')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/70 text-sm transition-colors disabled:opacity-30"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <HealthCard
          label="Webhook Success Rate"
          value={`${s.webhookSuccessRate}%`}
          sub="ultimi 7 giorni"
          status={webhookStatus}
        />
        <HealthCard
          label="Webhook Failure Rate"
          value={`${s.webhookFailureRate}%`}
          sub="ultimi 7 giorni"
          status={s.webhookFailureRate === 0 ? 'good' : s.webhookFailureRate < 10 ? 'warn' : 'error'}
        />
        <HealthCard
          label="Orders Processed Today"
          value={s.ordersProcessedToday}
          sub="webhook success oggi"
          status="neutral"
        />
        <HealthCard
          label="Orders Failed Today"
          value={s.ordersFailedToday}
          sub="webhook failed oggi"
          status={s.ordersFailedToday === 0 ? 'good' : 'error'}
        />
        <HealthCard
          label="Attribution Jobs"
          value={s.attributionJobsProcessed}
          sub="processati (7d)"
          status="neutral"
        />
        <HealthCard
          label="Attribution Failures"
          value={s.attributionFailures}
          sub="falliti (7d)"
          status={s.attributionFailures === 0 ? 'good' : 'error'}
        />
        <HealthCard
          label="Recent Errors (24h)"
          value={s.recentErrorsCount}
          sub="attribution_errors"
          status={errorStatus}
        />
        <HealthCard
          label="System Status"
          value={webhookStatus === 'good' && errorStatus === 'good' ? '✓ OK' : '⚠ Check'}
          status={webhookStatus === 'good' && errorStatus === 'good' ? 'good' : 'warn'}
        />
      </div>

      {/* Failed Webhooks */}
      <Section title="Failed Webhooks" count={data?.failedWebhooks.length || 0}>
        {(data?.failedWebhooks || []).length === 0 ? (
          <EmptyState text="Nessun webhook fallito" good />
        ) : (
          <Table
            headers={['Store', 'Topic', 'Error', 'Time']}
            rows={(data?.failedWebhooks || []).map(w => [
              w.shopify_domain || '—',
              <span key="topic" className="font-mono text-xs text-amber-400">{w.topic}</span>,
              <span key="err" className="text-red-400/80 text-xs truncate max-w-xs block">{w.error_message || '—'}</span>,
              new Date(w.received_at).toLocaleString('it-IT'),
            ])}
          />
        )}
      </Section>

      {/* Attribution Errors */}
      <Section title="Attribution Errors (unresolved)" count={data?.attributionErrors.length || 0} className="mt-6">
        {(data?.attributionErrors || []).length === 0 ? (
          <EmptyState text="Nessun errore di attribution" good />
        ) : (
          <Table
            headers={['Store', 'Order', 'Customer', 'Error Type', 'Message', 'Date']}
            rows={(data?.attributionErrors || []).map(e => [
              e.shopify_domain || '—',
              <span key="order" className="font-mono text-xs">{e.order_id?.slice(-8) || '—'}</span>,
              <span key="email" className="text-xs">{e.customer_email || '—'}</span>,
              <span key="type" className="text-xs text-amber-400">{e.error_type}</span>,
              <span key="msg" className="text-xs text-red-400/70 truncate max-w-[200px] block">{e.error_message || '—'}</span>,
              new Date(e.created_at).toLocaleString('it-IT'),
            ])}
          />
        )}
      </Section>
    </div>
  )
}

function Section({ title, count, children, className = '' }: { title: string; count: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-white/[0.06] rounded-xl overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
        <span className="text-sm font-medium text-white/70">{title}</span>
        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
            {count}
          </span>
        )}
      </div>
      <div className="p-0">{children}</div>
    </div>
  )
}

function EmptyState({ text, good }: { text: string; good?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-5 py-4 text-sm ${good ? 'text-emerald-400/60' : 'text-white/30'}`}>
      {good && <CheckCircle size={14} />}
      {text}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/[0.04]">
          {headers.map(h => (
            <th key={h} className="text-left px-5 py-3 text-xs text-white/30 uppercase tracking-wider font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-white/[0.02]">
            {row.map((cell, j) => (
              <td key={j} className="px-5 py-3 text-white/60 text-sm">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
