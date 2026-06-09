import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop')
  const expertId = request.nextUrl.searchParams.get('expert_id')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const scopes = process.env.SHOPIFY_SCOPES!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
  const nonce = Math.random().toString(36).substring(2)
  const state = `${nonce}_${expertId || ''}`

  // Salva state → expertId nel DB prima del redirect
  await supabaseAdmin
    .from('shopify_oauth_states')
    .insert({ state, expert_id: expertId, shop_domain: shop })

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}&force_access_token_regeneration=1`

  const response = NextResponse.redirect(installUrl)
  response.cookies.set('shopify_state', state, { httpOnly: true, maxAge: 60 * 10 })

  return response
}