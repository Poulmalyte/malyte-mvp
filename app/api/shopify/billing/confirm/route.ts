import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_VERSION = '2025-01'

async function getSubscriptionStatus(shop: string, token: string): Promise<{ id: string, status: string } | null> {
  const query = `
    {
      currentAppInstallation {
        activeSubscriptions {
          id
          status
          trialDays
          currentPeriodEnd
        }
      }
    }
  `

  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query }),
  })

  const data = await res.json()
  console.log('[BillingConfirm] subscription status:', JSON.stringify(data))

  const subscriptions = data?.data?.currentAppInstallation?.activeSubscriptions
  if (!subscriptions || subscriptions.length === 0) return null

  return {
    id: subscriptions[0].id,
    status: subscriptions[0].status,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const shop = searchParams.get('shop')
  const chargeId = searchParams.get('charge_id') // Shopify lo aggiunge automaticamente

  console.log('[BillingConfirm] shop:', shop, 'charge_id:', chargeId)

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  // Recupera access token dal DB
  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (!installation?.access_token) {
    console.error('[BillingConfirm] No installation found for shop:', shop)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=shopify&error=not_installed`
    )
  }

  // Verifica che la subscription sia attiva
  const subscription = await getSubscriptionStatus(shop, installation.access_token)

  if (subscription) {
    // Aggiorna DB con subscription attiva
    await supabaseAdmin
      .from('shopify_installations')
      .update({
        subscription_status: subscription.status.toLowerCase(), // 'active' o 'trial'
        subscription_id: subscription.id,
      })
      .eq('shop_domain', shop)

    console.log('[BillingConfirm] ✅ Subscription active:', subscription)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=shopify&shop=${shop}&installed=true&billing=confirmed`
    )
  } else {
    // Merchant ha rifiutato o qualcosa è andato storto
    console.warn('[BillingConfirm] ⚠️ No active subscription after confirm for shop:', shop)

    await supabaseAdmin
      .from('shopify_installations')
      .update({ subscription_status: 'declined' })
      .eq('shop_domain', shop)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=shopify&shop=${shop}&billing=declined`
    )
  }
}