import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { purchase_id, rating, comment } = await req.json()
  if (!purchase_id || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verifica che l'acquisto appartenga al client
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, product_id, products(expert_id)')
    .eq('id', purchase_id)
    .eq('client_id', user.id)
    .single()

  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })

  const expert_id = (purchase.products as any)?.expert_id
  const product_id = purchase.product_id

  const { error } = await supabase.from('reviews').upsert({
    purchase_id,
    client_id: user.id,
    expert_id,
    product_id,
    rating,
    comment: comment || null,
  }, { onConflict: 'purchase_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}