import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const savedState = request.cookies.get('shopify_state')?.value

  if (!state || state !== savedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
  }

  if (!code || !shop) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Estrai expert_id dallo state
  const expertId = state.split('_')[1]

  // Scambia code per access token
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const { access_token } = await tokenResponse.json()

  if (!access_token) {
    return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 })
  }

  // Salva installazione con expert_id
  const { error: installError } = await supabaseAdmin
    .from('shopify_installations')
    .upsert({
      shop_domain: shop,
      access_token,
      expert_id: expertId,
    }, { onConflict: 'shop_domain' })

  if (installError) {
    console.error('Supabase error:', installError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Registra webhook orders/paid
  await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': access_token,
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/paid',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/webhook`,
        format: 'json',
      },
    }),
  })

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=shopify&shop=${shop}&installed=true`
  )
  response.cookies.delete('shopify_state')

  return response
}