import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import CheckinClient from './CheckinClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: scheduledCheckin } = await supabaseAdmin
    .from('scheduled_checkins')
    .select('*')
    .eq('checkin_token', token)
    .maybeSingle()

  if (!scheduledCheckin) notFound()

  if (scheduledCheckin.status === 'completed') {
    const { data: brandPlan } = await supabaseAdmin
      .from('brand_plans')
      .select('token, merchant_name')
      .eq('id', scheduledCheckin.brand_plan_id)
      .maybeSingle()

    return (
      <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif" }}>
            Already completed
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px' }}>You already completed this week's check-in.</p>
          {brandPlan?.token && (
            <a href={`/routine/${brandPlan.token}`}
              style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', textDecoration: 'none' }}>
              View your updated plan →
            </a>
          )}
        </div>
      </div>
    )
  }

  const { data: brandPlan } = await supabaseAdmin
    .from('brand_plans')
    .select('*')
    .eq('id', scheduledCheckin.brand_plan_id)
    .maybeSingle()

  if (!brandPlan) notFound()

  return (
    <CheckinClient
      scheduledCheckin={scheduledCheckin}
      brandPlan={brandPlan}
    />
  )
}