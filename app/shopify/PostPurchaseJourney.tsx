'use client'

import { useEffect, useState } from 'react'

type Mode = 'routine' | 'cycle'

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E8EDF8', padding: '24px', marginBottom: 16,
}

const OPTIONS: { value: Mode; title: string; best: string; text: string; example: string[] }[] = [
  {
    value: 'routine',
    title: 'Personalised routine',
    best: 'Best for multi-step skincare',
    text: 'A morning and evening routine built around the products they bought, updated every week from their check-in.',
    example: ['Week 1: Cleanser → Serum → Moisturiser', 'Weekly check-in · the routine adapts'],
  },
  {
    value: 'cycle',
    title: 'Consumption cycle',
    best: 'Works for any consumable',
    text: 'A short usage guide for every product, one tip and one one-tap question a week, progress tracking and a refill reminder before it runs out.',
    example: ['Welcome: how to use each product + 1 question', 'Weekly: tip · progress · refill when running low'],
  },
]

export default function PostPurchaseJourney() {
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<Mode>('routine')
  const [selected, setSelected] = useState<Mode>('routine')
  const [suggestion, setSuggestion] = useState<{ mode: Mode; reason: string } | null>(null)
  const [stats, setStats] = useState<{ journeys: number; answers: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/shopify/journey-mode')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (cancelled) return
        setSaved(data.mode)
        setSelected(data.mode)
        setSuggestion(data.suggestion || null)
        setStats(data.stats || null)
      } catch {
        if (!cancelled) setMsg({ type: 'error', text: 'Could not load your journey settings.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/shopify/journey-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selected }),
      })
      if (!res.ok) throw new Error()
      setSaved(selected)
      setMsg({ type: 'success', text: 'Saved. It applies to new orders from now on.' })
      setTimeout(() => setMsg(null), 4000)
    } catch {
      setMsg({ type: 'error', text: 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={card}>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading your journey settings…</p>
      </div>
    )
  }

  const changed = selected !== saved

  return (
    <>
      <div style={card}>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
          Post-purchase journey
        </p>
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px', lineHeight: 1.6 }}>
          Choose what your customers receive after they buy. You can change it anytime.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
          {OPTIONS.map((o) => {
            const on = selected === o.value
            const suggested = suggestion?.mode === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setSelected(o.value)}
                style={{
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  background: '#FFFFFF', borderRadius: 14, padding: 18,
                  border: `2px solid ${on ? '#7C5CFC' : '#E8EDF8'}`,
                  boxShadow: on ? '0 0 0 4px #EDE9FE' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                    {o.title}
                    {saved === o.value && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', border: '1px solid #6EE7B7', padding: '2px 8px', borderRadius: 100, verticalAlign: 'middle' }}>
                        Active
                      </span>
                    )}
                  </span>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
                    border: on ? '6px solid #7C5CFC' : '2px solid #CBD5E1',
                  }} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7C5CFC', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {o.best}
                  {suggested && (
                    <span style={{ marginLeft: 6, color: '#059669', textTransform: 'none', letterSpacing: 0 }}>· Suggested for your catalog</span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.55 }}>{o.text}</p>
                <div style={{ background: '#F8FAFC', border: '1px solid #E8EDF8', borderRadius: 10, padding: '10px 12px' }}>
                  {o.example.map((line) => (
                    <p key={line} style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.6 }}>{line}</p>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {suggestion && (
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', border: '1px solid #E8EDF8', marginBottom: 16, fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
            <strong style={{ color: '#7C5CFC' }}>Our suggestion:</strong> {suggestion.reason}{' '}
            Customers who already started keep their current journey; the change applies to new orders only.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={save}
            disabled={saving || !changed}
            style={{
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: saving || !changed ? '#C4B5FD' : '#7C5CFC', color: '#fff', border: 'none',
              cursor: saving || !changed ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : changed ? 'Save' : 'Saved'}
          </button>
          {msg && (
            <span style={{ fontSize: 12, fontWeight: 600, color: msg.type === 'success' ? '#059669' : '#DC2626' }}>
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {saved === 'cycle' && (
        <div style={card}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Consumption cycle is active</p>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
            Nothing to set up: usage guides and questions are generated from your product pages.
            Your Questions tab is only used by the personalised routine.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Customers in the cycle', value: stats?.journeys ?? 0 },
              { label: 'Answers collected', value: stats?.answers ?? 0 },
            ].map((s) => (
              <div key={s.label} style={{ flex: '1 1 160px', background: '#F8FAFC', border: '1px solid #E8EDF8', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
