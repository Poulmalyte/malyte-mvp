'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerateNextWeekButton({
  purchaseId,
  nextWeek,
  totalWeeks,
}: {
  purchaseId: string
  nextWeek: number
  totalWeeks: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          weekNumber: nextWeek,
          questionnaireAnswers: {},
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      router.push(`/my-plans/${purchaseId}/plan`)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error generating next week. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#E8EAF0', marginBottom: 4 }}>
        Week {nextWeek} is ready to generate
      </p>
      <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 16 }}>
        Your Week {nextWeek} plan will be adapted based on your check-in results
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          background: loading ? '#2D3555' : '#7C5CFC',
          color: loading ? '#6B7280' : '#fff',
          border: 'none',
          borderRadius: 100,
          padding: '12px 28px',
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {loading ? `✨ Generating Week ${nextWeek}...` : `✦ Generate Week ${nextWeek}`}
      </button>
    </div>
  )
}