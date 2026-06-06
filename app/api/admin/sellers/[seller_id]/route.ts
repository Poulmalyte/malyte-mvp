import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

export async function GET(_req: Request, { params }: { params: { seller_id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { seller_id } = params

  const [merchantRes, mcRes, profilesRes, checkinsRes, ordersRes, recentCheckinsRes] = await Promise.all([
    supabase.from('merchants').select('*').eq('id', seller_id).single(),
    supabase.from('merchant_customers').select('customer_id').eq('merchant_id', seller_id),
    supabase.from('customer_profiles').select('customer_id, created_at').eq('merchant_id', seller_id),
    supabase.from('scheduled_checkins').select('id').eq('merchant_id', seller_id).eq('status', 'completed'),
    supabase.from('attributed_orders')
      .select('id, order_id, order_value, attribution_type, created_at, customer_id')
      .eq('merchant_id', seller_id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('scheduled_checkins')
      .select('id, customer_id, status, completed_at, created_at')
      .eq('merchant_id', seller_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50),
  ])

  if (!merchantRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orders = ordersRes.data || []
  const totalRevenue = orders.reduce((s: number, o: any) => s + (parseFloat(o.order_value) || 0), 0)
  const uniqueCustomers = new Set((mcRes.data || []).map((mc: any) => mc.customer_id))
  const customersWithOrders = new Set(orders.map((o: any) => o.customer_id))
  const conversionRate = uniqueCustomers.size > 0
    ? parseFloat(((customersWithOrders.size / uniqueCustomers.size) * 100).toFixed(1))
    : 0

  const emailMatch = orders.filter((o: any) => o.attribution_type === 'email_match')
  const productMatch = orders.filter((o: any) => o.attribution_type === 'product_match')
  const temporalMatch = orders.filter((o: any) => o.attribution_type === 'temporal_match')

  const rev = (arr: any[]) => arr.reduce((s: number, o: any) => s + (parseFloat(o.order_value) || 0), 0)

  // Fetch customer emails for orders display
  const customerIds = [...new Set(orders.map((o: any) => o.customer_id).filter(Boolean))]
  let emailMap: Record<string, string> = {}
  if (customerIds.length > 0) {
    const { data: custs } = await supabase
      .from('customers')
      .select('id, email')
      .in('id', customerIds)
    for (const c of custs || []) emailMap[c.id] = c.email
  }

  const recentOrders = orders.map((o: any) => ({
    ...o,
    customer_email: emailMap[o.customer_id] || '—',
  }))

  return NextResponse.json({
    merchant: merchantRes.data,
    stats: {
      customers: uniqueCustomers.size,
      quizCompletions: (profilesRes.data || []).length,
      checkinsCompleted: (checkinsRes.data || []).length,
      ordersInfluenced: orders.length,
      revenueInfluenced: totalRevenue,
      conversionRate,
    },
    attribution: {
      emailMatch: { count: emailMatch.length, revenue: rev(emailMatch) },
      productMatch: { count: productMatch.length, revenue: rev(productMatch) },
      temporalMatch: { count: temporalMatch.length, revenue: rev(temporalMatch) },
    },
    recentOrders,
    recentCheckins: recentCheckinsRes.data || [],
  })
}
