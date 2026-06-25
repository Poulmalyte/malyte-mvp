import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
const WEBHOOK_URL = `${APP_URL}/api/shopify/webhook`
const API_VERSION = '2026-04'

// Billing in modalità test: true sui dev store / per la review, false in produzione.
const BILLING_TEST = process.env.SHOPIFY_BILLING_TEST === 'true'

function shopToEmail(shop: string): string {
  const handle = shop.replace('.myshopify.com', '').replace(/[^a-z0-9-]/gi, '')
  return `${handle}@shopify.malyte.app`
}

async function registerWebhook(shop: string, token: string, topic: string) {
  try {
    const existingRes = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/webhooks.json?topic=${topic}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
      }
    )
    const existingData = await existingRes.json()
    const alreadyRegistered = existingData?.webhooks?.some(
      (w: any) => w.topic === topic && w.address === WEBHOOK_URL
    )
    if (alreadyRegistered) {
      console.log(`ℹ️ Webhook ${topic} già registrato, skip`)
      return
    }
  } catch (err) {
    console.warn(`[Webhook] check esistenza fallito per ${topic}:`, err)
  }

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

  if (res.status === 422) {
    const body = await res.text()
    console.warn(`ℹ️ Webhook ${topic} 422 (probabile duplicato):`, body)
    return
  }

  const data = await res.json()
  if (data.errors) {
    console.error(`Webhook ${topic} error:`, JSON.stringify(data.errors))
  } else {
    console.log(`✅ Webhook ${topic} registered`)
  }
}

async function ensureUserForShop(shop: string): Promise<string | null> {
  const email = shopToEmail(shop)

  try {
    const randomPassword = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}A1!`
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
    })

    if (created?.user) {
      console.log('[Callback] nuovo utente shop creato:', created.user.id)
      return created.user.id
    }

    if (error) {
      console.warn('[Callback] createUser error (probabile già esistente):', error.message)
      let page = 1
      while (page <= 10) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
        const found = list?.users?.find((u: any) => u.email === email)
        if (found) {
          console.log('[Callback] utente shop esistente trovato:', found.id)
          return found.id
        }
        if (!list?.users || list.users.length < 200) break
        page++
      }
    }
  } catch (err) {
    console.error('[Callback] ensureUserForShop exception:', err)
  }

  console.error('[Callback] impossibile creare/recuperare utente per shop:', shop)
  return null
}

async function createSubscription(shop: string, token: string): Promise<string> {
  const returnUrl = `${APP_URL}/api/shopify/billing/confirm?shop=${shop}`
  const price = process.env.SHOPIFY_PLAN_PRICE || '9.99'
  const planName = process.env.SHOPIFY_PLAN_NAME || 'Malyte Pro'
  const trialDays = parseInt(process.env.SHOPIFY_TRIAL_DAYS || '30')

  const query = `
    mutation {
      appSubscriptionCreate(
        name: "${planName}"
        returnUrl: "${returnUrl}"
        trialDays: ${trialDays}
        test: ${BILLING_TEST}
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: "${price}", currencyCode: USD }
              interval: EVERY_30_DAYS
            }
          }
        }]
      ) {
        appSubscription { id status }
        confirmationUrl
        userErrors { field message }
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
  console.log('[Billing] full response:', JSON.stringify(data))

  if (data.errors) throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`)

  const userErrors = data?.data?.appSubscriptionCreate?.userErrors
  if (userErrors?.length > 0) throw new Error(`Subscription userErrors: ${JSON.stringify(userErrors)}`)

  const confirmationUrl = data?.data?.appSubscriptionCreate?.confirmationUrl
  if (!confirmationUrl) throw new Error('No confirmationUrl returned from Shopify')

  return confirmationUrl
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  if (!state || !code || !shop) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const { data: oauthState } = await supabaseAdmin
    .from('shopify_oauth_states')
    .select('expert_id')
    .eq('state', state)
    .maybeSingle()

  if (!oauthState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
  }

  let expertId = oauthState.expert_id
  console.log('[Callback] expertId from DB:', expertId)

  await supabaseAdmin.from('shopify_oauth_states').delete().eq('state', state)

  // Token EXPIRING offline: Shopify non accetta più token non-expiring per l'Admin API.
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
      expiring: '1',
    }),
  })

  const tokenData = await tokenResponse.json()
  console.log('[Callback] tokenData:', JSON.stringify(tokenData))

  const access_token = tokenData.access_token
  const refresh_token = tokenData.refresh_token || null
  const expires_in = tokenData.expires_in || null
  const token_expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null

  if (!access_token) {
    console.error('Token error:', tokenData)
    return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 })
  }

  if (!expertId) {
    const newUserId = await ensureUserForShop(shop)
    if (newUserId) {
      expertId = newUserId
      console.log('[Callback] expertId auto-creato da shop:', expertId)
    }
  }

  const { error: installError } = await supabaseAdmin
    .from('shopify_installations')
    .upsert({
      shop_domain: shop,
      access_token,
      refresh_token,
      token_expires_at,
      expert_id: expertId,
      subscription_status: 'pending',
    }, { onConflict: 'shop_domain' })

  if (installError) {
    console.error('Supabase error:', installError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  await registerWebhook(shop, access_token, 'orders/paid')

  try {
    const confirmationUrl = await createSubscription(shop, access_token)
    const response = NextResponse.redirect(confirmationUrl)
    response.cookies.delete('shopify_state')
    return response
  } catch (err) {
    console.error('[Billing] Error creating subscription:', err)
    const response = NextResponse.redirect(`${APP_URL}/shopify`)
    response.cookies.delete('shopify_state')
    return response
  }
}