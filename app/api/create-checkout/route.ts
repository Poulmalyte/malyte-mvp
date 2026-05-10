import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createLemonSqueezyCheckout } from '@/lib/lemonsqueezy'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId } = await request.json()
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  }

  // Prendi il prezzo dal prodotto su Supabase
  const { data: product } = await supabase
    .from('products')
    .select('price')
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  try {
    const url = await createLemonSqueezyCheckout({
      userId: user.id,
      userEmail: user.email!,
      productId,
      price: product.price,
    })
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}