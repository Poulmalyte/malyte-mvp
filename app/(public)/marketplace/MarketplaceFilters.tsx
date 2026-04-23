'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

export default function MarketplaceFilters({
  categories,
  activeCategory,
  activeQuery,
}: {
  categories: string[]
  activeCategory?: string
  activeQuery?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(activeQuery || '')

  function applyFilters(cat?: string, q?: string) {
    const params = new URLSearchParams()
    if (cat && cat !== 'All') params.set('cat', cat)
    if (q) params.set('q', q)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by product name or expert..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters(activeCategory, query)}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid rgba(99,130,255,0.2)',
            borderRadius: 12,
            padding: '14px 20px',
            color: 'var(--text)',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const isActive = cat === 'All' ? !activeCategory : activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => applyFilters(cat, query)}
              style={{
                background: isActive ? 'rgba(124,92,252,0.2)' : 'var(--surface)',
                color: isActive ? '#A78BFA' : 'var(--muted)',
                border: `1px solid ${isActive ? 'rgba(124,92,252,0.5)' : 'rgba(99,130,255,0.15)'}`,
                borderRadius: 100,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>
    </div>
  )
}