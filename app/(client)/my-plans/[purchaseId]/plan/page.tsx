import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WeeklyCheckinButton from './WeeklyCheckinButton'
import GenerateNextWeekButton from './GenerateNextWeekButton'
import Footer from '@/components/Footer'

export default async function PlanPage({ params, searchParams }: { params: Promise<{ purchaseId: string }>, searchParams: Promise<{ week?: string }> }) {
  const { purchaseId } = await params
  const { week } = await searchParams
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
  const currentWeek = week ? parseInt(week) : (clientPlan.current_week || 1)
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
      <style>{`
        * { box-sizing: border-box; }

        .plan-header-inner { max-width: 800px; margin: 0 auto; padding: 0 20px; }
        .plan-header-top { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 0; }
        .plan-expert-name { font-size: 12px; color: #94A3B8; }
        .plan-body { max-width: 800px; margin: 0 auto; padding: 20px 20px 80px; }
        .plan-title { font-family: 'Satoshi', sans-serif; font-weight: 800; font-size: 22px; color: #0F172A; margin: 0 0 4px; }
        .plan-subtitle { color: #64748B; font-size: 13px; margin: 0 0 14px; }

        .week-tabs { display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 14px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .week-tabs::-webkit-scrollbar { display: none; }

        .stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .stat-box { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 8px 10px; text-align: center; flex: 1; min-width: 56px; }

        .meal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 4px; flex-wrap: wrap; }
        .day-card { background: #FFFFFF; border-radius: 14px; border: 1px solid #E8EDF8; padding: 16px 18px; margin-bottom: 10px; }
        .macro-row { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }

        .welcome-card { background: linear-gradient(135deg, #7C5CFC, #6385FF); border-radius: 14px; padding: 18px 20px; margin-bottom: 10px; }
        .welcome-text { font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.6; margin: 0 0 14px; }
        .section-card { background: #FFFFFF; border-radius: 14px; border: 1px solid #E8EDF8; padding: 16px 18px; margin-bottom: 10px; }

        @media (max-width: 480px) {
          .plan-header-inner { padding: 0 14px; }
          .plan-expert-name { display: none; }
          .plan-body { padding: 14px 14px 80px; }
          .plan-title { font-size: 17px; }
          .plan-subtitle { font-size: 12px; }
          .welcome-card { padding: 14px 16px; }
          .welcome-text { font-size: 13px; }
          .stat-box { padding: 6px 8px; }
          .stat-box .stat-label { font-size: 9px !important; }
          .stat-box .stat-value { font-size: 13px !important; }
          .day-card { padding: 14px; }
          .section-card { padding: 14px; }
          .week-tab { padding: 5px 12px !important; font-size: 11px !important; }
          .meal-name { font-size: 13px !important; }
          .ingredient { font-size: 11px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8' }}>
        <div className="plan-header-inner">
          <div className="plan-header-top">
            <Link href="/my-plans" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', flexShrink: 0 }}>← My Plans</Link>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
                malyte<span style={{ color: '#7C5CFC' }}>.</span>
              </span>
            </Link>
            <span className="plan-expert-name">{expert?.name}</span>
          </div>

          <div style={{ padding: '14px 0 0' }}>
            <h1 className="plan-title">{product?.title}</h1>
            <p className="plan-subtitle">{currentWeekData?.plan_title || `Week ${currentWeek}`}</p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Week {currentWeek} of {totalWeeks}</span>
                <span style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 600 }}>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
              </div>
              <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100 }}>
                <div style={{ height: '100%', width: `${(currentWeek / totalWeeks) * 100}%`, background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', borderRadius: 100 }} />
              </div>
            </div>

            <div className="week-tabs">
              {weeks.map((w: any) => (
                <Link key={w.week_number} href={`/my-plans/${purchaseId}/plan?week=${w.week_number}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="week-tab" style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    background: w.week_number === currentWeek ? '#7C5CFC' : '#F5F7FA',
                    color: w.week_number === currentWeek ? '#fff' : '#94A3B8',
                    border: w.week_number === currentWeek ? 'none' : '1px solid #E8EDF8',
                    whiteSpace: 'nowrap',
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
      <div className="plan-body">
        {currentWeekData ? (
          <>
            {currentWeekData.welcome_message && (
              <div className="welcome-card">
                <p className="welcome-text">{currentWeekData.welcome_message}</p>
                {currentWeekData.client_stats && (
                  <div className="stats-row">
                    {[
                      { label: 'Calories', value: `${currentWeekData.client_stats.daily_calories} kcal` },
                      { label: 'Protein', value: `${currentWeekData.client_stats.daily_protein_g}g` },
                      { label: 'Carbs', value: `${currentWeekData.client_stats.daily_carbs_g}g` },
                      { label: 'Fats', value: `${currentWeekData.client_stats.daily_fats_g}g` },
                    ].map((stat) => (
                      <div key={stat.label} className="stat-box">
                        <p className="stat-label" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                        <p className="stat-value" style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentWeekData.weekly_goal && (
              <div className="section-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Weekly Goal</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.5 }}>{currentWeekData.weekly_goal}</p>
                </div>
              </div>
            )}

            {currentWeekData.days?.map((day: any, dayIdx: number) => (
              <div key={dayIdx} className="day-card">
                <p style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  {day.day || `Day ${dayIdx + 1}`}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {day.meals?.map((meal: any, mealIdx: number) => {
                    const mealKey = (meal.meal || meal.type || '').toLowerCase()
                    const color = mealColors[mealKey] || '#7C5CFC'
                    return (
                      <div key={mealIdx} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
                        <div className="meal-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {meal.meal || meal.type}
                            </span>
                            {meal.time && <span style={{ fontSize: 10, color: '#94A3B8' }}>{meal.time}</span>}
                          </div>
                          {meal.calories && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', background: '#F5F7FA', padding: '2px 7px', borderRadius: 100, flexShrink: 0 }}>
                              {meal.calories} kcal
                            </span>
                          )}
                        </div>
                        <p className="meal-name" style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 6px', lineHeight: 1.4 }}>
                          {meal.name || meal.description}
                        </p>
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            {meal.ingredients.map((ing: string, i: number) => (
                              <p key={i} className="ingredient" style={{ fontSize: 12, color: '#64748B', margin: '0 0 2px', lineHeight: 1.4 }}>· {ing}</p>
                            ))}
                          </div>
                        )}
                        {meal.preparation && (
                          <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {meal.preparation}
                          </p>
                        )}
                        {(meal.protein_g || meal.carbs_g || meal.fats_g) && (
                          <div className="macro-row">
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
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 600, margin: '0 0 2px' }}>💡 Daily tip</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{day.daily_tip}</p>
                  </div>
                )}
              </div>
            ))}

            {currentWeekData.expert_tip && (
              <div className="section-card">
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Expert Tip</p>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>{currentWeekData.expert_tip}</p>
              </div>
            )}

            {(currentWeekData.common_mistakes?.length > 0 || currentWeekData.success_metrics?.length > 0) && (
              <div className="section-card">
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Weekly Wisdom</p>
                {currentWeekData.common_mistakes?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>Common mistakes</p>
                    {currentWeekData.common_mistakes.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px', lineHeight: 1.5 }}>· {m}</p>
                    ))}
                  </div>
                )}
                {currentWeekData.success_metrics?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 6 }}>Signs it's working</p>
                    {currentWeekData.success_metrics.map((m: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: '#334155', margin: '0 0 4px', lineHeight: 1.5 }}>✓ {m}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
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