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

  // GDPR obbligatori
  if (topic === 'customers/data_request') {
    console.log(`[GDPR] Data request for shop: ${shop}`)
    return NextResponse.json({ ok: true })
  }

  if (topic === 'customers/redact') {
    const payload = JSON.parse(body)
    const email = payload.customer?.email
    if (email) {
      await supabaseAdmin
        .from('shopify_orders')
        .delete()
        .eq('shop', shop)
        .eq('buyer_email', email)
    }
    return NextResponse.json({ ok: true })
  }

  if (topic === 'shop/redact') {
    await supabaseAdmin
      .from('shopify_installations')
      .delete()
      .eq('shop_domain', shop)
    await supabaseAdmin
      .from('shopify_orders')
      .delete()
      .eq('shop', shop)
    return NextResponse.json({ ok: true })
  }

  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true })
  }

  // orders/paid
  const order = JSON.parse(body)
  const buyerEmail = order.customer?.email || order.email

  if (!buyerEmail) {
    return NextResponse.json({ ok: true })
  }

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token')
    .eq('shop_domain', shop)
    .maybeSingle()

  const accessToken = installation?.access_token as string | undefined

  for (const item of order.line_items || []) {
    const shopifyProductId = String(item.product_id)

    const { data: shopifyProduct } = await supabaseAdmin
      .from('shopify_products')
      .select('*')
      .eq('shop', shop)
      .eq('shopify_product_id', shopifyProductId)
      .maybeSingle()

    if (!shopifyProduct) continue

    const token = crypto.randomBytes(32).toString('hex')

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
      continue
    }

    if (accessToken) {
      await fetch(`https://${shop}/admin/api/2024-01/orders/${order.id}/metafields.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          metafield: {
            namespace: 'malyte',
            key: 'plan_token',
            value: token,
            type: 'single_line_text_field',
          },
        }),
      })
    }
  }

  return NextResponse.json({ ok: true })
}