import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * "Stop these weekly emails". Body: { token }
 * Stops the journey: no more cycle emails for this order.
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (typeof token !== 'string') return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: step } = await supabase
      .from('cycle_steps')
      .select('journey_id, merchant_id')
      .eq('token', token)
      .maybeSingle()
    if (!step) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase
      .from('cycle_journeys')
      .update({ status: 'stopped', updated_at: new Date().toISOString() })
      .eq('id', step.journey_id)

    await supabase.from('event_stream').insert({
      merchant_id: step.merchant_id,
      event_type: 'cycle_unsubscribed',
      event_data: { journey_id: step.journey_id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[cycle/stop] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
