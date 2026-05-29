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

const CHECKIN_QUESTIONS = [
  'How did you feel this week overall? (1-10)',
  'Did you follow the plan? What was difficult?',
  'Any physical changes or results you noticed?',
  'What would you like to focus on next week?',
]

const DAY_COLORS: Record<string, string> = {
  Monday: '#7C5CFC', Tuesday: '#6385FF', Wednesday: '#059669',
  Thursday: '#D97706', Friday: '#EC4899', Saturday: '#8B5CF6', Sunday: '#0EA5E9'
}

function NutritionDay({ day }: { day: any }) {
  const color = DAY_COLORS[day.day] || '#7C5CFC'
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E8EDF8', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ background: color, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{day.day}</span>
        {day.kcal && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{day.kcal} kcal</span>}
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {day.breakfast && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>☀️</span>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Breakfast</p>
              <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{day.breakfast}</p>
            </div>
          </div>
        )}
        {day.lunch && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🥗</span>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Lunch</p>
              <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{day.lunch}</p>
            </div>
          </div>
        )}
        {day.dinner && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🍽️</span>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Dinner</p>
              <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{day.dinner}</p>
            </div>
          </div>
        )}
        {day.activity && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🏃</span>
            <div>
              <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{day.activity}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanSection({ section }: { section: any }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 14 }}>{section.title}</h3>
      {section.type === 'days' && section.days?.map((day: any, i: number) => (
        <NutritionDay key={i} day={day} />
      ))}
      {section.type === 'days' && section.note && (
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', border: '1px solid #E8EDF8', marginTop: 4 }}>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>📌 {section.note}</p>
        </div>
      )}
      {section.type === 'text' && (
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{section.content}</p>
      )}
      {!section.type && section.content && (
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{section.content}</p>
      )}
    </div>
  )
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
  const [currentWeek, setCurrentWeek] = useState<number>(existingPlan?.week_number || 1)
  const [step, setStep] = useState<'auth' | 'questionnaire' | 'plan' | 'checkin'>(existingPlan ? 'plan' : 'auth')
  const [checkinAnswers, setCheckinAnswers] = useState<Record<string, string>>({})
  const [checkinLoading, setCheckinLoading] = useState(false)

  useEffect(() => {
    if (!existingPlan) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser(user)
          setStep('questionnaire')
        }
      })
    }
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
    if (json.plan) { setPlan(json.plan); setCurrentWeek(1); setStep('plan') }
    else alert('Error generating plan. Please try again.')
    setGenerating(false)
  }

  async function handleCheckin() {
    for (const q of CHECKIN_QUESTIONS) {
      if (!checkinAnswers[q]?.trim()) {
        alert('Please answer all check-in questions'); return
      }
    }
    setCheckinLoading(true)
    const res = await fetch('/api/shopify/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, week_number: currentWeek, answers: checkinAnswers }),
    })
    const json = await res.json()
    if (json.plan) {
      setPlan(json.plan)
      setCurrentWeek(json.week_number)
      setCheckinAnswers({})
      setStep('plan')
    } else {
      alert('Error generating next week plan. Please try again.')
    }
    setCheckinLoading(false)
  }

  const isPlanWeekly = shopifyProduct?.plan_type === 'weekly'
  const totalWeeks = shopifyProduct?.duration_weeks || 4

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
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
          <div>
            {isPlanWeekly && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#EDE9FE', borderRadius: 12, padding: '12px 18px' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#7C5CFC' }}>Week {currentWeek} of {totalWeeks}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalWeeks }, (_, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < currentWeek ? '#7C5CFC' : '#C4B5FD' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 28, marginBottom: 16 }}>
              <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <p style={{ fontWeight: 700, color: '#059669', fontSize: 15, margin: '0 0 4px' }}>✓ Your plan is ready!</p>
                <p style={{ color: '#065F46', fontSize: 13, margin: 0 }}>You can come back anytime at app.malyte.com</p>
              </div>
              <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>
                {plan.plan_title || 'Your personalized plan'}
              </h2>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{plan.welcome_message}</p>

              {plan.sections?.map((section: any, i: number) => (
                <PlanSection key={i} section={section} />
              ))}

              {plan.tips?.length > 0 && (
                <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#7C5CFC', marginBottom: 10 }}>💡 Tips for this week</p>
                  {plan.tips.map((tip: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ color: '#7C5CFC', fontWeight: 700, flexShrink: 0 }}>•</span>
                      <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'linear-gradient(135deg, #EDE9FE, #D1FDF3)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#5B21B6', fontWeight: 600, margin: 0 }}>{plan.closing_message}</p>
              </div>
            </div>

            {isPlanWeekly && currentWeek < totalWeeks && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 24 }}>
                {plan.checkin_message && (
                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, margin: 0 }}>{plan.checkin_message}</p>
                  </div>
                )}
                <button onClick={() => setStep('checkin')}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  📋 Do week {currentWeek} check-in & get week {currentWeek + 1} →
                </button>
              </div>
            )}

            {isPlanWeekly && currentWeek >= totalWeeks && (
              <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 16, padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 20, marginBottom: 8 }}>🎉</p>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#059669', marginBottom: 4 }}>Program completed!</p>
                <p style={{ fontSize: 13, color: '#065F46' }}>You have completed all {totalWeeks} weeks. Congratulations!</p>
              </div>
            )}
          </div>
        )}

        {step === 'checkin' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: 28 }}>
            <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A', marginBottom: 6 }}>
              Week {currentWeek} check-in
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              Tell us how week {currentWeek} went so we can adapt your next plan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CHECKIN_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <label style={{ fontSize: 13, color: '#0F172A', display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    {i + 1}. {q}
                  </label>
                  <input type="text" value={checkinAnswers[q] || ''}
                    onChange={e => setCheckinAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    placeholder="Your answer…" style={input} />
                </div>
              ))}
            </div>
            <button onClick={handleCheckin} disabled={checkinLoading}
              style={{ width: '100%', marginTop: 24, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', color: '#fff', border: 'none', cursor: checkinLoading ? 'not-allowed' : 'pointer', opacity: checkinLoading ? 0.7 : 1 }}>
              {checkinLoading ? 'Generating week ' + (currentWeek + 1) + ' plan…' : '✨ Generate week ' + (currentWeek + 1) + ' plan →'}
            </button>
            <button onClick={() => setStep('plan')}
              style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 13, background: 'transparent', color: '#94A3B8', border: '1px solid #E8EDF8', cursor: 'pointer' }}>
              ← Back to plan
            </button>
          </div>
        )}

      </div>
    </div>
  )
}