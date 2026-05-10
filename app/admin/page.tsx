'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  async function loadProducts(s: string) {
    const res = await fetch('/api/admin-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: s }),
    })
    const data = await res.json()
    setProducts(data.products || [])
    const initial: Record<string, string> = {}
    for (const p of data.products || []) {
      initial[p.id] = p.lemonsqueezy_variant_id || ''
    }
    setEditing(initial)
  }

  async function handleAuth() {
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
    if (res.ok) {
      setAuthenticated(true)
      loadProducts(secret)
    } else {
      alert('Wrong password')
    }
  }

  async function handleSave(productId: string) {
    setSaving(prev => ({ ...prev, [productId]: true }))
    await fetch('/api/admin-products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, productId, variantId: editing[productId] }),
    })
    setSaving(prev => ({ ...prev, [productId]: false }))
    setSaved(prev => ({ ...prev, [productId]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [productId]: false })), 2000)
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', border: '1px solid #E8EDF8', width: 360 }}>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 24 }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span> admin
          </h1>
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #E8EDF8', background: '#F5F7FA', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button onClick={handleAuth} style={{ width: '100%', background: '#7C5CFC', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Enter →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: 'Inter, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 24, color: '#0F172A', marginBottom: 8 }}>
          malyte<span style={{ color: '#7C5CFC' }}>.</span> admin
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 32 }}>Aggiorna i Variant ID di Lemon Squeezy</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #E8EDF8' }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 600 }}>
                  {p.experts?.name || p.expert_id}
                </span>
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 12 }}>{p.title} — {p.price}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Lemon Squeezy Variant ID"
                  value={editing[p.id] || ''}
                  onChange={e => setEditing(prev => ({ ...prev, [p.id]: e.target.value }))}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E8EDF8', background: '#F5F7FA', fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={() => handleSave(p.id)}
                  disabled={saving[p.id]}
                  style={{
                    background: saved[p.id] ? '#059669' : '#7C5CFC',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '10px 20px', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {saving[p.id] ? '...' : saved[p.id] ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
