import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createLemonSqueezyCheckout } from '@/lib/lemonsqueezy'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId, variantId } = await request.json()

  if (!productId || !variantId) {
    return NextResponse.json({ error: 'Missing productId or variantId' }, { status: 400 })
  }

  try {
    const url = await createLemonSqueezyCheckout({
      variantId,
      userId: user.id,
      userEmail: user.email!,
      productId,
    })

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}