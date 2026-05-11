'use client'

import { useState } from 'react'

type Tab = 'sellers' | 'products' | 'purchases' | 'buyers'

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EDF8',
  background: '#F5F7FA', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle as any, resize: 'vertical', minHeight: 80, fontFamily: 'inherit',
}

function btnStyle(color = '#7C5CFC'): React.CSSProperties {
  return { background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }
}

function Field({ label, value, onChange, type = 'text', textarea = false }: any) {
  return (
    <div>
      <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {textarea
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} style={textareaStyle} />
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </div>
  )
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
  const [editingBuyer, setEditingBuyer] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null)
  const [sellerDetail, setSellerDetail] = useState<Record<string, { expert: any, products: any[] }>>({})
  const [loadingDetail, setLoadingDetail] = useState<Record<string, boolean>>({})
  const [editingSellerFull, setEditingSellerFull] = useState<Record<string, any>>({})
  const [editingSellerProduct, setEditingSellerProduct] = useState<Record<string, any>>({})

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
    for (const x of sd.data || []) se[x.id] = { name: x.name, category: x.category, is_published: x.is_published }
    setEditingSeller(se)
    const pe: Record<string, any> = {}
    for (const x of pd.data || []) pe[x.id] = { price: x.price, is_published: x.is_published, lemonsqueezy_variant_id: x.lemonsqueezy_variant_id || '', title: x.title, description: x.description, duration_months: x.duration_months }
    setEditingProduct(pe)
    const be: Record<string, any> = {}
    for (const x of bd.data || []) be[x.id] = { name: x.name || '', email: x.email || '' }
    setEditingBuyer(be)
  }

  async function handleAuth() {
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) })
    if (res.ok) { setAuthenticated(true); loadAll(secret) }
    else alert('Wrong password')
  }

  async function toggleSeller(id: string) {
    if (expandedSeller === id) { setExpandedSeller(null); return }
    setExpandedSeller(id)
    if (!sellerDetail[id]) {
      setLoadingDetail(p => ({ ...p, [id]: true }))
      const res = await fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'seller_detail', seller_id: id }) })
      const { expert, products } = await res.json()
      setSellerDetail(p => ({ ...p, [id]: { expert, products } }))
      setEditingSellerFull(p => ({ ...p, [id]: { ...expert } }))
      const sp: Record<string, any> = {}
      for (const x of products || []) sp[x.id] = { title: x.title, description: x.description || '', price: x.price, duration_months: x.duration_months, is_published: x.is_published, lemonsqueezy_variant_id: x.lemonsqueezy_variant_id || '' }
      setEditingSellerProduct(p => ({ ...p, ...sp }))
      setLoadingDetail(p => ({ ...p, [id]: false }))
    }
  }

  function setSellerField(sellerId: string, key: string, value: any) {
    setEditingSellerFull(p => ({ ...p, [sellerId]: { ...p[sellerId], [key]: value } }))
  }

  function setSellerProductField(productId: string, key: string, value: any) {
    setEditingSellerProduct(p => ({ ...p, [productId]: { ...p[productId], [key]: value } }))
  }

  async function saveSellerFull(id: string) {
    setSaving(p => ({ ...p, ['seller_' + id]: true }))
    await fetch('/api/admin-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'seller', id, data: editingSellerFull[id] }) })
    setSaving(p => ({ ...p, ['seller_' + id]: false }))
    setSaved(p => ({ ...p, ['seller_' + id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, ['seller_' + id]: false })), 2000)
    // refresh detail
    setSellerDetail(p => { const n = { ...p }; delete n[id]; return n })
    const res = await fetch('/api/admin-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'seller_detail', seller_id: id }) })
    const { expert, products } = await res.json()
    setSellerDetail(p => ({ ...p, [id]: { expert, products } }))
    setEditingSellerFull(p => ({ ...p, [id]: { ...expert } }))
    loadAll(secret)
  }

  async function saveSellerProduct(productId: string, sellerId: string) {
    setSaving(p => ({ ...p, ['sp_' + productId]: true }))
    await fetch('/api/admin-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'product', id: productId, data: editingSellerProduct[productId] }) })
    setSaving(p => ({ ...p, ['sp_' + productId]: false }))
    setSaved(p => ({ ...p, ['sp_' + productId]: true }))
    setTimeout(() => setSaved(p => ({ ...p, ['sp_' + productId]: false })), 2000)
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

  async function saveBuyer(id: string) {
    setSaving(p => ({ ...p, [id]: true }))
    await fetch('/api/admin-data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'buyer', id, data: editingBuyer[id] }) })
    setSaving(p => ({ ...p, [id]: false }))
    setSaved(p => ({ ...p, [id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 2000)
    loadAll(secret)
  }

  async function deletePurchase(id: string) {
    if (!confirm('Eliminare questo acquisto? Azione irreversibile.')) return
    setDeleting(p => ({ ...p, [id]: true }))
    await fetch('/api/admin-data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, type: 'purchase', id }) })
    setDeleting(p => ({ ...p, [id]: false }))
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
  const filteredPurchases = purchases.filter(p => !q || p.buyer_name?.toLowerCase().includes(q) || p.product_title?.toLowerCase().includes(q))
  const filteredBuyers = buyers.filter(b => !q || b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q))

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '24px 0 12px' }
  const divider: React.CSSProperties = { borderTop: '1px solid #E8EDF8', margin: '20px 0' }

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
            {filteredSellers.map(s => {
              const isOpen = expandedSeller === s.id
              const detail = sellerDetail[s.id]
              const ef = editingSellerFull[s.id] || {}
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isOpen ? '#7C5CFC' : '#E8EDF8'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {/* Header — always visible, clickable */}
                  <div onClick={() => toggleSeller(s.id)} style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{s.email} · {s.category} · {s.products_count || 0} prodotti · €{s.total_revenue || 0}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, background: s.is_published ? '#D1FDF3' : '#FEF2F2', color: s.is_published ? '#059669' : '#EF4444', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
                        {s.is_published ? 'Pubblicato' : 'Non pubblicato'}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: '0 24px 24px', borderTop: '1px solid #E8EDF8' }}>
                      {loadingDetail[s.id] && <p style={{ color: '#94A3B8', fontSize: 13, padding: '16px 0' }}>Caricamento...</p>}

                      {detail && (
                        <>
                          {/* DATI SELLER */}
                          <p style={sectionLabel}>Dati Seller</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Field label="Nome" value={ef.name} onChange={(v: string) => setSellerField(s.id, 'name', v)} />
                            <Field label="Categoria" value={ef.category} onChange={(v: string) => setSellerField(s.id, 'category', v)} />
                            <Field label="Email (read only)" value={detail.expert.email || ''} onChange={() => {}} />
                            <Field label="Slug (read only)" value={ef.slug || ''} onChange={() => {}} />
                            <Field label="Tagline" value={ef.tagline} onChange={(v: string) => setSellerField(s.id, 'tagline', v)} />
                            <Field label="Anni esperienza" value={ef.years_experience} onChange={(v: string) => setSellerField(s.id, 'years_experience', v)} type="number" />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                            <Field label="Bio" value={ef.bio} onChange={(v: string) => setSellerField(s.id, 'bio', v)} textarea />
                            <Field label="Short Bio" value={ef.short_bio} onChange={(v: string) => setSellerField(s.id, 'short_bio', v)} textarea />
                            <Field label="Long Bio" value={ef.long_bio} onChange={(v: string) => setSellerField(s.id, 'long_bio', v)} textarea />
                            <Field label="Credenziali" value={ef.credentials} onChange={(v: string) => setSellerField(s.id, 'credentials', v)} textarea />
                          </div>

                          <p style={sectionLabel}>Metodologia</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                            <Field label="Nome metodologia" value={ef.methodology_name} onChange={(v: string) => setSellerField(s.id, 'methodology_name', v)} />
                            <Field label="Descrizione metodologia" value={ef.methodology_description} onChange={(v: string) => setSellerField(s.id, 'methodology_description', v)} textarea />
                            <Field label="Descrizione risultati" value={ef.results_description} onChange={(v: string) => setSellerField(s.id, 'results_description', v)} textarea />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <div>
                              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Allow substitutions</label>
                              <select value={ef.allow_substitutions || 'always'} onChange={e => setSellerField(s.id, 'allow_substitutions', e.target.value)} style={inputStyle}>
                                <option value="always">Always</option>
                                <option value="never">Never</option>
                                <option value="ask">Ask</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Calorie metodo</label>
                              <select value={ef.calorie_metodo || ''} onChange={e => setSellerField(s.id, 'calorie_metodo', e.target.value)} style={inputStyle}>
                                <option value="tdee_based">TDEE based</option>
                                <option value="fixed">Fixed</option>
                                <option value="deltas">Deltas</option>
                              </select>
                            </div>
                          </div>

                          <p style={sectionLabel}>Social & Contatti</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Field label="Instagram" value={ef.instagram_url} onChange={(v: string) => setSellerField(s.id, 'instagram_url', v)} />
                            <Field label="Website" value={ef.website_url} onChange={(v: string) => setSellerField(s.id, 'website_url', v)} />
                            <Field label="TikTok" value={ef.tiktok_url} onChange={(v: string) => setSellerField(s.id, 'tiktok_url', v)} />
                            <Field label="YouTube" value={ef.youtube_url} onChange={(v: string) => setSellerField(s.id, 'youtube_url', v)} />
                            <Field label="LinkedIn" value={ef.linkedin_url} onChange={(v: string) => setSellerField(s.id, 'linkedin_url', v)} />
                            <Field label="IBAN" value={ef.iban} onChange={(v: string) => setSellerField(s.id, 'iban', v)} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <div>
                              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pubblicato</label>
                              <select value={ef.is_published ? 'true' : 'false'} onChange={e => setSellerField(s.id, 'is_published', e.target.value === 'true')} style={inputStyle}>
                                <option value="true">Sì</option>
                                <option value="false">No</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ marginTop: 20 }}>
                            <button onClick={() => saveSellerFull(s.id)} style={btnStyle(saved['seller_' + s.id] ? '#059669' : '#7C5CFC')}>
                              {saving['seller_' + s.id] ? 'Salvataggio...' : saved['seller_' + s.id] ? '✓ Salvato' : 'Salva dati seller'}
                            </button>
                          </div>

                          {/* PRODOTTI */}
                          <div style={divider} />
                          <p style={sectionLabel}>Prodotti ({detail.products.length})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {detail.products.map((p: any) => {
                              const sp = editingSellerProduct[p.id] || {}
                              return (
                                <div key={p.id} style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px', border: '1px solid #E8EDF8' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{p.title}</p>
                                    <span style={{ fontSize: 11, background: p.is_published ? '#D1FDF3' : '#FEF2F2', color: p.is_published ? '#059669' : '#EF4444', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                                      {p.is_published ? 'Pubblicato' : 'Non pubblicato'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Titolo" value={sp.title} onChange={(v: string) => setSellerProductField(p.id, 'title', v)} />
                                    <Field label="Prezzo (€)" value={sp.price} onChange={(v: string) => setSellerProductField(p.id, 'price', v)} type="number" />
                                    <Field label="Durata (mesi)" value={sp.duration_months} onChange={(v: string) => setSellerProductField(p.id, 'duration_months', v)} type="number" />
                                    <Field label="Variant ID LS" value={sp.lemonsqueezy_variant_id} onChange={(v: string) => setSellerProductField(p.id, 'lemonsqueezy_variant_id', v)} />
                                  </div>
                                  <div style={{ marginTop: 10 }}>
                                    <Field label="Descrizione" value={sp.description} onChange={(v: string) => setSellerProductField(p.id, 'description', v)} textarea />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                                    <div style={{ flex: 1 }}>
                                      <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pubblicato</label>
                                      <select value={sp.is_published ? 'true' : 'false'} onChange={e => setSellerProductField(p.id, 'is_published', e.target.value === 'true')} style={inputStyle}>
                                        <option value="true">Sì</option>
                                        <option value="false">No</option>
                                      </select>
                                    </div>
                                    <div style={{ paddingTop: 20 }}>
                                      <button onClick={() => saveSellerProduct(p.id, s.id)} style={btnStyle(saved['sp_' + p.id] ? '#059669' : '#7C5CFC')}>
                                        {saving['sp_' + p.id] ? '...' : saved['sp_' + p.id] ? '✓' : 'Salva'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            {detail.products.length === 0 && <p style={{ color: '#94A3B8', fontSize: 13 }}>Nessun prodotto</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
                  {['Data', 'Buyer', 'Prodotto', 'Seller', 'Importo', 'ID LS', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>{p.buyer_name || '—'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{p.buyer_email || p.client_id?.slice(0, 8)}</p>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>{p.product_title || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{p.seller_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>€{p.amount || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 11 }}>{p.stripe_payment_id || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => deletePurchase(p.id)} disabled={deleting[p.id]}
                        style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, color: '#EF4444', fontSize: 12, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        {deleting[p.id] ? '...' : 'Elimina'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPurchases.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>Nessun acquisto</p>}
          </div>
        )}

        {tab === 'buyers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredBuyers.map(b => (
              <div key={b.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #E8EDF8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>{b.name || '—'}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Registrato: {b.created_at ? new Date(b.created_at).toLocaleDateString('it-IT') : '—'}</p>
                  </div>
                  <span style={{ background: '#EDE9FE', color: '#7C5CFC', fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 100 }}>
                    {b.purchases_count || 0} acquisti
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Nome</label>
                    <input value={editingBuyer[b.id]?.name || ''} onChange={e => setEditingBuyer(p => ({ ...p, [b.id]: { ...p[b.id], name: e.target.value } }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>Email</label>
                    <input value={editingBuyer[b.id]?.email || ''} onChange={e => setEditingBuyer(p => ({ ...p, [b.id]: { ...p[b.id], email: e.target.value } }))} style={inputStyle} />
                  </div>
                  <button onClick={() => saveBuyer(b.id)} style={btnStyle(saved[b.id] ? '#059669' : '#7C5CFC')}>
                    {saving[b.id] ? '...' : saved[b.id] ? '✓' : 'Salva'}
                  </button>
                </div>
              </div>
            ))}
            {filteredBuyers.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>Nessun buyer</p>}
          </div>
        )}

      </div>
    </div>
  )
}