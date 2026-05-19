import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const nonce = request.cookies.get('shopify_nonce')?.value

  // Verifica nonce
  if (!state || state !== nonce) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
  }

  if (!code || !shop) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

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

  // Salva shop in Supabase
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('shopify_installations')
    .upsert({ shop_domain: shop, access_token }, { onConflict: 'shop_domain' })

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Redirect al dashboard Malyte
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${shop}&installed=true`)
  response.cookies.delete('shopify_nonce')

  return response
}