'use client'

import { useState } from 'react'

type Tab = 'sellers' | 'products' | 'purchases' | 'buyers'

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EDF8',
  background: '#F5F7FA', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

function btnStyle(color = '#7C5CFC'): React.CSSProperties {
  return {
    background: color, color: '#fff', border: 'none', borderRadius: 8,
    padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState<Tab>('sellers')
  const [sellers, setSellers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [buyers, setBuyers] = useState<any[]>([])
  const [editingSeller, setEditingSeller] = useState<Record<string, any>>({})
  const [editingProduct, setEditingProduct] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  async function loadAll(s: string) {
    const [sd, pd, pud, bd] = await Promise.all([
      fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: s, type: 'sellers' }) }).then(r => r.json()),
      fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: s, type: 'products' }) }).then(r => r.json()),
      fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: s, type: 'purchases' }) }).then(r => r.json()),
      fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: s, type: 'buyers' }) }).then(r => r.json()),
    ])
    setSellers(sd.data || [])
    setProducts(pd.data || [])
    setPurchases(pud.data || [])
    setBuyers(bd.data || [])
    const se: Record<string, any> = {}
    for (const x of sd.data || []) se[x.id] = { category: x.category, is_published: x.is_published }
    setEditingSeller(se)
    const pe: Record<string, any> = {}
    for (const x of pd.data || []) pe[x.id] = { price: x.price, is_published: x.is_published, lemonsqueezy_variant_id: x.lemonsqueezy_variant_id || '' }
    setEditingProduct(pe)
  }

  async function handleAuth() {
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) })
    if (res.ok) { setAuthenticated(true); loadAll(secret) }
    else alert('Wrong password')
  }

  async function saveSeller(id: string) {
    setSaving(p => ({ ...p, [id]: true }))
    await fetch('/api/admin-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'seller', id, data: editingSeller[id] }) })
    setSaving(p => ({ ...p, [id]: false }))
    setSaved(p => ({ ...p, [id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 2000)
    loadAll(secret)
  }

  async function saveProduct(id: string) {
    setSaving(p => ({ ...p, [id]: true }))
    await fetch('/api/admin-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'product', id, data: editingProduct[id] }) })
    setSaving(p => ({ ...p, [id]: false }))
    setSaved(p => ({ ...p, [id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 2000)
    loadAll(secret)
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', border: '1px solid #E8EDF8', width: 360 }}>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 24 }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span> admin
          </h1>
          <input type="password" placeholder="Admin password" value={secret}
            onChange={e => setSecret(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ ...inputStyle, marginBottom: 12 }} />
          <button onClick={handleAuth} style={{ ...btnStyle(), width: '100%', padding: '12px', fontSize: 14 }}>Enter →</button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'sellers' as Tab, label: 'Sellers', count: sellers.length },
    { id: 'products' as Tab, label: 'Prodotti', count: products.length },
    { id: 'purchases' as Tab, label: 'Acquisti', count: purchases.length },
    { id: 'buyers' as Tab, label: 'Buyers', count: buyers.length },
  ]

  const q = search.toLowerCase()
  const filteredSellers = sellers.filter(s => !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
  const filteredProducts = products.filter(p => !q || p.title?.toLowerCase().includes(q) || p.experts?.name?.toLowerCase().includes(q))
  const filteredPurchases = purchases.filter(p => !q || p.profiles?.name?.toLowerCase().includes(q) || p.products?.title?.toLowerCase().includes(q))
  const filteredBuyers = buyers.filter(b => !q || b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q))

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 20, color: '#0F172A', margin: 0 }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span> admin
          </h1>
          <input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 400, fontSize: 13,
              color: tab === t.id ? '#7C5CFC' : '#64748B',
              borderBottom: tab === t.id ? '2px solid #7C5CFC' : '2px solid transparent',
            }}>
              {t.label} <span style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 100, padding: '1px 7px', marginLeft: 4 }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>

        {tab === 'sellers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredSellers.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #E8EDF8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{s.email} · slug: {s.slug}</p>
                  </div>
                  <span style={{ fontSize: 11, background: s.is_published ? '#D1FDF3' : '#FEF2F2', color: s.is_published ? '#059669' : '#EF4444', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
                    {s.is_published ? 'Pubblicato' : 'Non pubblicato'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Categoria</label>
                    <input value={editingSeller[s.id]?.category || ''} onChange={e => setEditingSeller(p => ({ ...p, [s.id]: { ...p[s.id], category: e.target.value } }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Pubblicato</label>
                    <select value={editingSeller[s.id]?.is_published ? 'true' : 'false'} onChange={e => setEditingSeller(p => ({ ...p, [s.id]: { ...p[s.id], is_published: e.target.value === 'true' } }))} style={inputStyle}>
                      <option value="true">Sì</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <button onClick={() => saveSeller(s.id)} style={btnStyle(saved[s.id] ? '#059669' : '#7C5CFC')}>
                    {saving[s.id] ? '...' : saved[s.id] ? '✓' : 'Salva'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '12px 0 0' }}>
                  {s.products_count || 0} prodotti · €{s.total_revenue || 0} revenue
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'products' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #E8EDF8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 600 }}>{p.experts?.name}</span>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '2px 0' }}>{p.title}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>€{p.price} · {p.duration_months} mesi · {p.purchases_count || 0} acquisti</p>
                  </div>
                  <span style={{ fontSize: 11, background: p.is_published ? '#D1FDF3' : '#FEF2F2', color: p.is_published ? '#059669' : '#EF4444', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
                    {p.is_published ? 'Pubblicato' : 'Non pubblicato'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Prezzo (€)</label>
                    <input type="number" value={editingProduct[p.id]?.price || ''} onChange={e => setEditingProduct(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Variant ID LS</label>
                    <input value={editingProduct[p.id]?.lemonsqueezy_variant_id || ''} onChange={e => setEditingProduct(prev => ({ ...prev, [p.id]: { ...prev[p.id], lemonsqueezy_variant_id: e.target.value } }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Pubblicato</label>
                    <select value={editingProduct[p.id]?.is_published ? 'true' : 'false'} onChange={e => setEditingProduct(prev => ({ ...prev, [p.id]: { ...prev[p.id], is_published: e.target.value === 'true' } }))} style={inputStyle}>
                      <option value="true">Sì</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <button onClick={() => saveProduct(p.id)} style={btnStyle(saved[p.id] ? '#059669' : '#7C5CFC')}>
                    {saving[p.id] ? '...' : saved[p.id] ? '✓' : 'Salva'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'purchases' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF8', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF8' }}>
                  {['Data', 'Buyer', 'Prodotto', 'Seller', 'Importo', 'ID LS'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>{p.profiles?.name || '—'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{p.profiles?.email || p.client_id?.slice(0, 8)}</p>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>{p.products?.title || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.products?.experts?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>€{p.amount || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 11 }}>{p.stripe_payment_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPurchases.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>Nessun acquisto</p>}
          </div>
        )}

        {tab === 'buyers' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF8', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF8' }}>
                  {['Nome', 'Email', 'Registrato', 'Acquisti'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{b.name || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{b.email || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{b.created_at ? new Date(b.created_at).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#EDE9FE', color: '#7C5CFC', fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 100 }}>{b.purchases_count || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBuyers.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>Nessun buyer</p>}
          </div>
        )}
      </div>
    </div>
  )
}
