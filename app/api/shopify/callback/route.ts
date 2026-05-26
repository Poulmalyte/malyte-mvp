import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/webhook`
const API_VERSION = '2025-01'

async function registerWebhook(shop: string, token: string, topic: string) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/webhooks.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      webhook: { topic, address: WEBHOOK_URL, format: 'json' },
    }),
  })
  const data = await res.json()
  if (data.errors) {
    console.error(`Webhook ${topic} error:`, data.errors)
  } else {
    console.log(`✅ Webhook ${topic} registered`)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  if (!state || !code || !shop) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Leggi expert_id dalla tabella invece del cookie
  const { data: oauthState } = await supabaseAdmin
    .from('shopify_oauth_states')
    .select('expert_id')
    .eq('state', state)
    .maybeSingle()

  if (!oauthState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
  }

  const expertId = oauthState.expert_id
  console.log('[Callback] expertId from DB:', expertId)

  // Cancella lo state usato
  await supabaseAdmin
    .from('shopify_oauth_states')
    .delete()
    .eq('state', state)

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

  const tokenData = await tokenResponse.json()
  const access_token = tokenData.access_token

  if (!access_token) {
    console.error('Token error:', tokenData)
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

  // Registra tutti i webhook
  await Promise.all([
    registerWebhook(shop, access_token, 'orders/paid'),
    registerWebhook(shop, access_token, 'customers/data_request'),
    registerWebhook(shop, access_token, 'customers/redact'),
    registerWebhook(shop, access_token, 'shop/redact'),
  ])

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=shopify&shop=${shop}&installed=true`
  )
  response.cookies.delete('shopify_state')

  return response
}