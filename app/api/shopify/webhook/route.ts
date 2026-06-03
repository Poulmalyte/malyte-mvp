import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyWebhook(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const calculated = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'base64'),
      Buffer.from(hmac, 'base64')
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256') || ''
  const topic = request.headers.get('x-shopify-topic') || ''
  const shop = request.headers.get('x-shopify-shop-domain') || ''

  const body = await request.text()

  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (topic === 'customers/data_request') {
    console.log(`[GDPR] Data request for shop: ${shop}`)
    return NextResponse.json({ ok: true })
  }

  if (topic === 'customers/redact') {
    const payload = JSON.parse(body)
    const email = payload.customer?.email
    if (email) {
      await supabaseAdmin.from('shopify_orders').delete().eq('shop_domain', shop).eq('buyer_email', email)
    }
    return NextResponse.json({ ok: true })
  }

  if (topic === 'shop/redact') {
    await supabaseAdmin.from('shopify_installations').delete().eq('shop_domain', shop)
    await supabaseAdmin.from('shopify_orders').delete().eq('shop_domain', shop)
    return NextResponse.json({ ok: true })
  }

  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true })
  }

  const order = JSON.parse(body)
  const buyerEmail = order.customer?.email || order.email

  console.log('[Webhook] order id:', order.id)
  console.log('[Webhook] buyerEmail:', buyerEmail)
  console.log('[Webhook] line_items:', JSON.stringify(order.line_items))
  console.log('[Webhook] shop:', shop)

  if (!buyerEmail) {
    console.log('[Webhook] No buyer email, skipping')
    return NextResponse.json({ ok: true })
  }

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token')
    .eq('shop_domain', shop)
    .maybeSingle()

  console.log('[Webhook] installation found:', !!installation)

  const accessToken = installation?.access_token as string | undefined

  for (const item of order.line_items || []) {
    const shopifyProductId = String(item.product_id)
    console.log('[Webhook] checking product:', shopifyProductId)

    const { data: shopifyProduct, error: productError } = await supabaseAdmin
      .from('shopify_products')
      .select('*')
      .eq('shop', shop)
      .eq('shopify_product_id', shopifyProductId)
      .maybeSingle()

    console.log('[Webhook] shopifyProduct found:', !!shopifyProduct, 'error:', JSON.stringify(productError))

    if (!shopifyProduct) continue

    const token = crypto.randomBytes(32).toString('hex')

    const { error } = await supabaseAdmin
      .from('shopify_orders')
      .upsert({
        shop_domain: shop,
        shopify_order_id: String(order.id),
        shopify_product_id: shopifyProductId,
        buyer_email: buyerEmail,
        customer_email: buyerEmail,
        token,
        status: 'pending',
      }, { onConflict: 'shop_domain,shopify_order_id' })

    console.log('[Webhook] upsert error:', JSON.stringify(error))

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

    // Invia email followup via Resend
    if (buyerEmail) {
      try {
        const { sendFollowupEmail } = await import('@/lib/email/resend')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
        await sendFollowupEmail({
          to: buyerEmail,
          brandName: shop.replace('.myshopify.com', ''),
          followupUrl: appUrl + '/order-followup/' + token,
        })
      } catch (emailErr) {
        console.error('Followup email error:', emailErr)
      }
    }
  }
  return NextResponse.json({ ok: true })
}
