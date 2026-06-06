import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let query = supabase
    .from('merchants')
    .select('id, shop_name, shopify_domain, created_at, plan, billing_status', { count: 'exact' })

  if (search) query = query.or(`shop_name.ilike.%${search}%,shopify_domain.ilike.%${search}%`)
  query = query.order('created_at', { ascending: order === 'asc' }).range(offset, offset + limit - 1)

  const { data: merchants, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!merchants || merchants.length === 0) return NextResponse.json({ sellers: [], total: 0 })

  const merchantIds = merchants.map((m: any) => m.id)

  const [mcRes, profilesRes, checkinsRes, ordersRes, lastActivityRes] = await Promise.all([
    supabase.from('merchant_customers').select('merchant_id, customer_id').in('merchant_id', merchantIds),
    supabase.from('customer_profiles').select('merchant_id, created_at').in('merchant_id', merchantIds),
    supabase.from('scheduled_checkins').select('merchant_id').in('merchant_id', merchantIds).eq('status', 'completed'),
    supabase.from('attributed_orders').select('merchant_id, order_value').in('merchant_id', merchantIds),
    supabase.from('customer_profiles').select('merchant_id, created_at').in('merchant_id', merchantIds).order('created_at', { ascending: false }),
  ])

  const customersByMerchant: Record<string, Set<string>> = {}
  for (const mc of mcRes.data || []) {
    if (!customersByMerchant[mc.merchant_id]) customersByMerchant[mc.merchant_id] = new Set()
    customersByMerchant[mc.merchant_id].add(mc.customer_id)
  }
  const quizByMerchant: Record<string, number> = {}
  for (const p of profilesRes.data || []) quizByMerchant[p.merchant_id] = (quizByMerchant[p.merchant_id] || 0) + 1

  const checkinsByMerchant: Record<string, number> = {}
  for (const c of checkinsRes.data || []) checkinsByMerchant[c.merchant_id] = (checkinsByMerchant[c.merchant_id] || 0) + 1

  const ordersByMerchant: Record<string, { count: number; revenue: number }> = {}
  for (const o of ordersRes.data || []) {
    if (!ordersByMerchant[o.merchant_id]) ordersByMerchant[o.merchant_id] = { count: 0, revenue: 0 }
    ordersByMerchant[o.merchant_id].count++
    ordersByMerchant[o.merchant_id].revenue += parseFloat(o.order_value) || 0
  }
  const lastActivityByMerchant: Record<string, string> = {}
  for (const a of lastActivityRes.data || []) {
    if (!lastActivityByMerchant[a.merchant_id]) lastActivityByMerchant[a.merchant_id] = a.created_at
  }

  let sellers = merchants.map((m: any) => {
    const customers = customersByMerchant[m.id]?.size || 0
    const quizCompletions = quizByMerchant[m.id] || 0
    const checkins = checkinsByMerchant[m.id] || 0
    const orders = ordersByMerchant[m.id] || { count: 0, revenue: 0 }
    const lastActivity = lastActivityByMerchant[m.id] || null
    const isActive = lastActivity ? new Date(lastActivity) > thirtyDaysAgo : false
    let status = 'Inactive'
    if (m.billing_status === 'active') status = 'Paying'
    else if (m.billing_status === 'trial') status = 'Trial'
    else if (isActive) status = 'Active'
    return { id: m.id, shopName: m.shop_name, shopifyDomain: m.shopify_domain, installDate: m.created_at, plan: m.plan, billingStatus: m.billing_status, customers, quizCompletions, checkinsCompleted: checkins, ordersInfluenced: orders.count, revenueInfluenced: orders.revenue, lastActivity, status }
  })

  if (sortBy === 'revenue') sellers.sort((a: any, b: any) => b.revenueInfluenced - a.revenueInfluenced)
  else if (sortBy === 'customers') sellers.sort((a: any, b: any) => b.customers - a.customers)

  return NextResponse.json({ sellers, total: count || 0 })
}