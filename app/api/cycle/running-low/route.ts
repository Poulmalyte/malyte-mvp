import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * "I'm running low" button. Body: { token }
 * Marks the journey: the next weekly email leads with the refill,
 * whatever the stock estimate says.
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
      .update({ reported_running_low: true, updated_at: new Date().toISOString() })
      .eq('id', step.journey_id)

    await supabase.from('event_stream').insert({
      merchant_id: step.merchant_id,
      event_type: 'cycle_running_low',
      event_data: { journey_id: step.journey_id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[cycle/running-low] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
