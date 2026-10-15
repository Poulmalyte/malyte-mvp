import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { runWeekForJourney, WEEK_DAYS, MAX_WEEKS } from '@/lib/cycle/run-week'

// Each journey = 2 AI calls; keep the run inside the function limit.
export const maxDuration = 300

const BATCH = 15 // journeys per run (the cron runs daily; the rest goes the next day)
const CONCURRENCY = 3

/**
 * Daily cron: sends the weekly consumption-cycle email to every active journey
 * whose last email is at least 7 days old. Same auth as send-checkin-reminders.
 * Manual test: add ?journey=<id>&force=1 (still needs the CRON_SECRET header).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const single = request.nextUrl.searchParams.get('journey')
  const force = request.nextUrl.searchParams.get('force') === '1'
  if (single) {
    const result = await runWeekForJourney(single, { force })
    return NextResponse.json({ ok: true, results: [{ journeyId: single, ...result }] })
  }

  const supabase = createAdminClient()
  const { data: journeys, error } = await supabase
    .from('cycle_journeys')
    .select('id')
    .eq('status', 'active')
    .eq('in_control_group', false)
    .not('niche', 'is', null)
    .lt('current_week', MAX_WEEKS + 1)
    .order('updated_at', { ascending: true })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Which ones are due: last step older than 7 days
  const ids = (journeys || []).map((j) => j.id)
  const lastStepAt = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 100) {
    const { data: steps } = await supabase
      .from('cycle_steps')
      .select('journey_id, created_at')
      .in('journey_id', ids.slice(i, i + 100))
    for (const s of steps || []) {
      const t = new Date(s.created_at).getTime()
      if (t > (lastStepAt.get(s.journey_id) || 0)) lastStepAt.set(s.journey_id, t)
    }
  }
  const dueBefore = Date.now() - WEEK_DAYS * 24 * 60 * 60 * 1000
  const due = ids.filter((id) => (lastStepAt.get(id) || Infinity) <= dueBefore).slice(0, BATCH)

  const results: Array<{ journeyId: string } & Awaited<ReturnType<typeof runWeekForJourney>>> = []
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const chunk = due.slice(i, i + CONCURRENCY)
    const out = await Promise.all(chunk.map(async (id) => ({ journeyId: id, ...(await runWeekForJourney(id)) })))
    results.push(...out)
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.log('[Cron cycle-weekly]', { active: ids.length, due: due.length, ...summary })
  return NextResponse.json({ ok: true, active: ids.length, due: due.length, summary, results })
}
