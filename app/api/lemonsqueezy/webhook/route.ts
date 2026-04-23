import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  console.log('🔔 Webhook received')
  console.log('🔑 Signature from LS:', signature)

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  console.log('🔐 Secret length:', secret?.length)

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  console.log('🔐 Computed HMAC:', hmac)
  console.log('🔑 Match:', hmac === signature)

  if (hmac !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const eventName = body.meta?.event_name

  if (eventName === 'order_created') {
    const userId = body.meta?.custom_data?.user_id
    const productId = body.meta?.custom_data?.product_id
    const amount = body.data?.attributes?.total / 100
    const orderId = body.data?.id

    console.log('📦 Order data:', { userId, productId, amount, orderId })

    if (!userId || !productId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('purchases')
      .insert({
        client_id: userId,
        product_id: productId,
        amount: amount,
        stripe_payment_id: `ls_${orderId}`,
      })

    if (error) {
      console.error('Error creating purchase:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}