'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  onComplete: (data: any) => void
  onBack: () => void
}

const LOADING_PHASES = [
  { label: 'Reading your catalog', target: 20, duration: 800 },
  { label: 'Matching products to profile', target: 45, duration: 1200 },
  { label: 'Building weekly routine', target: 70, duration: 1400 },
  { label: 'Personalising recommendations', target: 88, duration: 1000 },
  { label: 'Finalising your plan', target: 96, duration: 800 },
]

export default function Step4Preview({ onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [phaseLabel, setPhaseLabel] = useState(LOADING_PHASES[0].label)
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')
  const apiDone = useRef(false)
  const progressDone = useRef(false)

  useEffect(() => {
    runLoading()
    generatePreview()
  }, [])

  async function runLoading() {
    for (const phase of LOADING_PHASES) {
      setPhaseLabel(phase.label)
      await animateTo(phase.target, phase.duration)
    }
    progressDone.current = true
    // Se l'API ha già finito, vai a 100 subito
    if (apiDone.current) finishLoading()
  }

  function animateTo(target: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now()
      let current = 0
      setProgress(prev => { current = prev; return prev })

      function step(now: number) {
        const elapsed = now - start
        const t = Math.min(elapsed / duration, 1)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        const next = current + (target - current) * eased
        setProgress(Math.round(next))
        if (t < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  function finishLoading() {
    setPhaseLabel('Ready')
    animateTo(100, 400).then(() => {
      setTimeout(() => setLoading(false), 300)
    })
  }

  async function generatePreview() {
    setError('')
    try {
      const res = await fetch('/api/shopify/generate-preview', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to generate preview')
        setLoading(false)
        return
      }
      setPlan(json.plan)
    } catch (e: any) {
      setError(e.message || 'Error generating preview')
      setLoading(false)
      return
    }
    apiDone.current = true
    // Se l'animazione ha già finito, completa subito
    if (progressDone.current) finishLoading()
  }

  if (loading && !error) return (
    <div style={{ padding: '40px 8px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @media (max-width: 480px) {
          .preview-loading-title { font-size: 17px !important; }
          .preview-loading-phase { font-size: 12px !important; }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #EDE9FE, #DBEAFE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 20px',
        }}>📋</div>
        <h2 className="preview-loading-title" style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Satoshi', sans-serif" }}>
          Building your demo plan
        </h2>
        <p className="preview-loading-phase" style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
          {phaseLabel}…
        </p>
      </div>

      {/* Barra progresso */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 100,
            background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)',
            transition: 'width 0.1s linear',
            backgroundSize: '200% auto',
            animation: 'shimmer 2s linear infinite',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC', fontFamily: "'Satoshi', sans-serif" }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Fasi come checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {LOADING_PHASES.map((phase, i) => {
          const phaseProgress = LOADING_PHASES[i].target
          const done = progress >= phaseProgress
          const active = !done && progress >= (LOADING_PHASES[i - 1]?.target || 0)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#7C5CFC' : active ? '#EDE9FE' : '#F1F5F9',
                border: active ? '2px solid #7C5CFC' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {done && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C5CFC' }} />}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: done ? 600 : active ? 600 : 400,
                color: done ? '#0F172A' : active ? '#7C5CFC' : '#CBD5E1',
                transition: 'all 0.3s ease',
              }}>
                {phase.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (error) return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Plan Preview</h2>
      <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: '#EF4444', margin: '0 0 8px' }}>{error}</p>
        <button onClick={() => { setLoading(true); setProgress(0); apiDone.current = false; progressDone.current = false; runLoading(); generatePreview() }}
          style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Try again
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>← Back</button>
        <button onClick={() => onComplete({ preview_approved: true })} style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>Skip preview →</button>
      </div>
    </div>
  )

  return (
    <div>
      <style>{`
        @media (max-width: 480px) {
          .preview-title { font-size: 18px !important; }
          .preview-routine-item { padding: 10px 12px !important; }
          .preview-item-title { font-size: 12px !important; }
          .preview-btns { flex-direction: column !important; }
        }
      `}</style>

      <h2 className="preview-title" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Plan Preview</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
        This is exactly what <strong>{plan?.customer_name || 'your customer'}</strong> would receive after completing the intake quiz.
      </p>

      {/* Demo profile badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE', marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
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
              <div key={i} className="preview-routine-item" style={{ padding: '12px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: '#FEF3C7', padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>Step {item.step_number}</span>
                  <span className="preview-item-title" style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.product_title}</span>
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
              <div key={i} className="preview-routine-item" style={{ padding: '12px 14px', background: '#EEF2FF', borderRadius: 10, border: '1px solid #C7D2FE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', background: '#E0E7FF', padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>Step {item.step_number}</span>
                  <span className="preview-item-title" style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.product_title}</span>
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

      <div className="preview-btns" style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>← Back</button>
        <button onClick={() => onComplete({ preview_approved: true })}
          style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Looks great → Go live
        </button>
      </div>
    </div>
  )
}
