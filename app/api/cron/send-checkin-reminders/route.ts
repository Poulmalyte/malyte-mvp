import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Verifica authorization header per sicurezza
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Trova tutti i check-in pending scaduti (scheduled_for <= now)
    const { data: pendingCheckins } = await supabaseAdmin
      .from('scheduled_checkins')
      .select(`
        *,
        brand_plans (
          token,
          customer_email,
          merchant_name,
          week_number
        )
      `)
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .limit(100)

    if (!pendingCheckins || pendingCheckins.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const { sendCheckinReminderEmail } = await import('@/lib/email/resend')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

    let sent = 0
    let errors = 0

    for (const checkin of pendingCheckins) {
      const plan = checkin.brand_plans as any
      if (!plan?.customer_email) continue

      try {
        await sendCheckinReminderEmail({
          to: plan.customer_email,
          brandName: plan.merchant_name || 'your brand',
          checkinUrl: `${appUrl}/checkin/${checkin.checkin_token}`,
          weekNumber: checkin.week_number || 1,
          planUrl: `${appUrl}/routine/${plan.token}`,
        })

        // Aggiorna reminder_sent_at
        await supabaseAdmin
          .from('scheduled_checkins')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', checkin.id)

        sent++
      } catch (err) {
        console.error(`Failed to send reminder for checkin ${checkin.id}:`, err)
        errors++
      }
    }

    console.log(`[Cron] Sent ${sent} reminders, ${errors} errors`)

    return NextResponse.json({ ok: true, sent, errors })

  } catch (err: any) {
    console.error('[Cron] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}