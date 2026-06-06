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

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [webhooks7dRes, webhooksTodayRes, failedWebhooksRes, attrErrorsRes, recentErrorsRes] = await Promise.all([
    supabase.from('webhook_logs').select('status').gte('received_at', sevenDaysAgo.toISOString()),
    supabase.from('webhook_logs').select('status').gte('received_at', todayStart.toISOString()),
    supabase.from('webhook_logs').select('id, shopify_domain, topic, error_message, received_at, status').eq('status', 'failed').order('received_at', { ascending: false }).limit(50),
    supabase.from('attribution_errors').select('id, shopify_domain, order_id, customer_email, error_type, error_message, created_at, resolved').eq('resolved', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('attribution_errors').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
  ])

  const webhooks7d = webhooks7dRes.data || []
  const successCount = webhooks7d.filter((w: any) => w.status === 'success').length
  const failedCount = webhooks7d.filter((w: any) => w.status === 'failed').length
  const successRate = webhooks7d.length > 0 ? parseFloat(((successCount / webhooks7d.length) * 100).toFixed(1)) : 100
  const today = webhooksTodayRes.data || []

  return NextResponse.json({
    summary: {
      webhookSuccessRate: successRate,
      webhookFailureRate: parseFloat((100 - successRate).toFixed(1)),
      ordersProcessedToday: today.filter((w: any) => w.status === 'success').length,
      ordersFailedToday: today.filter((w: any) => w.status === 'failed').length,
      attributionJobsProcessed: successCount,
      attributionFailures: failedCount,
      recentErrorsCount: recentErrorsRes.count || 0,
    },
    failedWebhooks: failedWebhooksRes.data || [],
    attributionErrors: attrErrorsRes.data || [],
  })
}