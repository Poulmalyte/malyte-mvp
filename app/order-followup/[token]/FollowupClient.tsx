'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  order: any
  merchant: any
  shopifyProducts: any[]
  merchantProfile?: any
}

const DEFAULT_QUESTIONS = [
  { id: 'experience', text: 'What is your experience level with this type of product?', type: 'select', options: ['Complete beginner', 'Some experience', 'Experienced user'] },
  { id: 'goal', text: 'What is your main goal with this purchase?', type: 'select', options: ['See quick results', 'Build a long-term routine', 'Solve a specific problem', 'Maintain current results'] },
  { id: 'time', text: 'How much time can you dedicate daily?', type: 'select', options: ['2-3 minutes', '5-10 minutes', '15+ minutes'] },
  { id: 'concern', text: 'Any specific concerns we should know about?', type: 'text' },
]

export default function FollowupClient({ order, merchant, shopifyProducts, merchantProfile }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const brandName = merchant?.name || order.shop_domain?.replace('.myshopify.com', '') || 'your brand'
  const productNames = shopifyProducts.map(p => p.shopify_product_title).filter(Boolean)

  const QUESTIONS: any[] = merchantProfile?.customer_questions?.length > 0
    ? merchantProfile.customer_questions.filter((q: any) => q.enabled !== false)
    : DEFAULT_QUESTIONS

  async function handleSubmit() {
    const unanswered = QUESTIONS.filter((q: any) => q.type === 'select' && !answers[q.id])
    if (unanswered.length > 0) { setError('Please answer all questions.'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/shopify/generate-followup-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_token: order.token,
          quiz_answers: answers,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error generating plan.'); setLoading(false); return }
      router.push(`/routine/${json.plan_token}`)
    } catch (e: any) {
      setError(e.message || 'Error')
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✨</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif" }}>
          Building your plan…
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
          Creating a personalised routine for your {brandName} products.
        </p>
        <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)', borderRadius: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>
            {brandName}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', borderRadius: 20, padding: '24px', marginBottom: 20, color: '#fff' }}>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Thank you for your order
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3 }}>
            Get the most out of your products
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
            Answer 4 quick questions and we'll build a personalised routine around what you just bought.
          </p>
        </div>

        {/* Prodotti acquistati */}
        {productNames.length > 0 && (
          <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #6EE7B7', padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your order includes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {productNames.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EDF8', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {QUESTIONS.map((q: any, i: number) => (
              <div key={q.id}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 10 }}>
                  {i + 1}. {q.text}
                  {q.type === 'select' && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                </label>
                {q.type === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options!.map(opt => {
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
                    placeholder="Optional — any details that might help us personalise your plan…"
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

        <button onClick={handleSubmit}
          style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,92,252,0.3)' }}>
          Build my personalised routine →
        </button>

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
          Free · Takes less than 60 seconds · Your plan is saved permanently
        </p>
      </div>
    </div>
  )
}