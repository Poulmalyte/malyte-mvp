import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const shop = body.shop as string

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop' }, { status: 400 })
  }

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (!installation || !installation.access_token) {
    return NextResponse.json({ error: 'Shop not installed' }, { status: 404 })
  }

  const accessToken = installation.access_token as string

  const res = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=250`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  })

  const data = await res.json()
  console.log('Shopify response status:', res.status)
  console.log('Shopify response data:', JSON.stringify(data))

  const products = data.products || []

  for (const product of products) {
    await supabaseAdmin
      .from('shopify_products')
      .upsert({
        shop_domain: shop,
        shopify_product_id: String(product.id),
        shopify_product_title: product.title,
      }, { onConflict: 'shop_domain,shopify_product_id' })
  }

  return NextResponse.json({ ok: true, count: products.length })
}