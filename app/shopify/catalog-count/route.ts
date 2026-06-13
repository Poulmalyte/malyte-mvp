import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get('merchantId')
  if (!merchantId) {
    return NextResponse.json({ error: 'merchantId required' }, { status: 400 })
  }

  const { count: total, error: totalErr } = await supabase
    .from('catalog_items')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)

  const { count: tagged, error: taggedErr } = await supabase
    .from('catalog_items')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('ai_tagged', true)

  if (totalErr || taggedErr) {
    console.error('catalog-count error:', totalErr || taggedErr)
    return NextResponse.json({ error: 'count failed' }, { status: 500 })
  }

  return NextResponse.json({ total: total ?? 0, tagged: tagged ?? 0 })
}
