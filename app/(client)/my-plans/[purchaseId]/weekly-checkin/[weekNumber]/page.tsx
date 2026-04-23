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
        .from('product_checkin_questions')
        .select('*')
        .eq('product_id', purchase.product_id)
        .order('order_index', { ascending: true })

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

      // Save check-in
      const { error: checkinError } = await supabase
        .from('weekly_checkins')
        .insert({
          purchase_id: purchaseId,
          client_id: user.id,
          week_number: weekNumber,
          answers,
        })

      if (checkinError) throw checkinError

      // Generate next week with checkin context
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          weekNumber: weekNumber + 1,
          questionnaireAnswers: {},
          checkinAnswers: answers,
        }),
      })

      if (!res.ok) throw new Error('Error generating next week')

      router.push(`/my-plans/${purchaseId}/plan`)
    } catch (err) {
      console.error(err)
      alert('Error saving check-in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href={`/my-plans/${purchaseId}/plan`} className="text-sm mb-6 inline-block" style={{ color: 'var(--muted)' }}>
            ← Back to my plan
          </Link>
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Satoshi, sans-serif', color: 'var(--text)' }}>
            Week {weekNumber} Check-in
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Your answers will be used to personalize Week {weekNumber + 1}
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>No check-in questions defined for this product.</p>
            <button
              onClick={() => router.push(`/my-plans/${purchaseId}/plan`)}
              style={{ background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 24px', cursor: 'pointer', fontWeight: 600 }}
            >
              Back to plan →
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-10">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                    <span style={{ color: 'var(--neon)' }}>{i + 1}.</span> {q.question_text}
                  </label>

                  {q.question_type === 'select' && q.options && (
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className="text-left px-4 py-3 rounded-xl text-sm font-medium"
                          style={{
                            background: answers[q.id] === opt ? 'rgba(77,255,210,0.2)' : 'var(--surface2)',
                            border: `1px solid ${answers[q.id] === opt ? 'var(--neon)' : 'transparent'}`,
                            color: answers[q.id] === opt ? 'var(--neon)' : 'var(--muted)',
                          }}
                        >
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
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="w-full py-4 rounded-full font-bold text-lg"
              style={{
                background: allAnswered && !loading ? 'var(--neon)' : 'var(--surface2)',
                color: allAnswered && !loading ? '#070B14' : 'var(--muted)',
                border: 'none',
                cursor: allAnswered && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? `✨ Generating Week ${weekNumber + 1}...` : `Save & unlock Week ${weekNumber + 1} →`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}