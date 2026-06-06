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

const SEGMENT_COLORS = ['text-white/40', 'text-blue-400', 'text-emerald-400', 'text-purple-400']
const SEGMENT_BG = ['bg-white/[0.02]', 'bg-blue-500/5', 'bg-emerald-500/5', 'bg-purple-500/5']
const SEGMENT_BORDER = ['border-white/[0.06]', 'border-blue-500/20', 'border-emerald-500/20', 'border-purple-500/20']
const SEGMENT_BAR = ['bg-white/20', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400']

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

export default function AdminEngagementPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then(r => r.json())
      .then(d => { setSegments(d.segments || []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  )

  const maxRevPerCustomer = Math.max(...segments.map(s => s.revenuePerCustomer), 1)
  const maxRepeat = Math.max(...segments.map(s => s.repeatPurchaseRate), 1)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Customer Engagement</h1>
        <p className="text-sm text-white/30 mt-0.5">
          L'engagement con i check-in correla con il revenue? Scoprilo qui.
        </p>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {segments.map((s, i) => (
          <div key={s.segment} className={`border rounded-xl p-5 ${SEGMENT_BG[i]} ${SEGMENT_BORDER[i]}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`text-xs font-bold uppercase tracking-widest ${SEGMENT_COLORS[i]}`}>
                  Segment {s.segment}
                </span>
                <div className="text-sm text-white/60 mt-0.5">{s.label}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{s.customers}</div>
                <div className="text-xs text-white/30">customers</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Revenue" value={fmt(s.revenue)} />
              <Metric label="Rev/Customer" value={fmt(s.revenuePerCustomer)} highlight={i > 0} />
              <Metric label="Orders/Customer" value={s.ordersPerCustomer.toFixed(1)} />
              <Metric label="Repeat Rate" value={`${s.repeatPurchaseRate}%`} highlight={s.repeatPurchaseRate > 30} />
              <Metric label="Avg AOV" value={fmt(s.averageOrderValue)} />
              <Metric label="Days Between" value={s.avgDaysBetweenOrders > 0 ? `${s.avgDaysBetweenOrders}d` : '—'} />
            </div>
          </div>
        ))}
      </div>

      {/* Comparison chart - Revenue per Customer */}
      <div className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02] mb-4">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-5">
          Revenue per Customer per Segment
        </h2>
        <div className="space-y-3">
          {segments.map((s, i) => (
            <div key={s.segment} className="flex items-center gap-4">
              <div className="w-20 text-xs text-white/40 shrink-0">Seg {s.segment}</div>
              <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${SEGMENT_BAR[i]} rounded-lg transition-all duration-700`}
                  style={{ width: `${(s.revenuePerCustomer / maxRevPerCustomer) * 100}%` }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 font-mono">
                  {fmt(s.revenuePerCustomer)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison chart - Repeat Purchase Rate */}
      <div className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-5">
          Repeat Purchase Rate per Segment
        </h2>
        <div className="space-y-3">
          {segments.map((s, i) => (
            <div key={s.segment} className="flex items-center gap-4">
              <div className="w-20 text-xs text-white/40 shrink-0">Seg {s.segment}</div>
              <div className="flex-1 h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${SEGMENT_BAR[i]} rounded-lg transition-all duration-700`}
                  style={{ width: `${(s.repeatPurchaseRate / maxRepeat) * 100}%` }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 font-mono">
                  {s.repeatPurchaseRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/20 mt-4">
          Formula: customers con ≥2 attributed_orders / total customers nel segmento
        </p>
      </div>

      {/* Key insight callout */}
      <div className="mt-6 border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/5">
        <p className="text-sm text-emerald-400/80">
          <span className="font-semibold">Come leggere questo dato:</span> se il Segment D (4+ check-in) 
          mostra revenue/customer e repeat rate significativamente più alti di A, 
          i check-in stanno generando LTV reale. Usa questo per il pitch ai brand.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-white/80'}`}>{value}</div>
      <div className="text-xs text-white/25 mt-0.5">{label}</div>
    </div>
  )
}
