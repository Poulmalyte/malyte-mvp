import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

/**
 * Click sul cross-sell: verifica, traccia, redirige.
 * L'URL di destinazione NON arriva mai dal client: viene risolto
 * server-side da catalog_items -> shopify_products.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')
  const productId = url.searchParams.get('p')

  const bail = () => NextResponse.redirect(`${APP_URL}/routine/${token || ''}`)
  if (!token || !productId) return bail()

  const { data: plan } = await supabaseAdmin
    .from('brand_plans')
    .select('id, merchant_id, customer_id, plan_data')
    .eq('token', token)
    .maybeSingle()
  if (!plan) return bail()

  const recommendedId = (plan.plan_data as any)?.recommended_product_id
  if (!recommendedId || String(recommendedId) !== String(productId)) return bail()

  const { data: item } = await supabaseAdmin
    .from('catalog_items')
    .select('id, shopify_product_id, is_active')
    .eq('id', productId)
    .eq('merchant_id', plan.merchant_id)
    .maybeSingle()
  if (!item || !item.is_active || !item.shopify_product_id) return bail()

  const { data: order } = await supabaseAdmin
    .from('shopify_orders')
    .select('shop_domain, shop')
    .eq('followup_plan_id', plan.id)
    .maybeSingle()

  let shopDomain: string | null = order?.shop_domain || order?.shop || null
  if (!shopDomain) {
    const { data: install } = await supabaseAdmin
      .from('shopify_installations')
      .select('shop_domain')
      .eq('expert_id', plan.merchant_id)
      .maybeSingle()
    shopDomain = install?.shop_domain || null
  }
  if (!shopDomain) return bail()

  const { data: sp } = await supabaseAdmin
    .from('shopify_products')
    .select('product_url')
    .eq('shop', shopDomain)
    .eq('shopify_product_id', item.shopify_product_id)
    .maybeSingle()
  if (!sp?.product_url) return bail()

  await supabaseAdmin.from('event_stream').insert({
    merchant_id: plan.merchant_id,
    customer_id: plan.customer_id,
    event_type: 'cross_sell_click',
    event_data: {
      plan_token: token,
      brand_plan_id: plan.id,
      recommended_product_id: String(productId),
      shopify_product_id: item.shopify_product_id,
      shop_domain: shopDomain,
    },
  })

  console.log('[cross-sell-click]', token, productId, '->', sp.product_url)
  return NextResponse.redirect(sp.product_url)
}
