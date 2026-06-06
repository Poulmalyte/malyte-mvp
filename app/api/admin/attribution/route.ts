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

  const [ordersRes, recentOrdersRes, dailyRes, webhookRes] = await Promise.all([
    supabase.from('attributed_orders').select('id, attribution_type, order_value'),
    supabase.from('attributed_orders')
      .select('id, shopify_order_number, order_value, attribution_type, created_at, merchant_id, customer_email')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('attributed_orders')
      .select('created_at, order_value')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('webhook_logs').select('status').gte('received_at', thirtyDaysAgo.toISOString()),
  ])

  const orders = ordersRes.data || []
  const totalOrders = orders.length
  const emailMatch = orders.filter((o: any) => o.attribution_type === 'email_match').length
  const productMatch = orders.filter((o: any) => o.attribution_type === 'product_match').length
  const temporalMatch = orders.filter((o: any) => o.attribution_type === 'temporal_match').length
  const totalWebhooks = (webhookRes.data || []).length
  const attributionRate = totalWebhooks > 0 ? parseFloat(((totalOrders / totalWebhooks) * 100).toFixed(1)) : 0

  const dailyMap: Record<string, { orders: number; revenue: number }> = {}
  for (const o of dailyRes.data || []) {
    const day = o.created_at.slice(0, 10)
    if (!dailyMap[day]) dailyMap[day] = { orders: 0, revenue: 0 }
    dailyMap[day].orders++
    dailyMap[day].revenue += parseFloat(o.order_value) || 0
  }
  const dailyChart = Object.entries(dailyMap).map(([date, v]) => ({ date, orders: v.orders, revenue: parseFloat(v.revenue.toFixed(2)) }))

  const merchantIds = [...new Set((recentOrdersRes.data || []).map((o: any) => o.merchant_id))]
  let merchantMap: Record<string, string> = {}
  if (merchantIds.length > 0) {
    const { data: merch } = await supabase.from('merchants').select('id, shopify_shop_domain').in('id', merchantIds)
    for (const m of merch || []) merchantMap[m.id] = m.shopify_shop_domain
  }

  return NextResponse.json({
    totals: { attributedOrders: totalOrders, emailMatch, productMatch, temporalMatch, unmatchedOrders: Math.max(0, totalWebhooks - totalOrders), attributionRate },
    dailyChart,
    recentOrders: (recentOrdersRes.data || []).map((o: any) => ({ ...o, shopifyDomain: merchantMap[o.merchant_id] || '—' })),
  })
}