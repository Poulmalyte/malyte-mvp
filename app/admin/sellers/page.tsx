'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, ArrowUpDown, ChevronRight } from 'lucide-react'

interface Seller {
  id: string
  shopName: string
  shopifyDomain: string
  installDate: string
  plan: string
  billingStatus: string
  customers: number
  quizCompletions: number
  checkinsCompleted: number
  ordersInfluenced: number
  revenueInfluenced: number
  lastActivity: string | null
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  Paying: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Inactive: 'bg-white/5 text-white/30 border-white/10',
}

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

function timeAgo(date: string | null) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, sort, order, page: String(page) })
      const res = await fetch(`/api/admin/sellers?${params}`)
      const data = await res.json()
      setSellers(data.sellers || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [search, sort, order, page])

  useEffect(() => { fetchSellers() }, [fetchSellers])

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setOrder('desc') }
    setPage(1)
  }

  const SortBtn = ({ field, label }: { field: string; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
        sort === field ? 'text-emerald-400' : 'text-white/30 hover:text-white/60'
      }`}
    >
      {label}
      <ArrowUpDown size={10} />
    </button>
  )

  return (
    <div className="p-8 max-w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Sellers</h1>
          <p className="text-sm text-white/30 mt-0.5">{total} merchants totali</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Cerca store o dominio…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Store</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Plan</span>
              </th>
              <th className="text-right px-4 py-3">
                <SortBtn field="customers" label="Customers" />
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Quiz</span>
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Check-ins</span>
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Orders</span>
              </th>
              <th className="text-right px-4 py-3">
                <SortBtn field="revenue" label="Revenue" />
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Last Activity</span>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-white/30">Status</span>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12">
                  <div className="inline-block w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-white/20 text-sm">
                  Nessun seller trovato
                </td>
              </tr>
            ) : sellers.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="font-medium text-white/90">{s.shopName || '—'}</div>
                  <div className="text-xs text-white/30 mt-0.5">{s.shopifyDomain}</div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-white/40 capitalize">{s.plan || '—'}</span>
                </td>
                <td className="px-4 py-3.5 text-right text-white/70">{s.customers}</td>
                <td className="px-4 py-3.5 text-right text-white/70">{s.quizCompletions}</td>
                <td className="px-4 py-3.5 text-right text-white/70">{s.checkinsCompleted}</td>
                <td className="px-4 py-3.5 text-right text-white/70">{s.ordersInfluenced}</td>
                <td className="px-4 py-3.5 text-right font-mono text-emerald-400 text-xs">
                  {fmt(s.revenueInfluenced)}
                </td>
                <td className="px-4 py-3.5 text-right text-white/30 text-xs">
                  {timeAgo(s.lastActivity)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.Inactive}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/admin/sellers/${s.id}`}>
                    <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-white/30">
            {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} di {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              disabled={page * 50 >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
