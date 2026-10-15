import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * Post-purchase journey of the logged-in brand: 'routine' or 'cycle'.
 * Unlike routine-filters, this route checks the session: a brand can only
 * read and change ITS OWN installation (expert_id = logged-in user).
 */

async function getUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Suggests a mode from the catalog: multi-step skincare → routine, everything else → cycle. */
async function suggestMode(admin: ReturnType<typeof createAdminClient>, merchantId: string) {
  const [{ data: merchant }, { data: tags }] = await Promise.all([
    admin.from('merchants').select('category').eq('id', merchantId).maybeSingle(),
    admin
      .from('catalog_item_tags')
      .select('tag_value')
      .eq('merchant_id', merchantId)
      .eq('tag_type', 'routine_step'),
  ])
  const steps = new Set(
    (tags || []).map((t) => String(t.tag_value || '').toLowerCase()).filter((v) => v && v !== 'other'),
  )
  const isSkincare = String(merchant?.category || '').toLowerCase().includes('skin')
  const mode: 'routine' | 'cycle' = isSkincare && steps.size >= 3 ? 'routine' : 'cycle'
  const reason =
    mode === 'routine'
      ? `Your catalog covers ${steps.size} routine steps, so a step-by-step routine fits well.`
      : 'Your products are used on their own, so a usage guide with refill reminders fits well.'
  return { mode, reason }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: inst, error } = await admin
    .from('shopify_installations')
    .select('shop_domain, journey_mode')
    .eq('expert_id', userId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!inst) return NextResponse.json({ error: 'Not installed' }, { status: 404 })

  const [suggestion, { count: started }, { count: answers }] = await Promise.all([
    suggestMode(admin, userId),
    admin.from('cycle_journeys').select('id', { count: 'exact', head: true })
      .eq('merchant_id', userId).eq('in_control_group', false),
    admin.from('cycle_answers').select('id', { count: 'exact', head: true }).eq('merchant_id', userId),
  ])

  return NextResponse.json({
    mode: inst.journey_mode === 'cycle' ? 'cycle' : 'routine',
    suggestion,
    stats: { journeys: started || 0, answers: answers || 0 },
  })
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const mode = body.mode === 'cycle' ? 'cycle' : body.mode === 'routine' ? 'routine' : null
  if (!mode) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shopify_installations')
    .update({ journey_mode: mode, updated_at: new Date().toISOString() })
    .eq('expert_id', userId)
    .select('shop_domain')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not installed' }, { status: 404 })

  await admin.from('event_stream').insert({
    merchant_id: userId,
    event_type: 'journey_mode_changed',
    event_data: { mode, shop_domain: data.shop_domain },
  })

  return NextResponse.json({ ok: true, mode })
}
