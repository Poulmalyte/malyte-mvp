import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyWebhook(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return hash === hmac
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256') || ''
  const topic = request.headers.get('x-shopify-topic') || ''
  const shop = request.headers.get('x-shopify-shop-domain') || ''

  const body = await request.text()

  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true })
  }

  const order = JSON.parse(body)
  const buyerEmail = order.customer?.email || order.email
  const buyerName = order.customer?.first_name || ''

  if (!buyerEmail) {
    return NextResponse.json({ ok: true })
  }

  // Per ogni prodotto nell'ordine
  for (const item of order.line_items || []) {
    const shopifyProductId = String(item.product_id)

    // Cerca il prodotto Malyte collegato a questo prodotto Shopify
    const { data: shopifyProduct } = await supabaseAdmin
      .from('shopify_products')
      .select('*')
      .eq('shop', shop)
      .eq('shopify_product_id', shopifyProductId)
      .maybeSingle()

    if (!shopifyProduct) continue

    // Token unico per questo ordine+prodotto
    const token = crypto.randomBytes(32).toString('hex')

    // Crea record ordine
    const { error } = await supabaseAdmin
      .from('shopify_orders')
      .upsert({
        shop,
        shopify_order_id: String(order.id),
        shopify_product_id: shopifyProductId,
        buyer_email: buyerEmail,
        token,
        status: 'pending',
      }, { onConflict: 'shop,shopify_order_id' })

    if (error) {
      console.error('Error saving order:', error)
    }
  }

  return NextResponse.json({ ok: true })
}