'use client'

import { useState, useEffect } from 'react'

interface Props {
  onComplete: (data: any) => void
  onBack: () => void
}

export default function Step4Preview({ onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => { generatePreview() }, [])

  async function generatePreview() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/shopify/generate-preview', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to generate preview'); setLoading(false); return }
      setPlan(json.plan)
    } catch (e: any) {
      setError(e.message || 'Error generating preview')
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Satoshi', sans-serif" }}>Generating your demo plan…</h2>
      <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 24px' }}>Claude is creating a sample plan using your products and rules.</p>
      <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)', borderRadius: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )

  if (error) return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Plan Preview</h2>
      <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: '#EF4444', margin: '0 0 8px' }}>{error}</p>
        <button onClick={generatePreview} style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>← Back</button>
        <button onClick={() => onComplete({ preview_approved: true })} style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>Skip preview →</button>
      </div>
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Plan Preview</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
        This is exactly what <strong>{plan?.customer_name || 'your customer'}</strong> would receive after completing the intake quiz.
      </p>

      {/* Demo profile badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE', marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {plan?.customer_name?.[0] || 'S'}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#7C5CFC', margin: '0 0 2px' }}>Demo customer: {plan?.customer_name}</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
            {plan?.demo_profile?.skin_type && `${plan.demo_profile.skin_type} skin · `}
            {plan?.demo_profile?.objectives?.join(', ')}
          </p>
        </div>
      </div>

      {/* Headline */}
      {plan?.headline && (
        <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.headline}</p>
        </div>
      )}

      {/* Morning routine */}
      {plan?.morning_routine?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>☀️ Morning routine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.morning_routine.map((item: any, i: number) => (
              <div key={i} style={{ padding: '12px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: '#FEF3C7', padding: '2px 8px', borderRadius: 100 }}>Step {item.step_number}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.product_title}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
                {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evening routine */}
      {plan?.evening_routine?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>🌙 Evening routine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.evening_routine.map((item: any, i: number) => (
              <div key={i} style={{ padding: '12px 14px', background: '#EEF2FF', borderRadius: 10, border: '1px solid #C7D2FE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', background: '#E0E7FF', padding: '2px 8px', borderRadius: 100 }}>Step {item.step_number}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.product_title}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
                {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly notes */}
      {plan?.weekly_notes && (
        <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #6EE7B7', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weekly notes</p>
          <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.6 }}>{plan.weekly_notes}</p>
        </div>
      )}

      {/* Next week */}
      {plan?.products_to_introduce_next_week?.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Introducing next week</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {plan.products_to_introduce_next_week.map((p: string, i: number) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: '#EDE9FE', color: '#7C5CFC', fontWeight: 600 }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #6EE7B7', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
          ✓ This plan was generated in real-time using your products and your rules. Every customer gets a unique plan.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>← Back</button>
        <button onClick={() => onComplete({ preview_approved: true })}
          style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Looks great → Go live
        </button>
      </div>
    </div>
  )
}