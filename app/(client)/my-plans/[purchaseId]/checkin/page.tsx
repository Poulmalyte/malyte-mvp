'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.purchaseId as string

  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [mood, setMood] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fetching, setFetching] = useState(true)

  const MOODS = ['😔', '😕', '😐', '🙂', '🚀']

  useEffect(() => {
    const fetchPlan = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('client_plans')
        .select('ai_generated_plan')
        .eq('purchase_id', purchaseId)
        .single()

      if (data?.ai_generated_plan) {
        const plan = data.ai_generated_plan as any
        setQuestions(plan.weekly_checkin_questions || [])
      }
      setFetching(false)
    }
    fetchPlan()
  }, [purchaseId])

  const handleSubmit = async () => {
    if (!mood) return
    setLoading(true)

    const supabase = createClient()
    const { data: existing } = await supabase
      .from('client_plans')
      .select('ai_generated_plan')
      .eq('purchase_id', purchaseId)
      .single()

    const plan = existing?.ai_generated_plan as any
    const checkins = plan?.checkins || []
    checkins.push({
      date: new Date().toISOString(),
      mood,
      answers,
    })

    await supabase
      .from('client_plans')
      .update({ ai_generated_plan: { ...plan, checkins } })
      .eq('purchase_id', purchaseId)

    setLoading(false)
    setSubmitted(true)
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Satoshi, sans-serif', color: 'var(--text)' }}>
            Check-in complete!
          </h2>
          <p className="mb-6" style={{ color: 'var(--muted)' }}>
            Great work. Keep it up, you are making progress.
          </p>
          <Link
            href={`/my-plans/${purchaseId}/plan`}
            className="inline-block px-6 py-3 rounded-full font-bold"
            style={{ background: 'var(--violet)', color: '#fff' }}
          >
            Back to my plan
          </Link>
        </div>
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
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Satoshi, sans-serif', color: 'var(--text)' }}>
            Weekly check-in
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            How are you doing this week?
          </p>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold mb-4" style={{ color: 'var(--text)' }}>How are you feeling this week?</p>
          <div className="flex gap-3 justify-center">
            {MOODS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setMood(i + 1)}
                className="text-3xl p-3 rounded-xl transition-all"
                style={{
                  background: mood === i + 1 ? 'rgba(124,92,252,0.2)' : 'var(--surface2)',
                  border: `2px solid ${mood === i + 1 ? 'var(--violet)' : 'transparent'}`,
                  transform: mood === i + 1 ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((q, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                <span style={{ color: 'var(--violet-light)' }}>{i + 1}.</span> {q}
              </label>
              <textarea
                rows={2}
                placeholder="Write here..."
                value={answers[`q${i}`] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [`q${i}`]: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!mood || loading}
          className="w-full py-4 rounded-full font-bold text-lg transition-all"
          style={{
            background: mood && !loading ? 'var(--violet)' : 'var(--surface2)',
            color: mood && !loading ? '#fff' : 'var(--muted)',
            cursor: mood && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Saving...' : 'Save check-in ✓'}
        </button>
      </div>
    </div>
  )
}