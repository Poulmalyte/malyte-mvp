'use client'

import { useRouter } from 'next/navigation'

export default function WeeklyCheckinButton({
  purchaseId,
  weekNumber,
}: {
  purchaseId: string
  weekNumber: number
}) {
  const router = useRouter()

  return (
    <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'rgba(77,255,210,0.07)', border: '1px solid rgba(77,255,210,0.3)' }}>
      <div className="text-3xl mb-3">📊</div>
      <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Satoshi, sans-serif', color: 'var(--text)' }}>
        Week {weekNumber} check-in is ready
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
        Track your progress to unlock Week {weekNumber + 1} — personalized to your results
      </p>
      <button
        onClick={() => router.push(`/my-plans/${purchaseId}/weekly-checkin/${weekNumber}`)}
        className="px-8 py-3 rounded-full font-bold"
        style={{ background: 'var(--neon)', color: '#070B14', border: 'none', cursor: 'pointer' }}
      >
        Start Week {weekNumber} check-in →
      </button>
    </div>
  )
}