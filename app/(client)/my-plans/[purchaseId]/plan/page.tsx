import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WeeklyCheckinButton from './WeeklyCheckinButton'
import GenerateNextWeekButton from './GenerateNextWeekButton'

export default async function PlanPage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: purchase } = await supabase
    .from('purchases')
    .select('*, products(title, description, duration_months, experts(name, category))')
    .eq('id', purchaseId)
    .eq('client_id', user.id)
    .single()

  if (!purchase) redirect('/my-plans')

  const { data: clientPlan } = await supabase
    .from('client_plans')
    .select('*')
    .eq('purchase_id', purchaseId)
    .single()

  if (!clientPlan) redirect(`/my-plans/${purchaseId}/questionnaire`)

  const plan = clientPlan.ai_generated_plan
  const currentWeek = clientPlan.current_week || 1
  const totalWeeks = clientPlan.total_weeks || 4
  const weeks = plan?.weeks || []
  const currentWeekData = weeks.find((w: any) => w.week_number === currentWeek) || weeks[0]

  const product = purchase.products
  const expert = (product as any)?.experts

  const mealColors: Record<string, string> = {
    colazione: '#F59E0B',
    breakfast: '#F59E0B',
    pranzo: '#10B981',
    lunch: '#10B981',
    cena: '#7C5CFC',
    dinner: '#7C5CFC',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif" }}>

      <div style={{ background: '#14182A', padding: '24px 24px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Link href="/my-plans" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
              ← My Plans
            </Link>
            <span style={{ fontSize: 12, color: '#6B7A99' }}>{expert?.name}</span>
          </div>

          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 24, color: '#F1F3F9', margin: '0 0 8px' }}>
            {product?.title}
          </h1>
          <p style={{ color: '#8B92A5', fontSize: 13, margin: '0 0 20px' }}>
            {currentWeekData?.plan_title || `Week ${currentWeek}`}
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6B7A99' }}>Week {currentWeek} of {totalWeeks}</span>
              <span style={{ fontSize: 11, color: '#4DFFD2' }}>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 100 }}>
              <div style={{ height: '100%', width: `${(currentWeek / totalWeeks) * 100}%`, background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', borderRadius: 100 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {weeks.map((w: any) => (
              <Link key={w.week_number} href={`/my-plans/${purchaseId}/plan?week=${w.week_number}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: w.week_number === currentWeek ? '#7C5CFC' : 'rgba(255,255,255,0.06)',
                  color: w.week_number === currentWeek ? '#fff' : '#6B7A99',
                  border: w.week_number === currentWeek ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}>
                  W{w.week_number}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px 80px' }}>

        {currentWeekData ? (
          <>
            {currentWeekData.days?.map((day: any, dayIdx: number) => (
              <div key={dayIdx} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  {day.day || `Day ${dayIdx + 1}`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {day.meals?.map((meal: any, mealIdx: number) => {
                    const mealKey = (meal.type || '').toLowerCase()
                    const color = mealColors[mealKey] || '#7C5CFC'
                    return (
                      <div key={mealIdx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color, textTransform: 'capitalize' }}>{meal.type}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{meal.description}</p>
                          {meal.calories && (
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>{meal.calories} kcal</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {(currentWeekData.common_mistakes || currentWeekData.success_metrics || currentWeekData.tips) && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Weekly Wisdom
                </p>
                {currentWeekData.tips && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#7C5CFC', marginBottom: 4 }}>Expert tip</p>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{currentWeekData.tips}</p>
                  </div>
                )}
                {currentWeekData.common_mistakes?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>Common mistakes</p>
                    {currentWeekData.common_mistakes.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>· {m}</p>
                    ))}
                  </div>
                )}
                {currentWeekData.success_metrics?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginBottom: 6 }}>Success metrics</p>
                    {currentWeekData.success_metrics.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>✓ {m}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {currentWeek < totalWeeks ? (
                <WeeklyCheckinButton purchaseId={purchaseId} weekNumber={currentWeek} />
              ) : (
                <div style={{ background: 'rgba(77,255,210,0.08)', border: '1px solid rgba(77,255,210,0.2)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#4DFFD2', margin: 0 }}>🎉 Program complete!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>No plan data available for this week.</p>
            <GenerateNextWeekButton
              purchaseId={purchaseId}
              nextWeek={currentWeek}
              totalWeeks={totalWeeks}
            />
          </div>
        )}
      </div>

    </main>
  )
}