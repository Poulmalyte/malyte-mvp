'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import PublishToggle from './PublishToggle'
import ShareButton from './ShareButton'

export default function ProductRow({ product, sold }: { product: any; sold: number }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(product.description || '')
  const [saving, setSaving] = useState(false)

  async function handleSaveDesc() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('products').update({ description: desc }).eq('id', product.id)
    setSaving(false)
    setEditing(false)
  }

  const questionCount = product.product_questions?.[0]?.count || 0

  return (
    <div style={{ background: '#F5F7FA', borderRadius: 10, border: '1px solid #E8EDF8', overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{product.title}</span>
            {sold > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 100 }}>
                {sold} sold
              </span>
            )}
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>
            €{product.price} · {product.pricing_model} · {questionCount} q
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ShareButton url={`https://malyte.com/product/${product.id}`} label="Share" />
          <PublishToggle productId={product.id} isPublished={product.is_published} />
        </div>
      </div>

      {/* Accordion body */}
      {open && (
        <div style={{ borderTop: '1px solid #E8EDF8', padding: '14px 16px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</span>
            {!editing && (
              <button onClick={() => setEditing(true)}
                title="Edit description"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C5CFC', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={4}
                style={{
                  width: '100%', borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, resize: 'vertical', outline: 'none',
                  background: '#F8FAFC', border: '1.5px solid #7C5CFC',
                  color: '#0F172A', fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box', lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={handleSaveDesc} disabled={saving}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setDesc(product.description || '') }}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>
              {desc || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No description yet.</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}