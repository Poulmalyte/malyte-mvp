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

  if (!res.ok) {
    console.error('[SyncProducts] Shopify fetch failed:', res.status)
    return NextResponse.json({ error: 'Shopify fetch failed' }, { status: 502 })
  }

  const data = await res.json()
  console.log('[SyncProducts] shop:', shop, 'status:', res.status, 'keys:', Object.keys(data), 'errors:', JSON.stringify(data.errors || data).slice(0, 300))

  const products = data.products || []
  console.log('[SyncProducts] product count:', products.length)

  const liveIds: string[] = []

  for (const product of products) {
    const firstVariant = product.variants?.[0]
    const firstImage = product.images?.[0]
    const shopifyProductId = String(product.id)
    liveIds.push(shopifyProductId)

    await supabaseAdmin
      .from('shopify_products')
      .upsert({
        shop,
        shopify_product_id: shopifyProductId,
        shopify_product_title: product.title,
        shopify_variant_id: firstVariant ? String(firstVariant.id) : null,
        price: firstVariant?.price ? parseFloat(firstVariant.price) : null,
        image_url: firstImage?.src || null,
        product_url: `https://${shop}/products/${product.handle}`,
        archived_at: null,
      }, { onConflict: 'shop,shopify_product_id' })
  }

  let archivedCount = 0

  if (liveIds.length === 0) {
    console.warn('[SyncProducts] zero products returned — skipping archive step to avoid mass-archiving', shop)
  } else {
    const { data: archived, error: archiveError } = await supabaseAdmin
      .from('shopify_products')
      .update({ archived_at: new Date().toISOString() })
      .eq('shop', shop)
      .is('archived_at', null)
      .not('shopify_product_id', 'in', `(${liveIds.join(',')})`)
      .select('shopify_product_id')

    if (archiveError) {
      console.error('[SyncProducts] archive error:', archiveError)
    } else {
      archivedCount = archived?.length ?? 0
      if (archivedCount > 0) {
        console.log('[SyncProducts] archived', archivedCount, 'products no longer in Shopify:', archived?.map(a => a.shopify_product_id))
      }
    }
  }

  return NextResponse.json({ ok: true, count: products.length, archived: archivedCount })
}