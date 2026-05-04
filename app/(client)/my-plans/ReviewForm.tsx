'use client'

import { useState } from 'react'

export default function ReviewForm({ purchaseId, existingReview }: {
  purchaseId: string
  existingReview?: { rating: number; comment: string | null } | null
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!rating) { setError('Please select a rating'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_id: purchaseId, rating, comment }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.success) { setSaved(true); setOpen(false) }
    else setError(json.error || 'Error saving review')
  }

  if (saved || existingReview) {
    const r = rating || existingReview?.rating || 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
        <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
          {saved ? 'Review saved!' : 'Reviewed'}
        </span>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          background: 'transparent', border: '1px solid #E8EDF8',
          color: '#64748B', fontSize: 12, fontWeight: 600,
          padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          ★ Leave a review
        </button>
      ) : (
        <div style={{
          background: '#F8FAFC', border: '1px solid #E8EDF8',
          borderRadius: 12, padding: '16px', marginTop: 12,
        }}>
          {/* Stars */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                style={{
                  fontSize: 28, cursor: 'pointer',
                  color: n <= (hover || rating) ? '#F59E0B' : '#E8EDF8',
                  transition: 'color 0.1s',
                }}
              >
                ★
              </span>
            ))}
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your experience (optional)..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
              background: '#fff', outline: 'none', fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
            }}
          />

          {error && <p style={{ color: '#EF4444', fontSize: 12, margin: '6px 0 0' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              background: '#7C5CFC', color: '#fff',
              fontWeight: 700, fontSize: 13, padding: '9px 20px',
              borderRadius: 100, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : 'Submit review'}
            </button>
            <button onClick={() => setOpen(false)} style={{
              background: 'transparent', border: '1px solid #E8EDF8',
              color: '#94A3B8', fontSize: 13, fontWeight: 600,
              padding: '9px 16px', borderRadius: 100, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}