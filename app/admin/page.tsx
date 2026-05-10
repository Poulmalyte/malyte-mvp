import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkSecret(secret: string) {
  return secret === process.env.ADMIN_SECRET
}

export async function POST(request: NextRequest) {
  const { secret } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, price, lemonsqueezy_variant_id, expert_id, experts(name)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ products: data || [] })
}

export async function PATCH(request: NextRequest) {
  const { secret, productId, variantId } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('products')
    .update({ lemonsqueezy_variant_id: variantId })
    .eq('id', productId)

  return NextResponse.json({ ok: true })
}