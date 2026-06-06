import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const iso30 = thirtyDaysAgo.toISOString()

  const [
    merchantsRes, totalCustomersRes, quizRes, checkinsRes,
    ordersRes, revenueRes, activeRes, newCustomersRes, recentRevenueRes,
  ] = await Promise.all([
    supabase.from('merchants').select('id', { count: 'exact', head: true }),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('customer_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('scheduled_checkins').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('attributed_orders').select('id', { count: 'exact', head: true }),
    supabase.from('attributed_orders').select('order_value'),
    supabase.from('customer_profiles').select('merchant_id').gte('created_at', iso30),
    supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', iso30),
    supabase.from('attributed_orders').select('order_value').gte('created_at', iso30),
  ])

  const totalRevenue = (revenueRes.data || []).reduce((s: number, o: any) => s + (parseFloat(o.order_value) || 0), 0)
  const recentRevenue = (recentRevenueRes.data || []).reduce((s: number, o: any) => s + (parseFloat(o.order_value) || 0), 0)
  const activeMerchantIds = new Set((activeRes.data || []).map((r: any) => r.merchant_id))

  return NextResponse.json({
    totalSellers: merchantsRes.count || 0,
    activeSellers: activeMerchantIds.size,
    totalCustomers: totalCustomersRes.count || 0,
    totalQuizCompletions: quizRes.count || 0,
    totalCheckins: checkinsRes.count || 0,
    totalAttributedOrders: ordersRes.count || 0,
    totalRevenueInfluenced: totalRevenue,
    last30dRevenueInfluenced: recentRevenue,
    last30dCustomerGrowth: newCustomersRes.count || 0,
  })
}