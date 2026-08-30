import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { DEFAULT_FILTERS, type FilterRule } from '@/lib/routines/routine-filters'

export const runtime = 'nodejs'

/** Accetta solo regole con forma valida. Scarta il resto senza fallire. */
function sanitizeRules(input: unknown): FilterRule[] {
  if (!Array.isArray(input)) return []
  const out: FilterRule[] = []
  const seen = new Set<string>()

  for (const r of input) {
    if (!r || typeof r !== 'object') continue
    const { type, op, value } = r as Record<string, unknown>
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n < 0) continue
    if (seen.has(String(type))) continue

    if (type === 'order_value' && (op === 'gt' || op === 'lt')) {
      out.push({ type: 'order_value', op, value: n })
      seen.add('order_value')
    } else if (type === 'item_count' && (op === 'gte' || op === 'lte')) {
      out.push({ type: 'item_count', op, value: Math.floor(n) })
      seen.add('item_count')
    }
  }
  return out
}

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('shopify_installations')
    .select('routine_filters, currency')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not installed' }, { status: 404 })

  return NextResponse.json({
    filters: data.routine_filters ?? DEFAULT_FILTERS,
    currency: data.currency ?? 'EUR',
  })
}

export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const shop = typeof body.shop === 'string' ? body.shop : null
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const allCustomers = body.all_customers !== false
  const filters = {
    all_customers: allCustomers,
    rules: allCustomers ? [] : sanitizeRules(body.rules),
  }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('shopify_installations')
    .update({ routine_filters: filters })
    .eq('shop_domain', shop)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, filters })
}
