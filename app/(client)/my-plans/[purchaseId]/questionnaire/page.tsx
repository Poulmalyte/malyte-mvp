'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Question {
  id: string
  question_text: string
  question_type: 'text' | 'select'
  options: string[] | null
  allow_multiple: boolean
  order_index: number
}

export default function QuestionnairePage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.purchaseId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      const supabase = createClient()
      const { data: purchase } = await supabase.from('purchases').select('product_id').eq('id', purchaseId).single()
      if (!purchase) { setFetching(false); return }
      const { data: questions } = await supabase.from('product_questions').select('*').eq('product_id', purchase.product_id).order('order_index', { ascending: true })
      setQuestions(questions || [])
      setFetching(false)
    }
    fetchQuestions()
  }, [purchaseId])

  function toggleOption(questionId: string, opt: string, allowMultiple: boolean) {
    setAnswers(prev => {
      if (allowMultiple) {
        const current = (prev[questionId] as string[]) || []
        const updated = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt]
        return { ...prev, [questionId]: updated }
      }
      return { ...prev, [questionId]: opt }
    })
  }

  function isSelected(questionId: string, opt: string, allowMultiple: boolean) {
    if (allowMultiple) return ((answers[questionId] as string[]) || []).includes(opt)
    return answers[questionId] === opt
  }

  const allAnswered = questions.every(q => {
    const ans = answers[q.id]
    if (q.question_type === 'select') {
      if (q.allow_multiple) return Array.isArray(ans) && ans.length > 0
      return typeof ans === 'string' && ans.trim() !== ''
    }
    return typeof ans === 'string' && ans.trim() !== ''
  })

  const handleSubmit = async () => {
    if (!allAnswered) return
    setLoading(true)
    const normalizedAnswers: Record<string, string> = {}
    for (const [key, val] of Object.entries(answers)) {
      normalizedAnswers[key] = Array.isArray(val) ? val.join(', ') : val
    }
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, questionnaireAnswers: normalizedAnswers, weekNumber: 1 }),
      })
      if (!res.ok) throw new Error('Error generating plan')
      router.push(`/my-plans/${purchaseId}/plan`)
    } catch (err) {
      console.error(err)
      alert('Error generating plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  )

  if (questions.length === 0) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#94A3B8', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>No questions found for this product.</p>
        <button onClick={() => router.push(`/my-plans/${purchaseId}/plan`)}
          style={{ background: '#7C5CFC', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 24px', cursor: 'pointer', fontWeight: 600 }}>
          Go to my plan →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/my-plans" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>← My plans</Link>
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '28px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Step 1 of 2
          </p>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            Let&apos;s personalize your plan
          </h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            Answer these questions so the AI can build a plan specifically for you.
          </p>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '24px 24px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8EDF8' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>
                <span style={{ color: '#7C5CFC', marginRight: 6 }}>{i + 1}.</span>{q.question_text}
              </label>
              {q.question_type === 'select' && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                  {q.allow_multiple ? 'Select all that apply' : 'Select one'}
                </p>
              )}
              {q.question_type === 'select' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map(opt => {
                    const selected = isSelected(q.id, opt, q.allow_multiple)
                    return (
                      <button key={opt} onClick={() => toggleOption(q.id, opt, q.allow_multiple)}
                        style={{
                          textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                          fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: selected ? '#EDE9FE' : '#F5F7FA',
                          border: `1px solid ${selected ? '#7C5CFC' : '#E8EDF8'}`,
                          color: selected ? '#7C5CFC' : '#334155',
                        }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: q.allow_multiple ? 4 : 100,
                          border: `2px solid ${selected ? '#7C5CFC' : '#C7D2F0'}`,
                          background: selected ? '#7C5CFC' : 'transparent',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: '#fff',
                        }}>
                          {selected ? '✓' : ''}
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}
              {q.question_type === 'text' && (
                <textarea rows={3} placeholder="Write here..."
                  value={(answers[q.id] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                    resize: 'none', outline: 'none', background: '#F5F7FA',
                    border: '1px solid #E8EDF8', color: '#0F172A',
                    fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                  onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
                />
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={!allAnswered || loading}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none',
            cursor: allAnswered && !loading ? 'pointer' : 'not-allowed',
            background: allAnswered && !loading ? '#7C5CFC' : '#E8EDF8',
            color: allAnswered && !loading ? '#fff' : '#94A3B8',
            fontFamily: "'Inter', sans-serif",
          }}>
          {loading ? '✨ Generating your plan...' : 'Generate my personalized plan →'}
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '16px 24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>© 2026 Malyte · AI-powered wellness programs</p>
      </div>
    </div>
  )
}