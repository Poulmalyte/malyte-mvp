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
    breakfast: '#F59E0B',
    lunch: '#059669',
    dinner: '#7C5CFC',
    snack: '#6385FF',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0' }}>
            <Link href="/my-plans" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>← My Plans</Link>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
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

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Week {currentWeek} of {totalWeeks}</span>
                <span style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 600 }}>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
              </div>
              <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100 }}>
                <div style={{ height: '100%', width: `${(currentWeek / totalWeeks) * 100}%`, background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', borderRadius: 100 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16 }}>
              {weeks.map((w: any) => (
                <Link key={w.week_number} href={`/my-plans/${purchaseId}/plan?week=${w.week_number}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    background: w.week_number === currentWeek ? '#7C5CFC' : '#F5F7FA',
                    color: w.week_number === currentWeek ? '#fff' : '#94A3B8',
                    border: w.week_number === currentWeek ? 'none' : '1px solid #E8EDF8',
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
            {/* Welcome + stats */}
            {currentWeekData.welcome_message && (
              <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #6385FF)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {currentWeekData.welcome_message}
                </p>
                {currentWeekData.client_stats && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Calories', value: `${currentWeekData.client_stats.daily_calories} kcal` },
                      { label: 'Protein', value: `${currentWeekData.client_stats.daily_protein_g}g` },
                      { label: 'Carbs', value: `${currentWeekData.client_stats.daily_carbs_g}g` },
                      { label: 'Fats', value: `${currentWeekData.client_stats.daily_fats_g}g` },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Weekly goal */}
            {currentWeekData.weekly_goal && (
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '16px 20px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Weekly Goal</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>{currentWeekData.weekly_goal}</p>
                </div>
              </div>
            )}

            {/* Days */}
            {currentWeekData.days?.map((day: any, dayIdx: number) => (
              <div key={dayIdx} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                  {day.day || `Day ${dayIdx + 1}`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {day.meals?.map((meal: any, mealIdx: number) => {
                    const mealKey = (meal.meal || meal.type || '').toLowerCase()
                    const color = mealColors[mealKey] || '#7C5CFC'
                    return (
                      <div key={mealIdx} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {meal.meal || meal.type}
                            </span>
                            {meal.time && (
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>{meal.time}</span>
                            )}
                          </div>
                          {meal.calories && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F5F7FA', padding: '2px 8px', borderRadius: 100 }}>
                              {meal.calories} kcal
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                          {meal.name || meal.description}
                        </p>
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            {meal.ingredients.map((ing: string, i: number) => (
                              <p key={i} style={{ fontSize: 12, color: '#64748B', margin: '0 0 2px' }}>· {ing}</p>
                            ))}
                          </div>
                        )}
                        {meal.preparation && (
                          <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {meal.preparation}
                          </p>
                        )}
                        {(meal.protein_g || meal.carbs_g || meal.fats_g) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                            {meal.protein_g && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>P: {meal.protein_g}g</span>}
                            {meal.carbs_g && <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>C: {meal.carbs_g}g</span>}
                            {meal.fats_g && <span style={{ fontSize: 10, color: '#6385FF', fontWeight: 600 }}>F: {meal.fats_g}g</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {day.daily_tip && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 600, margin: '0 0 2px' }}>💡 Daily tip</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{day.daily_tip}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Expert tip */}
            {currentWeekData.expert_tip && (
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Expert Tip</p>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>{currentWeekData.expert_tip}</p>
              </div>
            )}

            {/* Common mistakes + success metrics */}
            {(currentWeekData.common_mistakes?.length > 0 || currentWeekData.success_metrics?.length > 0) && (
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Weekly Wisdom</p>
                {currentWeekData.common_mistakes?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>Common mistakes</p>
                    {currentWeekData.common_mistakes.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px' }}>· {m}</p>
                    ))}
                  </div>
                )}
                {currentWeekData.success_metrics?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 6 }}>Signs it's working</p>
                    {currentWeekData.success_metrics.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px' }}>✓ {m}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Check-in / complete */}
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