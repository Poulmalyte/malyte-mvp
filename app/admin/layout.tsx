'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◎', exact: true },
  { href: '/admin/sellers', label: 'Sellers', icon: '⊞' },
  { href: '/admin/attribution', label: 'Attribution', icon: '⟡' },
  { href: '/admin/health', label: 'System Health', icon: '⚡' },
  { href: '/admin/engagement', label: 'Engagement', icon: '◈' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7FA', overflow: 'hidden' }}>
      <aside style={{
        width: collapsed ? 56 : 220,
        minWidth: collapsed ? 56 : 220,
        background: '#fff',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--violet)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}>M</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'Satoshi, sans-serif' }}>Malyte</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Admin Panel</div>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 14, padding: 4,
          }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 12px',
                borderRadius: 8,
                background: active ? 'var(--violet-dim)' : 'transparent',
                color: active ? 'var(--violet)' : 'var(--muted)',
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            color: 'var(--muted)', fontSize: 13,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <span>↗</span>
            {!collapsed && <span>Exit Admin</span>}
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}