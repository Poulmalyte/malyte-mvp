import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
const API_VERSION = '2026-04'

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

// Stabilisce la sessione Supabase per l'utente legato allo shop, settando i cookie
// sulla response. Così quando il merchant atterra su /shopify la sessione esiste
// e non viene rimandato al login. Restituisce true se la sessione è stata creata.
async function establishSession(
  userId: string,
  response: NextResponse,
  request: NextRequest
): Promise<boolean> {
  try {
    // Recupera l'email dell'utente
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (!email) {
      console.error('[BillingConfirm] nessuna email per userId:', userId)
      return false
    }

    // Genera un magic link → contiene il token OTP per verifyOtp
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[BillingConfirm] errore generateLink:', linkError)
      return false
    }
    const hashedToken = linkData.properties.hashed_token

    // Client SSR che scrive i cookie di sessione sulla response
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // verifyOtp stabilisce la sessione e setta i cookie nativamente
    const { error: verifyError } = await supabaseSSR.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashedToken,
    })
    if (verifyError) {
      console.error('[BillingConfirm] errore verifyOtp:', verifyError)
      return false
    }

    console.log('[BillingConfirm] ✅ sessione stabilita per:', email)
    return true
  } catch (err) {
    console.error('[BillingConfirm] establishSession exception:', err)
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const shop = searchParams.get('shop')
  const chargeId = searchParams.get('charge_id')
  console.log('[BillingConfirm] shop:', shop, 'charge_id:', chargeId)

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  // Recupera installazione (access token + expert_id = utente auth)
  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('access_token, expert_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (!installation?.access_token) {
    console.error('[BillingConfirm] No installation found for shop:', shop)
    return NextResponse.redirect(`${APP_URL}/shopify?error=not_installed`)
  }

  // Verifica che la subscription sia attiva
  const subscription = await getSubscriptionStatus(shop, installation.access_token)

  if (subscription) {
    await supabaseAdmin
      .from('shopify_installations')
      .update({
        subscription_status: subscription.status.toLowerCase(),
        subscription_id: subscription.id,
      })
      .eq('shop_domain', shop)
    console.log('[BillingConfirm] ✅ Subscription active:', subscription)

    // Billing confermato → avanza l'onboarding oltre lo Step 2 (Catalog),
    // così il rientro da /shopify non riporta mai al bottone Connect (loop OAuth).
    if (installation.expert_id) {
      const { data: mp } = await supabaseAdmin
        .from('merchant_profiles')
        .select('onboarding_step, onboarding_completed')
        .eq('merchant_id', installation.expert_id)
        .maybeSingle()
      if (mp && !mp.onboarding_completed && (mp.onboarding_step ?? 1) < 3) {
        await supabaseAdmin
          .from('merchant_profiles')
          .update({ onboarding_step: 3 })
          .eq('merchant_id', installation.expert_id)
        console.log('[BillingConfirm] onboarding_step -> 3 per merchant:', installation.expert_id)
      }
    }

    // Costruisci la response di redirect a /shopify e stabilisci la sessione su di essa
    const response = NextResponse.redirect(
      `${APP_URL}/shopify?shop=${shop}&installed=true&billing=confirmed`
    )
    if (installation.expert_id) {
      await establishSession(installation.expert_id, response, request)
    }
    return response
  } else {
    console.warn('[BillingConfirm] ⚠️ No active subscription after confirm for shop:', shop)
    await supabaseAdmin
      .from('shopify_installations')
      .update({ subscription_status: 'declined' })
      .eq('shop_domain', shop)
    return NextResponse.redirect(`${APP_URL}/shopify?shop=${shop}&billing=declined`)
  }
}