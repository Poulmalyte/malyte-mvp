'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  scheduledCheckin: any
  brandPlan: any
}

const CHECKIN_TEMPLATES: Record<string, any[]> = {
  Skincare: [
    { id: 'routine', text: 'How did your routine go this week?', type: 'select', options: ['Great — did it every day', 'Good — most days', 'Difficult — a few days', 'Did not follow it'] },
    { id: 'improvement', text: 'Have you noticed any improvements?', type: 'select', options: ['Yes, a lot', 'A little', 'No change', 'It got worse'] },
    { id: 'reaction', text: 'Any reactions or irritations?', type: 'select', options: ['None at all', 'Slight redness', 'Some irritation', 'Yes, I stopped a product'] },
    { id: 'comment', text: 'Anything else you want to share?', type: 'text' },
  ],
  Fitness: [
    { id: 'adherence', text: 'How many sessions did you complete?', type: 'select', options: ['All of them', 'Most', 'About half', 'Very few'] },
    { id: 'energy', text: 'How was your energy level?', type: 'select', options: ['High', 'Good', 'Average', 'Low'] },
    { id: 'soreness', text: 'How was your recovery?', type: 'select', options: ['Great', 'Some soreness', 'Very sore', 'Had an issue'] },
    { id: 'comment', text: 'Anything else?', type: 'text' },
  ],
  Nutrition: [
    { id: 'adherence', text: 'How well did you follow the protocol?', type: 'select', options: ['Perfectly', 'Mostly', 'Partially', 'Not at all'] },
    { id: 'digestion', text: 'How was your digestion?', type: 'select', options: ['Great', 'Good', 'Some issues', 'Bad'] },
    { id: 'energy', text: 'How was your energy?', type: 'select', options: ['High', 'Good', 'Average', 'Low'] },
    { id: 'comment', text: 'Anything else?', type: 'text' },
  ],
}

const FALLBACK_TEMPLATE = CHECKIN_TEMPLATES['Skincare']

export default function CheckinClient({ scheduledCheckin, brandPlan }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const category = brandPlan?.category || 'Skincare'
  const brandName = brandPlan?.merchant_name || 'your brand'
  const weekNumber = scheduledCheckin?.week_number || 1

  // Usa template dal scheduled_checkin se presente, altrimenti default per categoria
  const questions = scheduledCheckin?.questions_template?.length > 0
    ? scheduledCheckin.questions_template
    : CHECKIN_TEMPLATES[category] || FALLBACK_TEMPLATE

  async function handleSubmit() {
    const requiredAnswered = questions
      .filter((q: any) => q.type === 'select')
      .every((q: any) => answers[q.id])

    if (!requiredAnswered) {
      setError('Please answer all questions before continuing.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/shopify/submit-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_token: scheduledCheckin.checkin_token,
          answers,
          brand_plan_id: brandPlan.id,
          week_number: weekNumber,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error submitting check-in.'); setSubmitting(false); return }
      router.push(`/routine/${json.new_plan_token || brandPlan.token}`)
    } catch (e: any) {
      setError(e.message || 'Error')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>
            {brandName}
          </span>
          <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '4px 12px', borderRadius: 100 }}>
            Week {weekNumber} check-in
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3 }}>
            Week {weekNumber} check-in
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            How did your routine go this week? Your answers will update your plan for next week.
          </p>
        </div>

        {/* Questions */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EDF8', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {questions.map((q: any, i: number) => (
              <div key={q.id}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 12 }}>
                  {i + 1}. {q.text}
                  {q.type === 'select' && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                </label>
                {q.type === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map((opt: string) => {
                      const isSelected = answers[q.id] === opt
                      return (
                        <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', border: `1px solid ${isSelected ? '#7C5CFC' : '#E8EDF8'}`, background: isSelected ? '#EDE9FE' : '#F8FAFC', color: isSelected ? '#7C5CFC' : '#64748B', transition: 'all 0.15s' }}>
                          {isSelected && <span style={{ marginRight: 8 }}>✓</span>}
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}
                {q.type === 'text' && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Optional — share anything that might help update your plan…"
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8EDF8', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#F8FAFC', color: '#0F172A' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: 15, background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 20px rgba(124,92,252,0.3)', transition: 'all 0.2s' }}>
          {submitting ? 'Updating your plan…' : 'Submit & see updated plan →'}
        </button>

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
          Your plan will be updated based on your answers
        </p>
      </div>
    </div>
  )
}