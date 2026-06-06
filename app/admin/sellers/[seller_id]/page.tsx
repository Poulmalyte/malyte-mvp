'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
    <div className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.02]">
      <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-2">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/20 mt-1">{sub}</div>}
    </div>
  )
}

function AttrBar({ label, count, revenue, total }: { label: string; count: number; revenue: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70">{count} orders · {fmt(revenue)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
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
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  )

  if (!data?.merchant) return (
    <div className="p-8 text-red-400 text-sm">Seller non trovato</div>
  )

  const { merchant, stats, attribution, recentOrders, recentCheckins } = data
  const totalAttr = attribution.emailMatch.count + attribution.productMatch.count + attribution.temporalMatch.count

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <Link href="/admin/sellers" className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm mb-6 transition-colors">
        <ArrowLeft size={14} />
        Back to Sellers
      </Link>

      {/* Store info */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{merchant.shop_name || merchant.shopify_domain}</h1>
            <p className="text-sm text-white/30 mt-0.5">{merchant.shopify_domain}</p>
          </div>
          <div className="text-right text-xs text-white/30">
            <div>Installato: {new Date(merchant.created_at).toLocaleDateString('it-IT')}</div>
            <div className="mt-0.5 capitalize">Piano: <span className="text-white/60">{merchant.plan || '—'}</span></div>
            <div className="mt-0.5 capitalize">Billing: <span className="text-white/60">{merchant.billing_status || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <Stat label="Customers" value={stats.customers} />
        <Stat label="Quiz Completions" value={stats.quizCompletions} />
        <Stat label="Check-ins Completed" value={stats.checkinsCompleted} />
        <Stat label="Orders Influenced" value={stats.ordersInfluenced} />
        <Stat label="Revenue Influenced" value={fmt(stats.revenueInfluenced)} />
        <Stat label="Conversion Rate" value={`${stats.conversionRate}%`} sub="customers → buyer" />
      </div>

      {/* Attribution breakdown */}
      <div className="border border-white/[0.06] rounded-xl p-5 bg-white/[0.02] mb-8">
        <h2 className="text-sm font-medium text-white/70 mb-4 uppercase tracking-widest text-xs">Attribution Breakdown</h2>
        <div className="space-y-4">
          <AttrBar
            label="Email Match"
            count={attribution.emailMatch.count}
            revenue={attribution.emailMatch.revenue}
            total={totalAttr}
          />
          <AttrBar
            label="Product Match"
            count={attribution.productMatch.count}
            revenue={attribution.productMatch.revenue}
            total={totalAttr}
          />
          <AttrBar
            label="Temporal Match"
            count={attribution.temporalMatch.count}
            revenue={attribution.temporalMatch.revenue}
            total={totalAttr}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.06]">
        {(['orders', 'checkins'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'orders' ? `Recent Orders (${recentOrders.length})` : `Recent Check-ins (${recentCheckins.length})`}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <table className="w-full text-sm border border-white/[0.06] rounded-xl overflow-hidden">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Order ID</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Customer</th>
              <th className="text-right px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Revenue</th>
              <th className="text-center px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Attribution</th>
              <th className="text-right px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {recentOrders.map(o => (
              <tr key={o.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-white/40">{o.order_id?.slice(-8) || '—'}</td>
                <td className="px-4 py-3 text-white/60 text-xs">{o.customer_email}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400 text-xs">{fmt(parseFloat(o.order_value) || 0)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-white/30 capitalize">{(o.attribution_type || '').replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-white/30">
                  {new Date(o.created_at).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'checkins' && (
        <table className="w-full text-sm border border-white/[0.06] rounded-xl overflow-hidden">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Customer</th>
              <th className="text-center px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs text-white/30 uppercase tracking-wider">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {recentCheckins.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white/60 text-xs">{c.customer_email}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-emerald-400">{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-white/30">
                  {c.completed_at ? new Date(c.completed_at).toLocaleDateString('it-IT') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
