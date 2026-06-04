import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const { sendCheckinReminderEmail, sendInactiveEmail } = await import('@/lib/email/resend')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

    let sent = 0
    let inactivated = 0
    let errors = 0

    // 1. Trova check-in pending scaduti senza nessun reminder ancora
    // Day 7: primo reminder
    const { data: firstReminders } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('*, brand_plans(token, customer_email, merchant_name, week_number)')
      .eq('status', 'pending')
      .eq('reminder_count', 0)
      .is('reminder_sent_at', null)
      .lte('scheduled_for', now.toISOString())
      .limit(100)

    for (const checkin of firstReminders || []) {
      const plan = checkin.brand_plans as any
      if (!plan?.customer_email) continue
      try {
        await sendCheckinReminderEmail({
          to: plan.customer_email,
          brandName: plan.merchant_name || 'your brand',
          checkinUrl: `${appUrl}/checkin/${checkin.checkin_token}`,
          weekNumber: checkin.week_number || 1,
          planUrl: `${appUrl}/routine/${plan.token}`,
          isSecondReminder: false,
        })
        await supabaseAdmin
          .from('scheduled_checkins')
          .update({
            reminder_sent_at: now.toISOString(),
            reminder_count: 1,
          })
          .eq('id', checkin.id)
        sent++
      } catch (err) {
        console.error(`First reminder error for ${checkin.id}:`, err)
        errors++
      }
    }

    // 2. Day 10: secondo reminder (3 giorni dopo il primo)
    const day10threshold = new Date(now)
    day10threshold.setDate(day10threshold.getDate() - 3)

    const { data: secondReminders } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('*, brand_plans(token, customer_email, merchant_name, week_number)')
      .eq('status', 'pending')
      .eq('reminder_count', 1)
      .lte('reminder_sent_at', day10threshold.toISOString())
      .limit(100)

    for (const checkin of secondReminders || []) {
      const plan = checkin.brand_plans as any
      if (!plan?.customer_email) continue
      try {
        await sendCheckinReminderEmail({
          to: plan.customer_email,
          brandName: plan.merchant_name || 'your brand',
          checkinUrl: `${appUrl}/checkin/${checkin.checkin_token}`,
          weekNumber: checkin.week_number || 1,
          planUrl: `${appUrl}/routine/${plan.token}`,
          isSecondReminder: true,
        })
        await supabaseAdmin
          .from('scheduled_checkins')
          .update({ reminder_count: 2 })
          .eq('id', checkin.id)
        sent++
      } catch (err) {
        console.error(`Second reminder error for ${checkin.id}:`, err)
        errors++
      }
    }

    // 3. Day 21: email inattivo + status = inactive (11 giorni dopo secondo reminder)
    const day21threshold = new Date(now)
    day21threshold.setDate(day21threshold.getDate() - 11)

    const { data: inactiveCheckins } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('*, brand_plans(token, customer_email, merchant_name, week_number)')
      .eq('status', 'pending')
      .eq('reminder_count', 2)
      .lte('reminder_sent_at', day21threshold.toISOString())
      .limit(100)

    for (const checkin of inactiveCheckins || []) {
      const plan = checkin.brand_plans as any
      if (!plan?.customer_email) continue
      try {
        await sendInactiveEmail({
          to: plan.customer_email,
          brandName: plan.merchant_name || 'your brand',
          checkinUrl: `${appUrl}/checkin/${checkin.checkin_token}`,
        })
        await supabaseAdmin
          .from('scheduled_checkins')
          .update({ status: 'inactive', reminder_count: 3 })
          .eq('id', checkin.id)
        inactivated++
      } catch (err) {
        console.error(`Inactive email error for ${checkin.id}:`, err)
        errors++
      }
    }

    console.log(`[Cron] sent: ${sent}, inactivated: ${inactivated}, errors: ${errors}`)

    return NextResponse.json({ ok: true, sent, inactivated, errors })

  } catch (err: any) {
    console.error('[Cron] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}