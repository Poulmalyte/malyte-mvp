// placeholder'use client'

import { useState } from 'react'

interface Question {
  id: string
  text: string
  type: 'text' | 'select' | 'multiselect'
  options?: string[]
  enabled: boolean
}

interface Props {
  merchant: any
  merchantProfile: any
  catalogItems: any[]
  shopDomain: string | null
}

type Phase = 'quiz' | 'loading' | 'plan'

export default function StartClient({ merchant, merchantProfile, catalogItems, shopDomain }: Props) {
  const [phase, setPhase] = useState<Phase>('quiz')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [packageViewed, setPackageViewed] = useState(false)

  const questions: Question[] = merchantProfile?.customer_questions?.length > 0
    ? merchantProfile.customer_questions
    : getDefaultQuestions(merchant?.category || 'Skincare')

  const brandName = merchant?.name || 'this brand'
  const category = merchant?.category || 'Skincare'

  async function handleSubmitQuiz() {
    if (!email.trim()) { setError('Please enter your email to receive your plan.'); return }
    const unanswered = questions.filter(q => q.enabled && !answers[q.id])
    if (unanswered.length > 0) { setError('Please answer all questions.'); return }
    setError('')
    setPhase('loading')
    try {
      const res = await fetch('/api/shopify/generate-plan-and-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          quiz_answers: { ...answers, email },
          customer_email: email,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error generating plan.'); setPhase('quiz'); return }
      setResult(json)
      setPhase('plan')
    } catch (e: any) {
      setError(e.message || 'Error')
      setPhase('quiz')
    }
  }

  function handleAnswerChange(qId: string, value: any) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  if (phase === 'loading') return <LoadingScreen brandName={brandName} />
  if (phase === 'plan' && result) return (
    <PlanScreen
      result={result}
      brandName={brandName}
      category={category}
      shopDomain={shopDomain}
      packageViewed={packageViewed}
      setPackageViewed={setPackageViewed}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>
            {brandName}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3 }}>
            Your personalised {category.toLowerCase()} routine starts here
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Answer {questions.filter(q => q.enabled).length} quick questions and get a routine built specifically for you — with exactly the products you need, introduced at the right time.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E8EDF8', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {questions.filter(q => q.enabled).map((q, i) => (
              <div key={q.id}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 10 }}>
                  {i + 1}. {q.text}
                </label>
                {q.type === 'text' && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer…"
                    rows={2}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E8EDF8', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#F8FAFC', color: '#0F172A' }}
                  />
                )}
                {(q.type === 'select' || q.type === 'multiselect') && q.options && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {q.options.map(opt => {
                      const isSelected = q.type === 'multiselect'
                        ? (answers[q.id] || []).includes(opt)
                        : answers[q.id] === opt
                      return (
                        <button key={opt} onClick={() => {
                          if (q.type === 'multiselect') {
                            const current = answers[q.id] || []
                            handleAnswerChange(q.id, isSelected ? current.filter((x: string) => x !== opt) : [...current, opt])
                          } else {
                            handleAnswerChange(q.id, opt)
                          }
                        }}
                          style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: `1px solid ${isSelected ? '#7C5CFC' : '#E8EDF8'}`, background: isSelected ? '#EDE9FE' : '#F8FAFC', color: isSelected ? '#7C5CFC' : '#64748B' }}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px 28px', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 8 }}>
            Where should we send your plan?
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8EDF8', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#F8FAFC', color: '#0F172A' }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmitQuiz}
          style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,92,252,0.3)' }}>
          Get my personalised routine →
        </button>

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
          Free · No account needed · Ready in under 60 seconds
        </p>
      </div>
    </div>
  )
}

function LoadingScreen({ brandName }: { brandName: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✨</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif" }}>
          Building your routine…
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
          Analysing your profile and selecting the right products from {brandName}.
        </p>
        <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)', borderRadius: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    </div>
  )
}

