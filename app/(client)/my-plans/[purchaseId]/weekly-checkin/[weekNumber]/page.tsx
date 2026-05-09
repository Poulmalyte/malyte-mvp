'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface CheckinQuestion {
  id: string
  question_text: string
  question_type: 'text' | 'select' | 'number'
  options: string[] | null
  order_index: number
}

export default function WeeklyCheckinPage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.purchaseId as string
  const weekNumber = parseInt(params.weekNumber as string)

  const [questions, setQuestions] = useState<CheckinQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [freeNote, setFreeNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      const supabase = createClient()
      const { data: purchase } = await supabase.from('purchases').select('product_id').eq('id', purchaseId).single()
      if (!purchase) { setFetching(false); return }
      const { data: questions } = await supabase.from('product_checkin_questions').select('*').eq('product_id', purchase.product_id).order('order_index', { ascending: true })
      setQuestions(questions || [])
      setFetching(false)
    }
    fetchQuestions()
  }, [purchaseId])

  const allAnswered = questions.every(q => answers[q.id]?.trim())

  const handleSubmit = async () => {
    if (!allAnswered) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error: checkinError } = await supabase.from('weekly_checkins').insert({
        purchase_id: purchaseId, client_id: user.id, week_number: weekNumber,
        answers, free_note: freeNote.trim() || null,
      })
      if (checkinError) throw checkinError

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId, weekNumber: weekNumber + 1,
          questionnaireAnswers: {}, checkinAnswers: answers,
          freeNote: freeNote.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Error generating next week')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.error) throw new Error(data.error)
          if (data.done) router.push(`/my-plans/${purchaseId}/plan`)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error saving check-in. Please try again.')
      setLoading(false)
    }
  }

  if (fetching) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/my-plans/${purchaseId}/plan`} style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
            ← Back to my plan
          </Link>
          <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
            malyte<span style={{ color: '#7C5CFC' }}>.</span>
          </span>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '28px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            Week {weekNumber} Check-in
          </h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            Your answers will be used to personalize Week {weekNumber + 1}
          </p>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '24px 24px 40px' }}>
        {questions.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '1px solid #E8EDF8' }}>
            <p style={{ color: '#94A3B8', marginBottom: 16 }}>No check-in questions defined for this product.</p>
            <button onClick={() => router.push(`/my-plans/${purchaseId}/plan`)}
              style={{ background: '#7C5CFC', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 24px', cursor: 'pointer', fontWeight: 600 }}>
              Back to plan →
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
              {questions.map((q, i) => (
                <div key={q.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8EDF8' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>
                    <span style={{ color: '#7C5CFC', marginRight: 6 }}>{i + 1}.</span>{q.question_text}
                  </label>

                  {q.question_type === 'select' && q.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map(opt => (
                        <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          style={{
                            textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                            fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            background: answers[q.id] === opt ? '#EDE9FE' : '#F5F7FA',
                            border: `1px solid ${answers[q.id] === opt ? '#7C5CFC' : '#E8EDF8'}`,
                            color: answers[q.id] === opt ? '#7C5CFC' : '#334155',
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {(q.question_type === 'text' || q.question_type === 'number') && (
                    <textarea
                      rows={q.question_type === 'number' ? 1 : 3}
                      placeholder={q.question_type === 'number' ? 'Enter a number...' : 'Write here...'}
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      style={{
                        width: '100%', borderRadius: 10, padding: '10px 14px',
                        fontSize: 13, resize: 'none', outline: 'none',
                        background: '#F5F7FA', border: '1px solid #E8EDF8',
                        color: '#0F172A', fontFamily: 'Inter, sans-serif',
                        boxSizing: 'border-box', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                      onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* NOTA LIBERA */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8EDF8', marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                💬 Anything else your coach should know?
              </label>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 10px' }}>
                Optional — share anything that might affect your next week: events, how you're feeling, requests.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. I have a wedding on Saturday, I can only train Monday and Wednesday..."
                value={freeNote}
                onChange={e => setFreeNote(e.target.value)}
                style={{
                  width: '100%', borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, resize: 'none', outline: 'none',
                  background: '#F5F7FA', border: '1px solid #E8EDF8',
                  color: '#0F172A', fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
              />
            </div>

            <button onClick={handleSubmit} disabled={!allAnswered || loading}
              style={{
                width: '100%', padding: '15px', borderRadius: 12,
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: allAnswered && !loading ? 'pointer' : 'not-allowed',
                background: allAnswered && !loading ? '#7C5CFC' : '#E8EDF8',
                color: allAnswered && !loading ? '#fff' : '#94A3B8',
                fontFamily: 'Inter, sans-serif',
              }}>
              {loading ? `✨ Generating Week ${weekNumber + 1}...` : `Save & unlock Week ${weekNumber + 1} →`}
            </button>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '16px 24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>© 2026 Malyte · AI-powered wellness programs</p>
      </div>
    </div>
  )
}