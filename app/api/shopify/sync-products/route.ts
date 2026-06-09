import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const shop = body.shop as string
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (!installation?.access_token) {
    return NextResponse.json({ error: 'Shop not installed' }, { status: 404 })
  }

  const res = await fetch(`https://${shop}/admin/api/2026-04/products.json?limit=250`, {
    headers: { 'X-Shopify-Access-Token': installation.access_token },
  })
  const data = await res.json()
  const products = data.products || []

  for (const product of products) {
    const firstVariant = product.variants?.[0]
    const firstImage = product.images?.[0]

    await supabaseAdmin
      .from('shopify_products')
      .upsert({
        shop,
        shopify_product_id: String(product.id),
        shopify_product_title: product.title,
        shopify_variant_id: firstVariant ? String(firstVariant.id) : null,
        price: firstVariant?.price ? parseFloat(firstVariant.price) : null,
        image_url: firstImage?.src || null,
        product_url: `https://${shop}/products/${product.handle}`,
      }, { onConflict: 'shop,shopify_product_id' })
  }

  return NextResponse.json({ ok: true, count: products.length })
}
