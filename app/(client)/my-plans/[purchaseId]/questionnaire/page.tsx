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
      const { data: purchase } = await supabase
        .from('purchases')
        .select('product_id')
        .eq('id', purchaseId)
        .single()
      if (!purchase) { setFetching(false); return }
      const { data: questions } = await supabase
        .from('product_questions')
        .select('*')
        .eq('product_id', purchase.product_id)
        .order('order_index', { ascending: true })
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

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9CA3AF', marginBottom: 16 }}>No questions found for this product.</p>
          <button onClick={() => router.push(`/my-plans/${purchaseId}/plan`)}
            style={{ background: '#7C5CFC', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 24px', cursor: 'pointer', fontWeight: 600 }}>
            Go to my plan →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* HERO DARK */}
      <div style={{ background: '#14182A', padding: '20px 24px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Link href="/my-plans" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
            ← My plans
          </Link>
          <p style={{ fontSize: 11, color: '#4DFFD2', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Step 1 of 2
          </p>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 26, fontWeight: 800, color: '#F1F3F9', marginBottom: 6 }}>
            Let&apos;s personalize your plan
          </h1>
          <p style={{ fontSize: 13, color: '#8B92A5' }}>
            Answer these questions so the AI can build a plan specifically for you.
          </p>
        </div>
      </div>

      {/* BODY LIGHT */}
      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '24px 24px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '16px 20px', border: '1px solid #EDE9E2' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 12 }}>
                <span style={{ color: '#7C5CFC', marginRight: 6 }}>{i + 1}.</span>{q.question_text}
              </label>
              {q.question_type === 'select' && (
                <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
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
                          textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: selected ? 'rgba(124,92,252,0.08)' : '#F9F8F6',
                          border: `1px solid ${selected ? '#7C5CFC' : '#EDE9E2'}`,
                          color: selected ? '#6D45E8' : '#4B5563',
                        }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: q.allow_multiple ? 4 : 100,
                          border: `2px solid ${selected ? '#7C5CFC' : '#D1D5DB'}`,
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
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', background: '#F9F8F6', border: '1px solid #EDE9E2', color: '#1F2937', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}
                />
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={!allAnswered || loading}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none',
            cursor: allAnswered && !loading ? 'pointer' : 'not-allowed',
            background: allAnswered && !loading ? '#7C5CFC' : '#E5E2D9',
            color: allAnswered && !loading ? '#fff' : '#9CA3AF',
            fontFamily: "'Inter', sans-serif",
          }}>
          {loading ? '✨ Generating your plan...' : 'Generate my personalized plan →'}
        </button>
      </div>

      {/* FOOTER DARK */}
      <div style={{ background: '#1E2337', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>© 2025 Malyte · AI-powered wellness programs</p>
      </div>

    </div>
  )
}