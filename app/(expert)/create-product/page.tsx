'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type QuestionType = 'text' | 'select'

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  allow_multiple: boolean
  options: string[]
}

interface ProgressIndicator {
  id: string
  label: string
  custom: boolean
}

const DURATION_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
]

const PRESET_INDICATORS = [
  { id: 'weight_loss', label: 'Weight loss progress' },
  { id: 'energy', label: 'Energy levels' },
  { id: 'muscle_gain', label: 'Muscle gain' },
  { id: 'skin_clarity', label: 'Skin clarity' },
  { id: 'sleep_quality', label: 'Sleep quality' },
  { id: 'stress_levels', label: 'Stress levels' },
  { id: 'mood', label: 'Mood' },
  { id: 'adherence', label: 'Adherence to plan' },
  { id: 'digestion', label: 'Digestion' },
  { id: 'hydration', label: 'Hydration' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  background: '#F5F7FA', border: '1px solid #E8EDF8',
  color: '#0F172A', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

function QuestionBuilder({
  questions, setQuestions,
  placeholder = 'e.g. What is your main goal?',
}: {
  questions: Question[]
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>
  placeholder?: string
}) {
  function addQuestion() {
    setQuestions(prev => [...prev, { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] }])
  }
  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }
  function addOption(questionId: string) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: [...q.options, ''] } : q))
  }
  function updateOption(questionId: string, index: number, value: string) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: q.options.map((o, i) => i === index ? value : o) } : q))
  }
  function removeOption(questionId: string, index: number) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: q.options.filter((_, i) => i !== index) } : q))
  }
  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ background: '#F5F7FA', borderRadius: 12, padding: 20, border: '1px solid #E8EDF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#7C5CFC', fontSize: 12, fontWeight: 600 }}>Question {i + 1}</span>
              <button type="button" onClick={() => removeQuestion(q.id)}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
            <input type="text" value={q.question_text}
              onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
              placeholder={placeholder}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['text', 'select'] as QuestionType[]).map(type => (
                <button key={type} type="button" onClick={() => updateQuestion(q.id, 'question_type', type)}
                  style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${q.question_type === type ? '#7C5CFC' : '#E8EDF8'}`,
                    background: q.question_type === type ? '#EDE9FE' : '#FFFFFF',
                    color: q.question_type === type ? '#7C5CFC' : '#94A3B8',
                    cursor: 'pointer',
                  }}>
                  {type === 'text' ? '✏️ Open answer' : '☑️ Multiple choice'}
                </button>
              ))}
            </div>
            {q.question_type === 'select' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <button type="button" onClick={() => updateQuestion(q.id, 'allow_multiple', !q.allow_multiple)}
                    style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${q.allow_multiple ? '#059669' : '#E8EDF8'}`,
                      background: q.allow_multiple ? '#D1FDF3' : '#FFFFFF',
                      color: q.allow_multiple ? '#059669' : '#94A3B8',
                      cursor: 'pointer',
                    }}>
                    {q.allow_multiple ? '✓ Multiple selections allowed' : 'Single selection only'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  {q.options.map((opt, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="text" value={opt} onChange={e => updateOption(q.id, j, e.target.value)}
                        placeholder={`Option ${j + 1}`}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E8EDF8', color: '#0F172A', fontSize: 13, outline: 'none' }}
                      />
                      <button type="button" onClick={() => removeOption(q.id, j)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addOption(q.id)}
                  style={{ fontSize: 12, color: '#7C5CFC', background: 'none', border: '1px dashed #C4B5FD', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                  + Add option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={addQuestion}
        style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: '1px dashed #C4B5FD', background: 'transparent', color: '#94A3B8', fontSize: 14, cursor: 'pointer' }}>
        + Add question
      </button>
    </div>
  )
}

export default function CreateProductPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [pricingModel, setPricingModel] = useState('')
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([])
  const [checkinQuestions, setCheckinQuestions] = useState<Question[]>([])
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([])
  const [customIndicators, setCustomIndicators] = useState<ProgressIndicator[]>([])
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pricingModels = [
    { id: 'one_time', label: '💳 One-time payment', desc: 'Client pays once and gets lifetime access' },
    { id: 'subscription', label: '🔄 Monthly subscription', desc: 'Client pays monthly for continued access' },
  ]

  function togglePresetIndicator(id: string) {
    const total = selectedIndicators.length + customIndicators.length
    if (selectedIndicators.includes(id)) {
      setSelectedIndicators(prev => prev.filter(i => i !== id))
    } else {
      if (total >= 4) return
      setSelectedIndicators(prev => [...prev, id])
    }
  }

  function addCustomIndicator() {
    if (!newCustomLabel.trim()) return
    if (selectedIndicators.length + customIndicators.length >= 4) return
    setCustomIndicators(prev => [...prev, { id: crypto.randomUUID(), label: newCustomLabel.trim(), custom: true }])
    setNewCustomLabel('')
  }

  function removeCustomIndicator(id: string) {
    setCustomIndicators(prev => prev.filter(i => i.id !== id))
  }

  const totalIndicators = selectedIndicators.length + customIndicators.length

  async function handleSave() {
    if (!title || !description || !price || !pricingModel) { setError('Please fill in all product fields and select a sales model'); return }
    if (initialQuestions.length === 0) { setError('Add at least one initial question for your clients'); return }
    if (checkinQuestions.length === 0) { setError('Add at least one weekly check-in question'); return }
    if (totalIndicators === 0) { setError('Select at least one progress indicator'); return }
    for (const q of [...initialQuestions, ...checkinQuestions]) {
      if (!q.question_text.trim()) { setError('All questions must have text'); return }
      if (q.question_type === 'select' && q.options.filter(o => o.trim()).length < 2) { setError('Multiple choice questions need at least 2 options'); return }
    }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const allIndicators = [
        ...PRESET_INDICATORS.filter(p => selectedIndicators.includes(p.id)),
        ...customIndicators.map(c => ({ id: c.id, label: c.label })),
      ]
      const { data: product, error: productError } = await supabase.from('products').insert({
        expert_id: user.id, title, description,
        price: parseFloat(price), pricing_model: pricingModel,
        duration_months: durationMonths, is_published: true,
        progress_indicators: allIndicators,
      }).select().single()
      if (productError) throw productError
      await supabase.from('product_questions').insert(
        initialQuestions.map((q, i) => ({
          product_id: product.id, question_text: q.question_text,
          question_type: q.question_type, options: q.question_type === 'select' ? q.options.filter(o => o.trim()) : null,
          allow_multiple: q.question_type === 'select' ? q.allow_multiple : false, order_index: i,
        }))
      )
      await supabase.from('product_checkin_questions').insert(
        checkinQuestions.map((q, i) => ({
          product_id: product.id, question_text: q.question_text,
          question_type: q.question_type === 'select' ? 'select' : 'text',
          options: q.question_type === 'select' ? q.options.filter(o => o.trim()) : null, order_index: i,
        }))
      )
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Unexpected error. Please try again.')
      setLoading(false)
    }
  }

  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 16, padding: 28,
    marginBottom: 20, border: '1px solid #E8EDF8',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to dashboard
          </button>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px 0' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 26, color: '#0F172A', margin: '0 0 6px' }}>
            Create a new product
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
            Define your product, the initial questions and the weekly check-in questions.
          </p>
        </div>

        {/* Product details */}
        <div style={card}>
          <h2 style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Product details
          </h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Product name</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 3-Month Weight Loss Plan" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what the client will receive..." rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Price (€)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 49" min="1"
              style={{ ...inputStyle, width: 160 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 12, fontWeight: 500 }}>Program duration</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setDurationMonths(opt.value)}
                  style={{
                    padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    border: `1px solid ${durationMonths === opt.value ? '#7C5CFC' : '#E8EDF8'}`,
                    background: durationMonths === opt.value ? '#EDE9FE' : '#F5F7FA',
                    color: durationMonths === opt.value ? '#7C5CFC' : '#94A3B8',
                    cursor: 'pointer',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
              A new weekly plan is generated every 6 days, adapting to the client&apos;s progress.
            </p>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 12, fontWeight: 500 }}>Sales model</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pricingModels.map(model => (
                <button key={model.id} type="button" onClick={() => setPricingModel(model.id)}
                  style={{
                    padding: '14px 18px', borderRadius: 12, textAlign: 'left',
                    border: `1px solid ${pricingModel === model.id ? '#7C5CFC' : '#E8EDF8'}`,
                    background: pricingModel === model.id ? '#EDE9FE' : '#F5F7FA',
                    cursor: 'pointer',
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: pricingModel === model.id ? '#7C5CFC' : '#0F172A', marginBottom: 2 }}>{model.label}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{model.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div style={card}>
          <h2 style={{ color: '#D97706', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Progress indicators
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
            Choose up to 4 metrics to track weekly. <strong style={{ color: '#0F172A' }}>Select {4 - totalIndicators} more.</strong>
          </p>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginBottom: 4 }}>💡 Why progress indicators matter</p>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              After each weekly check-in, the AI automatically scores your client&apos;s progress on these dimensions (1–10). The client sees a chart that updates every week, showing their improvement over time.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {PRESET_INDICATORS.map(ind => {
              const selected = selectedIndicators.includes(ind.id)
              const disabled = !selected && totalIndicators >= 4
              return (
                <button key={ind.id} type="button" onClick={() => togglePresetIndicator(ind.id)} disabled={disabled}
                  style={{
                    padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                    border: `1px solid ${selected ? '#D97706' : '#E8EDF8'}`,
                    background: selected ? '#FEF3C7' : '#F5F7FA',
                    color: selected ? '#D97706' : disabled ? '#C7D2F0' : '#64748B',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                  }}>
                  {selected ? '✓ ' : ''}{ind.label}
                </button>
              )
            })}
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 8 }}>Or add a custom indicator:</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomIndicator()}
                placeholder="e.g. Back pain level, Glowing skin score..."
                disabled={totalIndicators >= 4}
                style={{ ...inputStyle, flex: 1, opacity: totalIndicators >= 4 ? 0.5 : 1 }}
              />
              <button type="button" onClick={addCustomIndicator} disabled={totalIndicators >= 4 || !newCustomLabel.trim()}
                style={{
                  padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: '#FEF3C7', border: '1px solid #FDE68A',
                  color: '#D97706', cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: totalIndicators >= 4 || !newCustomLabel.trim() ? 0.4 : 1,
                }}>
                + Add
              </button>
            </div>
            {customIndicators.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {customIndicators.map(ind => (
                  <div key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                    <span style={{ fontSize: 12, color: '#D97706' }}>✦ {ind.label}</span>
                    <button type="button" onClick={() => removeCustomIndicator(ind.id)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Initial questions */}
        <div style={card}>
          <h2 style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Initial questions
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
            Asked once after purchase. The AI uses these to generate the Week 1 plan.
          </p>
          <QuestionBuilder questions={initialQuestions} setQuestions={setInitialQuestions} placeholder="e.g. What is your main goal?" />
        </div>

        {/* Weekly check-in questions */}
        <div style={card}>
          <h2 style={{ color: '#059669', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Weekly check-in questions
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
            Shown to the client at day 6 of each week. The AI uses their answers to adapt the next week&apos;s plan.
          </p>
          <QuestionBuilder questions={checkinQuestions} setQuestions={setCheckinQuestions} placeholder="e.g. How much weight did you lose this week?" />
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="button" onClick={handleSave} disabled={loading}
          style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: loading ? '#C4B5FD' : '#7C5CFC',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
          {loading ? 'Saving...' : '🚀 Publish product'}
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '20px 24px', textAlign: 'center', marginTop: 40, background: '#FFFFFF' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>© 2026 Malyte · AI-powered wellness programs</p>
      </div>
    </main>
  )
}