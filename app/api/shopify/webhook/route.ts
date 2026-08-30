import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getValidAccessToken } from '@/lib/shopify-token'

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

// Calcola attribution window in base ai giorni trascorsi dal quiz
function getAttributionWindow(daysSinceQuiz: number): { window: string; within: boolean } {
  if (daysSinceQuiz <= 30) return { window: '30d', within: true }
  if (daysSinceQuiz <= 60) return { window: '60d', within: true }
  if (daysSinceQuiz <= 90) return { window: '90d', within: true }
  return { window: 'beyond', within: false }
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256') || ''
  const topic = request.headers.get('x-shopify-topic') || ''
  const shop = request.headers.get('x-shopify-shop-domain') || ''

  const body = await request.text()

  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── GDPR handlers (invariati) ──────────────────────────────────────────────

  if (topic === 'customers/data_request') {
    console.log(`[GDPR] Data request for shop: ${shop}`)
    return NextResponse.json({ ok: true })
  }

  if (topic === 'customers/redact') {
    const payload = JSON.parse(body)
    const email = payload.customer?.email
    if (email) {
      await supabaseAdmin.from('shopify_orders').delete().eq('shop_domain', shop).eq('buyer_email', email)
      await supabaseAdmin.from('attributed_orders').delete().eq('customer_email', email.toLowerCase())
    }
    return NextResponse.json({ ok: true })
  }

  if (topic === 'shop/redact') {
    await supabaseAdmin.from('shopify_installations').delete().eq('shop_domain', shop)
    await supabaseAdmin.from('shopify_orders').delete().eq('shop_domain', shop)
    await supabaseAdmin.from('attributed_orders').delete().eq('merchant_id',
      (await supabaseAdmin.from('merchants').select('id').eq('shop_domain', shop).maybeSingle())?.data?.id
    )
    return NextResponse.json({ ok: true })
  }

  if (topic !== 'orders/paid') {
    return NextResponse.json({ ok: true })
  }

  // ── orders/paid ────────────────────────────────────────────────────────────

  const order = JSON.parse(body)
  const buyerEmail = (order.customer?.email || order.email || '').toLowerCase().trim()

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
    .select('expert_id, routine_filters, currency')
    .eq('shop_domain', shop)
    .maybeSingle()

  console.log('[Webhook] installation found:', !!installation)

  const merchantId = installation?.expert_id as string | undefined

  // ── Flusso piano esistente ────────────────────────────────────────────────
  // Raccoglie tutti i product ID dell'ordine che esistono nel catalogo Malyte

  const allProductIds: string[] = []
  for (const item of order.line_items || []) {
    const shopifyProductId = String(item.product_id)
    const { data: shopifyProduct } = await supabaseAdmin
      .from('shopify_products')
      .select('shopify_product_id')
      .eq('shop', shop)
      .eq('shopify_product_id', shopifyProductId)
      .maybeSingle()
    if (shopifyProduct) allProductIds.push(shopifyProductId)
  }

  console.log('[Webhook] matched product ids:', allProductIds)

  if (allProductIds.length === 0) {
    console.log('[Webhook] No matching products in catalog, skipping')
    return NextResponse.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString('hex')

  const { error: upsertError } = await supabaseAdmin
    .from('shopify_orders')
    .upsert({
      shop_domain: shop,
      shopify_order_id: String(order.id),
      shopify_product_id: JSON.stringify(allProductIds),
      buyer_email: buyerEmail,
      customer_email: buyerEmail,
      customer_name: [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || null,
      // Elenco completo delle righe d'ordine. shopify_product_id resta invariato
      // per retrocompatibilita'; questa colonna e' la fonte per la UI merchant.
      line_items: (order.line_items || []).map((i: any) => ({
        shopify_product_id: i.product_id ? String(i.product_id) : null,
        title: i.title || null,
        variant_title: i.variant_title || null,
        quantity: i.quantity ?? 1,
      })),
      total_price: order.total_price != null && order.total_price !== ''
        ? parseFloat(order.total_price)
        : null,
      order_currency: order.currency || null,
      token,
      status: 'pending',
      merchant_id: merchantId || null,
    }, { onConflict: 'shop_domain,shopify_order_id' })

  console.log('[Webhook] upsert error:', JSON.stringify(upsertError))

  if (upsertError) {
    console.error('Error saving order:', upsertError)
    return NextResponse.json({ ok: true })
  }

  // Scrittura metafield plan_token sull'ordine (accessoria, non deve bloccare).
  // Usa getValidAccessToken (auto-refresh, token espirante) e API version corrente.
  try {
    const validToken = await getValidAccessToken(shop)
    await fetch(`https://${shop}/admin/api/2026-04/orders/${order.id}/metafields.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': validToken },
      body: JSON.stringify({
        metafield: { namespace: 'malyte', key: 'plan_token', value: token, type: 'single_line_text_field' },
      }),
    })
  } catch (e) {
    console.warn('[Webhook] metafield write skipped:', e)
  }

  // ── Purchase Confirmation -> Week 1 Generation ──────────────────────────────
  // Se esiste una raccomandazione pendente per questo customer/merchant, confronta i
  // prodotti dell'ordine con quelli raccomandati (via catalog_items, stesso pattern gia'
  // usato dalla Revenue Attribution sotto) e genera la Week 1 SOLO con i prodotti
  // effettivamente acquistati. Non blocca il resto del webhook in caso di errore.

  if (merchantId) {
    try {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('email', buyerEmail)
        .maybeSingle()

      if (existingCustomer) {
        const { data: profileWithSnapshot } = await supabaseAdmin
          .from('customer_profiles')
          .select('recommendation_snapshot')
          .eq('customer_id', existingCustomer.id)
          .eq('merchant_id', merchantId)
          .maybeSingle()

        const snapshot = profileWithSnapshot?.recommendation_snapshot

        if (snapshot && Array.isArray(snapshot.recommended_products) && snapshot.recommended_products.length > 0) {
          const orderProductIds = (order.line_items || []).map((i: { product_id: number }) => String(i.product_id))

          const { data: matchedCatalogItems } = await supabaseAdmin
            .from('catalog_items')
            .select('id, shopify_product_id')
            .eq('merchant_id', merchantId)
            .in('shopify_product_id', orderProductIds)

          const purchasedCatalogIds = (matchedCatalogItems || []).map(c => c.id)
          const recommendedIds = snapshot.recommended_products.map((p: any) => p.product_id)
          const purchasedFromRecommendation = purchasedCatalogIds.filter(id => recommendedIds.includes(id))

          console.log('[PurchaseConfirmation] recommended:', recommendedIds)
          console.log('[PurchaseConfirmation] purchased (catalog_items ids):', purchasedCatalogIds)
          console.log('[PurchaseConfirmation] intersection:', purchasedFromRecommendation)

          if (purchasedFromRecommendation.length > 0) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
            const week1Res = await fetch(`${appUrl}/api/shopify/generate-week1-routine`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchant_id: merchantId,
                customer_id: existingCustomer.id,
                purchased_product_ids: purchasedFromRecommendation,
              }),
            })
            const week1Json = await week1Res.json()
            console.log('[PurchaseConfirmation] Week 1 generation result:', week1Json)
          } else {
            console.log('[PurchaseConfirmation] no overlap between purchase and recommendation, skipping Week 1 generation')
          }
        } else {
          console.log('[PurchaseConfirmation] no pending recommendation snapshot for this customer/merchant')
        }
      }
    } catch (pcErr) {
      // Non deve mai bloccare il resto del webhook (email, attribution, ecc.)
      console.error('[PurchaseConfirmation] error (non-blocking):', pcErr)
    }
  }

  // ── Revenue Attribution ────────────────────────────────────────────────────

  if (merchantId) {
    try {
      // Livello 1: cerca un piano Malyte per questo cliente
      const { data: existingPlan } = await supabaseAdmin
        .from('brand_plans')
        .select('token, created_at, status')
        .eq('merchant_id', merchantId)
        .ilike('buyer_email', buyerEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingPlan) {
        const orderValue = parseFloat(order.total_price || '0')
        const orderCurrency = order.currency || 'EUR'
        const orderPaidAt = new Date(order.processed_at || order.created_at)
        const quizCompletedAt = new Date(existingPlan.created_at)
        const daysSinceQuiz = Math.floor((orderPaidAt.getTime() - quizCompletedAt.getTime()) / (1000 * 60 * 60 * 24))
        const { window: attributionWindow, within: withinWindow } = getAttributionWindow(daysSinceQuiz)

        // Livello 2: verifica se i prodotti dell'ordine matchano catalog_items del merchant
        const orderProductIds = (order.line_items || []).map((i: { product_id: number }) => String(i.product_id))

        const { data: matchedCatalogItems } = await supabaseAdmin
          .from('catalog_items')
          .select('id, shopify_product_id, price')
          .eq('merchant_id', merchantId)
          .in('shopify_product_id', orderProductIds)

        const recommendationMatch = (matchedCatalogItems?.length ?? 0) > 0
        const matchedProductIds = matchedCatalogItems?.map(p => p.id) ?? []

        // Valore dei soli prodotti matchati
        const matchedProductsValue = (order.line_items || []).reduce(
          (sum: number, item: { product_id: number; price: string; quantity: number }) => {
            const isMatched = matchedCatalogItems?.some(c => c.shopify_product_id === String(item.product_id))
            return isMatched ? sum + parseFloat(item.price) * item.quantity : sum
          }, 0
        )

        await supabaseAdmin
          .from('attributed_orders')
          .upsert({
            merchant_id: merchantId,
            shopify_order_id: String(order.id),
            shopify_order_number: String(order.order_number || order.id),
            order_value: orderValue,
            order_currency: orderCurrency,
            order_paid_at: orderPaidAt.toISOString(),
            customer_email: buyerEmail,
            plan_token: existingPlan.token,
            quiz_completed_at: quizCompletedAt.toISOString(),
            attribution_type: 'direct',
            recommendation_match: recommendationMatch,
            matched_product_ids: matchedProductIds,
            matched_products_value: matchedProductsValue,
            days_since_quiz: daysSinceQuiz,
            attribution_window: attributionWindow,
            within_window: withinWindow,
          }, { onConflict: 'merchant_id,shopify_order_id' })

        console.log('[Attribution] order attributed:', {
          email: buyerEmail,
          orderValue,
          daysSinceQuiz,
          attributionWindow,
          recommendationMatch,
        })
      } else {
        console.log('[Attribution] no Malyte plan found for:', buyerEmail)
      }
    } catch (attrErr) {
      // Attribution non deve mai bloccare il flusso piano
      console.error('[Attribution] error (non-blocking):', attrErr)
    }
  }

  // ── Email followup (invariata) ─────────────────────────────────────────────

  if (buyerEmail && token) {
    try {
      const { evaluateFilters } = await import('@/lib/routines/routine-filters')
      const decision = evaluateFilters(
        {
          total_price: order.total_price != null && order.total_price !== ''
            ? parseFloat(order.total_price)
            : null,
          order_currency: order.currency || null,
          line_items: (order.line_items || []).map((i: any) => ({
            quantity: i.quantity ?? 1,
          })),
        },
        installation?.routine_filters,
        installation?.currency ?? null,
      )
      if (!decision.send) {
        console.log('[Filters] followup email skipped:', decision.reason, buyerEmail)
        return NextResponse.json({ ok: true, skipped: decision.reason })
      }

      const { sendFollowupEmail } = await import('@/lib/email/resend')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
      let emailBrandName = shop.replace('.myshopify.com', '')
      if (merchantId) {
        const { data: m } = await supabaseAdmin.from('merchants').select('name').eq('id', merchantId).maybeSingle()
        if (m?.name) emailBrandName = m.name
      }
      console.log('[Email] brandName resolution:', { merchantId, emailBrandName })
      await sendFollowupEmail({
        to: buyerEmail,
        brandName: emailBrandName,
        followupUrl: `${appUrl}/order-followup/${token}`,
      })
    } catch (emailErr) {
      console.error('Followup email error:', emailErr)
    }
  }

  return NextResponse.json({ ok: true })
}