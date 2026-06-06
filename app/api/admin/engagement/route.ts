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
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const [mcRes, profilesRes, checkinsRes, ordersRes] = await Promise.all([
    // merchant_customers: merchant_id + customer_id
    supabase.from('merchant_customers').select('merchant_id, customer_id'),
    // quiz completions: customer_id + merchant_id
    supabase.from('customer_profiles').select('customer_id, merchant_id'),
    // checkins completed
    supabase.from('scheduled_checkins').select('customer_id, merchant_id, status').eq('status', 'completed'),
    // attributed orders
    supabase.from('attributed_orders').select('customer_id, merchant_id, order_value, created_at'),
  ])

  // Build per customer key (merchant_id:customer_id)
  const checkinsByCustomer: Record<string, number> = {}
  for (const c of checkinsRes.data || []) {
    const key = `${c.merchant_id}:${c.customer_id}`
    checkinsByCustomer[key] = (checkinsByCustomer[key] || 0) + 1
  }

  const ordersByCustomer: Record<string, { count: number; revenue: number; dates: string[] }> = {}
  for (const o of ordersRes.data || []) {
    const key = `${o.merchant_id}:${o.customer_id}`
    if (!ordersByCustomer[key]) ordersByCustomer[key] = { count: 0, revenue: 0, dates: [] }
    ordersByCustomer[key].count++
    ordersByCustomer[key].revenue += parseFloat(o.order_value) || 0
    ordersByCustomer[key].dates.push(o.created_at)
  }

  // All unique customers that have a quiz (customer_profile)
  const customerSet = new Map<string, boolean>()
  for (const p of profilesRes.data || []) {
    customerSet.set(`${p.merchant_id}:${p.customer_id}`, true)
  }

  const segments: Record<string, {
    customers: number; totalRevenue: number; totalOrders: number
    repeatCustomers: number; allRevenues: number[]; daysBetweenOrders: number[]
  }> = {
    A: { customers: 0, totalRevenue: 0, totalOrders: 0, repeatCustomers: 0, allRevenues: [], daysBetweenOrders: [] },
    B: { customers: 0, totalRevenue: 0, totalOrders: 0, repeatCustomers: 0, allRevenues: [], daysBetweenOrders: [] },
    C: { customers: 0, totalRevenue: 0, totalOrders: 0, repeatCustomers: 0, allRevenues: [], daysBetweenOrders: [] },
    D: { customers: 0, totalRevenue: 0, totalOrders: 0, repeatCustomers: 0, allRevenues: [], daysBetweenOrders: [] },
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  for (const key of customerSet.keys()) {
    const checkins = checkinsByCustomer[key] || 0
    const orders = ordersByCustomer[key] || { count: 0, revenue: 0, dates: [] }
    const seg = checkins === 0 ? 'A' : checkins === 1 ? 'B' : checkins <= 3 ? 'C' : 'D'
    const s = segments[seg]
    s.customers++
    s.totalRevenue += orders.revenue
    s.totalOrders += orders.count
    if (orders.count >= 2) s.repeatCustomers++
    if (orders.revenue > 0) s.allRevenues.push(orders.revenue)
    if (orders.dates.length >= 2) {
      const sorted = orders.dates.map((d: string) => new Date(d).getTime()).sort()
      for (let i = 1; i < sorted.length; i++) {
        s.daysBetweenOrders.push((sorted[i] - sorted[i - 1]) / 86400000)
      }
    }
  }

  const result = Object.entries(segments).map(([label, s]) => ({
    segment: label,
    label: label === 'A' ? 'Quiz Only' : label === 'B' ? 'Quiz + 1 Check-in' : label === 'C' ? 'Quiz + 2-3 Check-ins' : 'Quiz + 4+ Check-ins',
    customers: s.customers,
    revenue: parseFloat(s.totalRevenue.toFixed(2)),
    revenuePerCustomer: s.customers > 0 ? parseFloat((s.totalRevenue / s.customers).toFixed(2)) : 0,
    ordersPerCustomer: s.customers > 0 ? parseFloat((s.totalOrders / s.customers).toFixed(2)) : 0,
    repeatPurchaseRate: s.customers > 0 ? parseFloat(((s.repeatCustomers / s.customers) * 100).toFixed(1)) : 0,
    averageOrderValue: s.allRevenues.length > 0 ? parseFloat(avg(s.allRevenues).toFixed(2)) : 0,
    avgDaysBetweenOrders: s.daysBetweenOrders.length > 0 ? parseFloat(avg(s.daysBetweenOrders).toFixed(1)) : 0,
  }))

  return NextResponse.json({ segments: result })
}
