'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', fontSize: 14, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export default function PlanClient({ order, shopifyProduct, existingPlan, token }: {
  order: any
  shopifyProduct: any
  existingPlan: any
  token: string
}) {
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState(order.buyer_email || '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(existingPlan?.plan_data || null)
  const [step, setStep] = useState<'auth' | 'questionnaire' | 'plan'>('auth')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        setStep(existingPlan ? 'plan' : 'questionnaire')
      }
    })
  }, [])

  async function handleAuth() {
    setAuthLoading(true); setAuthError('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setAuthError(error.message); setAuthLoading(false); return }
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id, name, role: 'client',
            consent_terms: true, consent_timestamp: new Date().toISOString(),
          }, { onConflict: 'id' })
          await fetch('/api/shopify/link-buyer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, buyer_id: data.user.id }),
          })
          setUser(data.user)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setAuthError(error.message); setAuthLoading(false); return }
        if (data.user) {
          await fetch('/api/shopify/link-buyer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, buyer_id: data.user.id }),
          })
          setUser(data.user)
        }
      }
      setStep(existingPlan ? 'plan' : 'questionnaire')
    } catch {
      setAuthError('Something went wrong. Please try again.')
    }
    setAuthLoading(false)
  }

  async function handleGeneratePlan() {
    if (!shopifyProduct) return
    const questions: any[] = shopifyProduct.questions || []
    for (const q of questions) {
      if (!answers[q.question_text]?.trim()) {
        alert('Please answer all questions'); return
      }
    }
    setGenerating(true)
    const res = await fetch('/api/shopify/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, answers }),
    })
    const json = await res.json()
    if (json.plan) { setPlan(json.plan); setStep('plan') }
    else alert('Error generating plan. Please try again.')
    setGenerating(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 24, color: '#0F172A' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 8 }}>Your personalized plan is ready to be generated.</p>
        </div>

        {step === 'auth' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 28 }}>
            <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 6 }}>
              {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              {authMode === 'signup' ? 'Create a free account to access your plan anytime.' : 'Log in to access your plan.'}
            </p>
            {authMode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 500 }}>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sara Rossi" style={input} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={input} />
            </div>
            {authError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1, marginBottom: 14 }}>
              {authLoading ? 'Loading…' : authMode === 'signup' ? 'Create account & continue →' : 'Log in & continue →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B' }}>
              {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError('') }}
                style={{ color: '#7C5CFC', fontWeight: 600, cursor: 'pointer' }}>
                {authMode === 'signup' ? 'Log in' : 'Sign up'}
              </span>
            </p>
          </div>
        )}

        {step === 'questionnaire' && shopifyProduct && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 28 }}>
            <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 6 }}>
              Tell us about yourself
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              Answer these questions so we can generate your personalized plan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(shopifyProduct.questions || []).map((q: any, i: number) => (
                <div key={i}>
                  <label style={{ fontSize: 13, color: '#0F172A', display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    {i + 1}. {q.question_text}
                  </label>
                  {q.question_type === 'select' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((opt: string, j: number) => (
                        <button key={j} type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.question_text]: opt }))}
                          style={{
                            padding: '10px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', fontSize: 13,
                            border: `1px solid ${answers[q.question_text] === opt ? '#7C5CFC' : '#E8EDF8'}`,
                            background: answers[q.question_text] === opt ? '#EDE9FE' : '#F8FAFC',
                            color: answers[q.question_text] === opt ? '#7C5CFC' : '#0F172A',
                            fontWeight: answers[q.question_text] === opt ? 600 : 400,
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={answers[q.question_text] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.question_text]: e.target.value }))}
                      placeholder="Your answer…" style={input} />
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleGeneratePlan} disabled={generating}
              style={{ width: '100%', marginTop: 24, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', color: '#fff', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
              {generating ? 'Generating your plan…' : '✨ Generate my plan →'}
            </button>
          </div>
        )}

        {step === 'plan' && plan && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 28 }}>
            <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <p style={{ fontWeight: 700, color: '#059669', fontSize: 15, margin: '0 0 4px' }}>✓ Your plan is ready!</p>
              <p style={{ color: '#065F46', fontSize: 13, margin: 0 }}>You can come back anytime at app.malyte.com</p>
            </div>
            <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>
              {plan.plan_title || 'Your personalized plan'}
            </h2>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{plan.welcome_message}</p>
            {plan.sections?.map((section: any, i: number) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 8 }}>{section.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>{section.content}</p>
              </div>
            ))}
            {plan.tips?.length > 0 && (
              <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#7C5CFC', marginBottom: 8 }}>💡 Tips</p>
                {plan.tips.map((tip: string, i: number) => (
                  <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px' }}>• {tip}</p>
                ))}
              </div>
            )}
            <p style={{ fontSize: 14, color: '#059669', fontWeight: 600, textAlign: 'center' }}>{plan.closing_message}</p>
          </div>
        )}

      </div>
    </div>
  )
}