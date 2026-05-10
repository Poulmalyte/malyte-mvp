import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { title, description, price } = await request.json()
  const apiKey = process.env.LEMONSQUEEZY_API_KEY!
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!

  // 1 — Crea prodotto
  const productRes = await fetch('https://api.lemonsqueezy.com/v1/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'products',
        attributes: { name: title, description: description || '' },
        relationships: { store: { data: { type: 'stores', id: storeId } } },
      },
    }),
  })

  const productJson = await productRes.json()
  if (!productRes.ok) {
    console.error('LS product error:', productJson)
    return NextResponse.json({ error: 'Failed to create LS product' }, { status: 500 })
  }

  const lsProductId = productJson.data.id

  // 2 — Crea variant
  const variantRes = await fetch('https://api.lemonsqueezy.com/v1/variants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'variants',
        attributes: {
          name: 'Default',
          price: Math.round(price * 100),
          is_default: true,
        },
        relationships: { product: { data: { type: 'products', id: lsProductId } } },
      },
    }),
  })

  const variantJson = await variantRes.json()
  if (!variantRes.ok) {
    console.error('LS variant error:', variantJson)
    return NextResponse.json({ error: 'Failed to create LS variant' }, { status: 500 })
  }

  const variantId = variantJson.data.id

  return NextResponse.json({ variantId, lsProductId })
}