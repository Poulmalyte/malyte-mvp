'use client'

import { useEffect, useState } from 'react'
import { GitMerge, Mail, Package, Clock, AlertCircle } from 'lucide-react'

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
  email_match: 'text-blue-400',
  product_match: 'text-emerald-400',
  temporal_match: 'text-amber-400',
}

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

export default function AdminAttributionPage() {
  const [data, setData] = useState<AttributionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/attribution')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  )

  if (!data) return null

  const { totals, dailyChart, recentOrders } = data

  // Simple sparkline max
  const maxOrders = Math.max(...dailyChart.map(d => d.orders), 1)
  const maxRevenue = Math.max(...dailyChart.map(d => d.revenue), 1)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Attribution Monitor</h1>
        <p className="text-sm text-white/30 mt-0.5">Verifica salute dell'attribution engine</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card label="Total Attributed Orders" value={totals.attributedOrders} icon={GitMerge} />
        <Card label="Email Match" value={totals.emailMatch} icon={Mail} color="blue" />
        <Card label="Product Match" value={totals.productMatch} icon={Package} color="emerald" />
        <Card label="Temporal Match" value={totals.temporalMatch} icon={Clock} color="amber" />
        <Card label="Unmatched Orders" value={totals.unmatchedOrders} icon={AlertCircle} color={totals.unmatchedOrders > 0 ? 'red' : undefined} />
        <Card
          label="Attribution Rate"
          value={`${totals.attributionRate}%`}
          icon={GitMerge}
          color={totals.attributionRate >= 70 ? 'emerald' : totals.attributionRate >= 40 ? 'amber' : 'red'}
          sub="attributed / total webhooks"
        />
      </div>

      {/* Charts */}
      {dailyChart.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <ChartCard
            title="Attributed Orders / Day"
            data={dailyChart}
            valueKey="orders"
            max={maxOrders}
            color="#10b981"
            formatVal={(v) => String(v)}
          />
          <ChartCard
            title="Revenue Influenced / Day"
            data={dailyChart}
            valueKey="revenue"
            max={maxRevenue}
            color="#6366f1"
            formatVal={(v) => fmt(v)}
          />
        </div>
      )}

      {/* Recent Orders */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-sm font-medium text-white/70">Recent Attributed Orders</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {['Order ID', 'Customer', 'Revenue', 'Attribution', 'Store', 'Date'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-white/30 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {recentOrders.map(o => (
              <tr key={o.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-mono text-xs text-white/40">{o.order_id?.slice(-8) || '—'}</td>
                <td className="px-5 py-3 text-xs text-white/60">{o.customer_email}</td>
                <td className="px-5 py-3 font-mono text-xs text-emerald-400">{fmt(parseFloat(o.order_value) || 0)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs capitalize ${ATTR_COLORS[o.attribution_type] || 'text-white/40'}`}>
                    {(o.attribution_type || '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-white/30">{o.shopifyDomain}</td>
                <td className="px-5 py-3 text-xs text-white/30">
                  {new Date(o.created_at).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({
  label, value, icon: Icon, sub, color,
}: {
  label: string; value: string | number; icon: any; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }
  return (
    <div className="border border-white/[0.06] rounded-xl p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/30 uppercase tracking-widest font-medium">{label}</span>
        <Icon size={14} className="text-white/20" />
      </div>
      <div className={`text-3xl font-bold ${color ? colors[color] : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-white/20 mt-1">{sub}</div>}
    </div>
  )
}

function ChartCard({
  title, data, valueKey, max, color, formatVal,
}: {
  title: string
  data: { date: string; orders: number; revenue: number }[]
  valueKey: 'orders' | 'revenue'
  max: number
  color: string
  formatVal: (v: number) => string
}) {
  const last14 = data.slice(-14)
  return (
    <div className="border border-white/[0.06] rounded-xl p-5 bg-white/[0.02]">
      <div className="text-sm font-medium text-white/50 mb-4">{title}</div>
      <div className="flex items-end gap-1 h-24">
        {last14.map((d, i) => {
          const val = d[valueKey]
          const pct = (val / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-sm transition-all"
                style={{ height: `${Math.max(pct, 2)}%`, background: color, opacity: 0.7 }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 bg-black border border-white/10 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.date.slice(5)}: {formatVal(val)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-white/20 mt-2">
        <span>{last14[0]?.date.slice(5)}</span>
        <span>{last14[last14.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}
