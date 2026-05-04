import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WeeklyCheckinButton from './WeeklyCheckinButton'
import GenerateNextWeekButton from './GenerateNextWeekButton'
import Footer from '@/components/Footer'

export default async function PlanPage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: purchase } = await supabase
    .from('purchases')
    .select('*, products(title, description, duration_months, experts(name, category))')
    .eq('id', purchaseId).eq('client_id', user.id).single()
  if (!purchase) redirect('/my-plans')

  const { data: clientPlan } = await supabase
    .from('client_plans').select('*').eq('purchase_id', purchaseId).single()
  if (!clientPlan) redirect(`/my-plans/${purchaseId}/questionnaire`)

  const plan = clientPlan.ai_generated_plan
  const currentWeek = clientPlan.current_week || 1
  const totalWeeks = clientPlan.total_weeks || 4
  const weeks = plan?.weeks || []
  const currentWeekData = weeks.find((w: any) => w.week_number === currentWeek) || weeks[0]

  const product = purchase.products
  const expert = (product as any)?.experts

  const mealColors: Record<string, string> = {
    colazione: '#F59E0B', breakfast: '#F59E0B',
    pranzo: '#059669', lunch: '#059669',
    cena: '#7C5CFC', dinner: '#7C5CFC',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0' }}>
            <Link href="/my-plans" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              ← My Plans
            </Link>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A', cursor: 'pointer' }}>
                malyte<span style={{ color: '#7C5CFC' }}>.</span>
              </span>
            </Link>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{expert?.name}</span>
          </div>

          <div style={{ padding: '16px 0 0' }}>
            <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 4px' }}>
              {product?.title}
            </h1>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>
              {currentWeekData?.plan_title || `Week ${currentWeek}`}
            </p>

            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Week {currentWeek} of {totalWeeks}</span>
                <span style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 600 }}>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
              </div>
              <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100 }}>
                <div style={{ height: '100%', width: `${(currentWeek / totalWeeks) * 100}%`, background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', borderRadius: 100 }} />
              </div>
            </div>

            {/* Week pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16 }}>
              {weeks.map((w: any) => (
                <Link key={w.week_number} href={`/my-plans/${purchaseId}/plan?week=${w.week_number}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    background: w.week_number === currentWeek ? '#7C5CFC' : '#F5F7FA',
                    color: w.week_number === currentWeek ? '#fff' : '#94A3B8',
                    border: w.week_number === currentWeek ? 'none' : '1px solid #E8EDF8',
                    cursor: 'pointer',
                  }}>
                    W{w.week_number}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 80px' }}>
        {currentWeekData ? (
          <>
            {currentWeekData.days?.map((day: any, dayIdx: number) => (
              <div key={dayIdx} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
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
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{meal.description}</p>
                          {meal.calories && (
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{meal.calories} kcal</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {(currentWeekData.common_mistakes || currentWeekData.success_metrics || currentWeekData.tips) && (
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Weekly Wisdom
                </p>
                {currentWeekData.tips && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#7C5CFC', marginBottom: 4 }}>Expert tip</p>
                    <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>{currentWeekData.tips}</p>
                  </div>
                )}
                {currentWeekData.common_mistakes?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>Common mistakes</p>
                    {currentWeekData.common_mistakes.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px' }}>· {m}</p>
                    ))}
                  </div>
                )}
                {currentWeekData.success_metrics?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 6 }}>Success metrics</p>
                    {currentWeekData.success_metrics.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px' }}>✓ {m}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {currentWeek < totalWeeks ? (
                <WeeklyCheckinButton purchaseId={purchaseId} weekNumber={currentWeek} />
              ) : (
                <div style={{ background: '#D1FDF3', border: '1px solid #A7F3D0', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>🎉 Program complete!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#94A3B8', fontSize: 14 }}>No plan data available for this week.</p>
            <GenerateNextWeekButton purchaseId={purchaseId} nextWeek={currentWeek} totalWeeks={totalWeeks} />
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}