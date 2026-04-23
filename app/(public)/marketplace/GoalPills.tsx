'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const GOALS = [
  { label: 'Lose weight',     value: 'Fitness' },
  { label: 'Build muscle',    value: 'Fitness' },
  { label: 'Glow skin',       value: 'Skincare' },
  { label: 'Mental wellness', value: 'Wellness' },
  { label: 'Eat better',      value: 'Nutrition' },
  { label: 'Get fit',         value: 'Fitness' },
]

export default function GoalPills() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeGoal = searchParams.get('goal') || ''

  const handlePill = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get('goal') === value) {
      params.delete('goal')
    } else {
      params.set('goal', value)
    }
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
      {GOALS.map((g) => {
        const isActive = activeGoal === g.value
        return (
          <button
            key={g.label}
            onClick={() => handlePill(g.value)}
            style={{
              padding: '8px 20px',
              borderRadius: '100px',
              border: isActive ? '2px solid #4DFFD2' : '2px solid rgba(99,130,255,0.2)',
              background: isActive ? 'rgba(77,255,210,0.1)' : 'rgba(255,255,255,0.04)',
              color: isActive ? '#4DFFD2' : '#6B7A99',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {g.label}
          </button>
        )
      })}
    </div>
  )
}