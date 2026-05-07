'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', lineHeight: 1.6,
}

export default function ProductEditForm({ product }: { product: any }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(product.title || '')
  const [desc, setDesc] = useState(product.description || '')
  const [price, setPrice] = useState(String(product.price || ''))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('products').update({
      title,
      description: desc,
      price: parseFloat(price),
    }).eq('id', product.id)
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Product details</p>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EDE9FE', border: 'none', cursor: 'pointer', color: '#7C5CFC', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setTitle(product.title); setDesc(product.description); setPrice(String(product.price)) }}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#059669', fontWeight: 600, margin: 0 }}>✓ Saved successfully</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>PRODUCT NAME</label>
          <input
            type="text" value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!editing}
            style={{ ...input, opacity: editing ? 1 : 0.7, cursor: editing ? 'text' : 'default' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>DESCRIPTION</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            disabled={!editing}
            rows={4}
            style={{ ...input, resize: 'vertical', opacity: editing ? 1 : 0.7, cursor: editing ? 'text' : 'default' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>PRICE (€)</label>
          <input
            type="number" value={price}
            onChange={e => setPrice(e.target.value)}
            disabled={!editing}
            style={{ ...input, width: '160px', opacity: editing ? 1 : 0.7, cursor: editing ? 'text' : 'default' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>SALES MODEL</label>
          <p style={{ fontSize: 13, color: '#0F172A', margin: 0, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', opacity: 0.7 }}>
            {product.pricing_model}
          </p>
        </div>
      </div>
    </div>
  )
}