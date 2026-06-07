'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Paying:   { color: 'var(--success)', bg: '#10b98115' },
  Active:   { color: 'var(--violet)', bg: 'var(--violet-dim)' },
  Trial:    { color: '#f59e0b', bg: '#f59e0b15' },
  Inactive: { color: 'var(--muted)', bg: '#f1f5f9' },
}

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(0)}`
}

function timeAgo(date: string | null) {
  if (!date) return '—'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 30) return `${days}g fa`
  return `${Math.floor(days / 30)}mo fa`
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
    const params = new URLSearchParams({ search, sort, order, page: String(page) })
    const res = await fetch(`/api/admin/sellers?${params}`)
    const data = await res.json()
    setSellers(data.sellers || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [search, sort, order, page])

  useEffect(() => { fetchSellers() }, [fetchSellers])

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setOrder('desc') }
    setPage(1)
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Sellers</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{total} merchants totali</p>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>⌕</span>
          <input
            type="text"
            placeholder="Cerca store o dominio…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              paddingLeft: 34, paddingRight: 16, paddingTop: 9, paddingBottom: 9,
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
              color: 'var(--text)', background: '#fff', outline: 'none', width: 240,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { field: 'created_at', label: 'Install Date' },
          { field: 'revenue', label: 'Revenue' },
          { field: 'customers', label: 'Customers' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${sort === field ? 'var(--violet)' : 'var(--border)'}`,
              background: sort === field ? 'var(--violet-dim)' : '#fff',
              color: sort === field ? 'var(--violet)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            {label} {sort === field ? (order === 'desc' ? '↓' : '↑') : ''}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              {['Store', 'Piano', 'Customers', 'Quiz', 'Check-ins', 'Orders', 'Revenue', 'Last Activity', 'Status', ''].map(h => (
                <th key={h} style={{
                  textAlign: ['Customers', 'Quiz', 'Check-ins', 'Orders', 'Revenue', 'Last Activity'].includes(h) ? 'right' : 'left',
                  padding: '12px 16px',
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-light)' }}>
                  Caricamento...
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-light)' }}>
                  Nessun seller trovato
                </td>
              </tr>
            ) : sellers.map(s => {
              const st = STATUS_COLORS[s.status] || STATUS_COLORS.Inactive
              return (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.shopName || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-light)', marginTop: 2 }}>{s.shopifyDomain}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>
                    {s.plan || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.customers}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{s.quizCompletions}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{s.checkinsCompleted}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{s.ordersInfluenced}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--violet)', fontFamily: 'monospace', fontSize: 12 }}>
                    {fmt(s.revenueInfluenced)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted-light)', fontSize: 12 }}>
                    {timeAgo(s.lastActivity)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      color: st.color, background: st.bg,
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/admin/sellers/${s.id}`} style={{ color: 'var(--muted-light)', fontSize: 18, fontWeight: 300, textDecoration: 'none' }}>›</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} di {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', opacity: page === 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <button
              disabled={page * 50 >= total}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', opacity: page * 50 >= total ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
