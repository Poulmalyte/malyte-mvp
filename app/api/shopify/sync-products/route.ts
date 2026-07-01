import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/shopify-token'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const shop = body.shop as string
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(shop)
  } catch (e) {
    console.error('[SyncProducts] token error:', e)
    return NextResponse.json({ error: 'Shop not installed' }, { status: 404 })
  }
  const res = await fetch(`https://${shop}/admin/api/2026-04/products.json?limit=250`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  })
  const data = await res.json()
  console.log('[SyncProducts] shop:', shop, 'status:', res.status, 'keys:', Object.keys(data), 'errors:', JSON.stringify(data.errors || data).slice(0, 300))
  const products = data.products || []
  console.log('[SyncProducts] product count:', products.length)
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
