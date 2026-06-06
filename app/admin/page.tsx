'use client'

import { useEffect, useState } from 'react'
import {
  Store, Users, ClipboardList, CheckSquare,
  ShoppingCart, TrendingUp, ArrowUpRight, Activity
} from 'lucide-react'

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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: any
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-4 ${
        accent
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-white/[0.06] bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-widest font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${accent ? 'bg-emerald-500/10' : 'bg-white/[0.04]'}`}>
          <Icon size={14} className={accent ? 'text-emerald-400' : 'text-white/40'} />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${accent ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </div>
        {sub && (
          <div className="text-xs text-white/30 mt-1">{sub}</div>
        )}
      </div>
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="p-8 text-red-400 text-sm">{error || 'No data'}</div>
  )

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-white/30 mt-1">Platform-wide metrics — live</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Sellers"
          value={data.totalSellers}
          sub={`${data.activeSellers} active last 30d`}
          icon={Store}
        />
        <StatCard
          label="Active Sellers"
          value={data.activeSellers}
          sub="≥1 quiz in last 30 days"
          icon={Activity}
        />
        <StatCard
          label="Total Customers"
          value={data.totalCustomers.toLocaleString()}
          sub={`+${data.last30dCustomerGrowth} last 30d`}
          icon={Users}
        />
        <StatCard
          label="Quiz Completions"
          value={data.totalQuizCompletions.toLocaleString()}
          icon={ClipboardList}
        />
        <StatCard
          label="Check-ins Completed"
          value={data.totalCheckins.toLocaleString()}
          icon={CheckSquare}
        />
        <StatCard
          label="Orders Influenced"
          value={data.totalAttributedOrders.toLocaleString()}
          icon={ShoppingCart}
        />
        <StatCard
          label="Total Revenue Influenced"
          value={fmt(data.totalRevenueInfluenced)}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Revenue (Last 30d)"
          value={fmt(data.last30dRevenueInfluenced)}
          sub="ultimi 30 giorni"
          icon={ArrowUpRight}
          accent
        />
        <StatCard
          label="Customer Growth (30d)"
          value={data.last30dCustomerGrowth.toLocaleString()}
          sub="nuovi email unici"
          icon={Users}
        />
      </div>

      {/* Formula reference */}
      <div className="mt-10 border border-white/[0.04] rounded-xl p-5 bg-white/[0.01]">
        <p className="text-xs text-white/20 font-mono uppercase tracking-widest mb-3">Formule</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/30">
          <div><span className="text-white/50">Active Seller</span> — merchant con ≥1 quiz negli ultimi 30gg</div>
          <div><span className="text-white/50">Customer</span> — email unica in quiz_responses</div>
          <div><span className="text-white/50">Revenue Influenced</span> — SUM(attributed_orders.order_value)</div>
          <div><span className="text-white/50">Orders Influenced</span> — COUNT(attributed_orders)</div>
        </div>
      </div>
    </div>
  )
}
