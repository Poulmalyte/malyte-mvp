import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const merchant_id = user.id

    // Piani generati
    const { data: plans } = await supabaseAdmin
      .from('brand_plans')
      .select('id, token, customer_email, week_number, status, created_at, customer_summary')
      .eq('merchant_id', merchant_id)
      .order('created_at', { ascending: false })

    const allPlans = plans || []
    const totalPlans = allPlans.length

    // Clienti unici
    const uniqueEmails = new Set(allPlans.map(p => p.customer_email).filter(Boolean))
    const totalCustomers = uniqueEmails.size

    // Piani attivi (settimana più recente per ogni cliente)
    const latestPlanPerCustomer = new Map<string, any>()
    for (const plan of allPlans) {
      if (!plan.customer_email) continue
      const existing = latestPlanPerCustomer.get(plan.customer_email)
      if (!existing || plan.week_number > existing.week_number) {
        latestPlanPerCustomer.set(plan.customer_email, plan)
      }
    }
    const activePlans = Array.from(latestPlanPerCustomer.values())

    // Check-in completati
    const { data: checkins } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('id, week_number, status, completed_at, customer_id')
      .eq('merchant_id', merchant_id)

    const allCheckins = checkins || []
    const completedCheckins = allCheckins.filter(c => c.status === 'completed')
    const pendingCheckins = allCheckins.filter(c => c.status === 'pending')

    // CSS medio da checkin_events
    const { data: checkinEvents } = await supabaseAdmin
      .from('checkin_events')
      .select('adherence_score, satisfaction_score, improvement_score')
      .eq('merchant_id', merchant_id)

    let avgCSS = 0
    if (checkinEvents && checkinEvents.length > 0) {
      const cssValues = checkinEvents.map(e => {
        const adherence = (e.adherence_score || 0.5) * 0.40
        const satisfaction = ((e.satisfaction_score || 3) / 5) * 0.30
        const improvement = ((e.improvement_score || 3) / 5) * 0.30
        return adherence + satisfaction + improvement
      })
      avgCSS = cssValues.reduce((a, b) => a + b, 0) / cssValues.length
    }

    // Funnel da event_stream
    const { data: events } = await supabaseAdmin
      .from('event_stream')
      .select('event_type, created_at')
      .eq('merchant_id', merchant_id)

    const allEvents = events || []
    const quizCompleted = allEvents.filter(e => e.event_type === 'quiz_completed').length
    const planGenerated = allEvents.filter(e => e.event_type === 'plan_generated').length
    const checkinCompleted = allEvents.filter(e => e.event_type === 'checkin_completed').length
    const packageGenerated = allEvents.filter(e => e.event_type === 'package_generated').length

    // Ultimi clienti (max 10)
    const recentCustomers = activePlans.slice(0, 10).map(plan => {
      const customerCheckins = allCheckins.filter(c => {
        const planForCustomer = allPlans.find(p => p.customer_email === plan.customer_email)
        return planForCustomer && c.status === 'completed'
      })
      const lastCheckin = customerCheckins.sort((a, b) =>
        new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      )[0]

      return {
        email: plan.customer_email,
        current_week: plan.week_number,
        total_checkins: customerCheckins.length,
        last_checkin: lastCheckin?.completed_at || null,
        plan_token: plan.token,
      }
    })

    // Settimana media dei clienti
    const avgWeek = activePlans.length > 0
      ? activePlans.reduce((sum, p) => sum + (p.week_number || 1), 0) / activePlans.length
      : 0

    // ── Revenue Attribution ──────────────────────────────────────────────────
    const { data: attributedOrders } = await supabaseAdmin
      .from('attributed_orders')
      .select('order_value, matched_products_value, recommendation_match, within_window, days_since_quiz, attribution_window, order_currency')
      .eq('merchant_id', merchant_id)

    const allAttributed = attributedOrders || []
    const withinWindow = allAttributed.filter(o => o.within_window)

    const revenueInfluenced = withinWindow.reduce((sum, o) => sum + (o.order_value || 0), 0)
    const revenueMatched = withinWindow.reduce((sum, o) => sum + (o.matched_products_value || 0), 0)
    const ordersInfluenced = withinWindow.length
    const ordersWithProductMatch = withinWindow.filter(o => o.recommendation_match).length
    const currency = allAttributed[0]?.order_currency || 'EUR'

    // Conversion rate = clienti che hanno acquistato / clienti con piano
    const conversionRate = totalCustomers > 0
      ? Math.round((ordersInfluenced / totalCustomers) * 100)
      : 0

    // Breakdown per attribution window
    const windowBreakdown = {
      '30d': allAttributed.filter(o => o.attribution_window === '30d').length,
      '60d': allAttributed.filter(o => o.attribution_window === '60d').length,
      '90d': allAttributed.filter(o => o.attribution_window === '90d').length,
      'beyond': allAttributed.filter(o => o.attribution_window === 'beyond').length,
    }

    return NextResponse.json({
      ok: true,
      overview: {
        total_customers: totalCustomers,
        total_plans: totalPlans,
        completed_checkins: completedCheckins.length,
        pending_checkins: pendingCheckins.length,
        avg_css: Math.round(avgCSS * 100) / 100,
        avg_week: Math.round(avgWeek * 10) / 10,
      },
      funnel: {
        quiz_completed: quizCompleted,
        plan_generated: planGenerated,
        package_generated: packageGenerated,
        checkin_completed: checkinCompleted,
        checkin_rate: planGenerated > 0 ? Math.round((checkinCompleted / planGenerated) * 100) : 0,
      },
      recent_customers: recentCustomers,
      revenue: {
        revenue_influenced: Math.round(revenueInfluenced * 100) / 100,
        revenue_matched: Math.round(revenueMatched * 100) / 100,
        orders_influenced: ordersInfluenced,
        orders_with_product_match: ordersWithProductMatch,
        conversion_rate: conversionRate,
        currency,
        window_breakdown: windowBreakdown,
      },
    })

  } catch (err: any) {
    console.error('analytics error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}