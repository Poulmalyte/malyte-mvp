import { NextRequest, NextResponse } from 'next/server'

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
  const state = expertId ? `${nonce}_${expertId}` : nonce

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`

  const response = NextResponse.redirect(installUrl)
  response.cookies.set('shopify_state', state, { httpOnly: true, maxAge: 60 * 10 })

  return response
}