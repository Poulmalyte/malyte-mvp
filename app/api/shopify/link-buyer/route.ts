import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const token = body.token as string
  const buyer_id = body.buyer_id as string

  if (!token || !buyer_id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const result = await supabaseAdmin
    .from('shopify_orders')
    .update({ buyer_id })
    .eq('token', token)

  if (result.error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}