function PlanScreen({ result, brandName, category, shopDomain, packageViewed, setPackageViewed }: {
  result: any, brandName: string, category: string, shopDomain: string | null,
  packageViewed: boolean, setPackageViewed: (v: boolean) => void
}) {
  const { plan, package: pkg, customer_summary } = result

  function handleAddToCart() {
    setPackageViewed(true)
    if (pkg?.cart_url) window.open(pkg.cart_url, '_blank')
  }

  const RoutineItem = ({ item, color, bg, border }: any) => (
    <div style={{ padding: '14px 16px', background: bg, borderRadius: 12, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: border, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>Step {item.step_number}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.price && <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>€{Number(item.price).toFixed(2)}</span>}
          {item.product_url && (
            <a href={item.product_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
              View →
            </a>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
      {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>{brandName}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', borderRadius: 20, padding: '24px', marginBottom: 20, color: '#fff' }}>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your personalised plan · Week 1</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3 }}>
            {plan?.headline || `Your ${category} Routine`}
          </h1>
          {customer_summary && <p style={{ fontSize: 13, opacity: 0.9, margin: 0, lineHeight: 1.5 }}>{customer_summary}</p>}
        </div>

        {plan?.weekly_notes && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF8', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{plan.weekly_notes}"</p>
          </div>
        )}

        {plan?.morning_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>☀️ Morning routine</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.morning_routine.map((item: any, i: number) => <RoutineItem key={i} item={item} color="#F59E0B" bg="#FFFBEB" border="#FDE68A" />)}
            </div>
          </div>
        )}

        {plan?.evening_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>🌙 Evening routine</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.evening_routine.map((item: any, i: number) => <RoutineItem key={i} item={item} color="#6385FF" bg="#EEF2FF" border="#C7D2FE" />)}
            </div>
          </div>
        )}

        {pkg && (
          <div style={{ background: '#fff', borderRadius: 20, border: '2px solid #7C5CFC', padding: '20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7C5CFC', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Starter Bundle</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{pkg.package_name}</p>
              </div>
              {pkg.total_price > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px' }}>Total</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#7C5CFC', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>€{Number(pkg.total_price).toFixed(2)}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(pkg.items || []).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_title}</p>
                    {item.reason && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{item.reason}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {item.price && <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>€{Number(item.price).toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
            {pkg.cart_url ? (
              <button onClick={handleAddToCart}
                style={{ width: '100%', padding: '16px', borderRadius: 12, fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,92,252,0.3)' }}>
                Add bundle to cart →
              </button>
            ) : (
              <div style={{ padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#7C5CFC', margin: 0, fontWeight: 600 }}>Visit {brandName} to get started</p>
              </div>
            )}
          </div>
        )}

        {plan?.what_changes_next_week && (
          <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #6EE7B7', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next week</p>
            <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.6 }}>{plan.what_changes_next_week}</p>
          </div>
        )}

        <div style={{ background: '#F5F3FF', borderRadius: 14, border: '1px solid #DDD6FE', padding: '16px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', margin: '0 0 8px' }}>Your routine evolves with you</p>
          <p style={{ fontSize: 12, color: '#5B21B6', margin: 0, lineHeight: 1.6 }}>
            Every week your plan adapts based on your progress. New products are introduced at exactly the right moment — never too much, never too soon.
          </p>
        </div>
      </div>
    </div>
  )
}

function getDefaultQuestions(category: string): Question[] {
  const defaults: Record<string, Question[]> = {
    Skincare: [
      { id: '1', text: 'What is your skin type?', type: 'select', options: ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'], enabled: true },
      { id: '2', text: 'What are your main skin concerns?', type: 'multiselect', options: ['Hydration', 'Anti-aging', 'Brightening', 'Acne', 'Redness', 'Uneven texture'], enabled: true },
      { id: '3', text: 'Any known sensitivities or allergies?', type: 'text', enabled: true },
      { id: '4', text: 'Describe your current routine briefly', type: 'text', enabled: true },
      { id: '5', text: 'How many steps can you commit to daily?', type: 'select', options: ['2-3 steps', '4-5 steps', '6+ steps'], enabled: true },
    ],
    Fitness: [
      { id: '1', text: 'What is your main fitness goal?', type: 'select', options: ['Lose weight', 'Build muscle', 'Improve endurance', 'Stay active'], enabled: true },
      { id: '2', text: 'What is your current fitness level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], enabled: true },
      { id: '3', text: 'How many days per week can you train?', type: 'select', options: ['2-3 days', '4-5 days', '6-7 days'], enabled: true },
      { id: '4', text: 'What equipment do you have access to?', type: 'select', options: ['No equipment', 'Home equipment', 'Full gym'], enabled: true },
      { id: '5', text: 'Any injuries or limitations?', type: 'text', enabled: true },
    ],
    Nutrition: [
      { id: '1', text: 'What is your main nutrition goal?', type: 'select', options: ['Lose weight', 'Gain muscle', 'Improve energy', 'Eat healthier'], enabled: true },
      { id: '2', text: 'Do you follow any specific diet?', type: 'select', options: ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'], enabled: true },
      { id: '3', text: 'Any food allergies?', type: 'text', enabled: true },
      { id: '4', text: 'How active are you daily?', type: 'select', options: ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'], enabled: true },
      { id: '5', text: 'What results do you want in the first month?', type: 'text', enabled: true },
    ],
  }
  return defaults[category] || defaults['Skincare']
}