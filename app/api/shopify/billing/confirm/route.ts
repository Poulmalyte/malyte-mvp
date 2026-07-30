import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { waitUntil } from '@vercel/functions'
import { getValidAccessToken } from '@/lib/shopify-token'
import { syncAndTagProducts } from '@/lib/shopify/sync-and-tag'

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
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (!email) {
      console.error('[BillingConfirm] nessuna email per userId:', userId)
      return false
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[BillingConfirm] errore generateLink:', linkError)
      return false
    }
    const hashedToken = linkData.properties.hashed_token

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

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('expert_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (!installation) {
    console.error('[BillingConfirm] No installation found for shop:', shop)
    return NextResponse.redirect(`${APP_URL}/shopify?error=not_installed`)
  }

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(shop)
  } catch (e) {
    console.error('[BillingConfirm] token error for shop:', shop, e)
    return NextResponse.redirect(`${APP_URL}/shopify?error=not_installed`)
  }

  const subscription = await getSubscriptionStatus(shop, accessToken)

  if (subscription) {
    await supabaseAdmin
      .from('shopify_installations')
      .update({
        subscription_status: subscription.status.toLowerCase(),
        subscription_id: subscription.id,
      })
      .eq('shop_domain', shop)
    console.log('[BillingConfirm] ✅ Subscription active:', subscription)

    // Billing confermato → avanza l'onboarding oltre lo Step 1 (Identity),
    // MAI oltre lo step 2 (Catalog): il merchant deve vedere lo step Catalog,
    // anche se il sync automatico gira già in background, perché è lì che
    // la UI mostra lo stato "importazione in corso" / il catalogo popolato.
    // (Prima qui si saltava direttamente a step 3/Intake: bug gemello di
    // quello corretto il 27/07 in onboarding/page.tsx, stessa causa.)
    if (installation.expert_id) {
      const { data: mp } = await supabaseAdmin
        .from('merchant_profiles')
        .select('onboarding_step, onboarding_completed')
        .eq('merchant_id', installation.expert_id)
        .maybeSingle()
      if (mp && !mp.onboarding_completed && (mp.onboarding_step ?? 1) < 2) {
        await supabaseAdmin
          .from('merchant_profiles')
          .update({ onboarding_step: 2 })
          .eq('merchant_id', installation.expert_id)
        console.log('[BillingConfirm] onboarding_step -> 2 per merchant:', installation.expert_id)
      }

      // Trigger automatico: import + tagging AI dei prodotti Shopify,
      // in background, senza bloccare il redirect. Se fallisce, non deve
      // mai impedire il proseguimento dell'onboarding: il pulsante
      // "Sync products" resta disponibile come recovery manuale.
      waitUntil(
        syncAndTagProducts(installation.expert_id, shop)
          .then((result) => {
            if (!result.ok) {
              console.error('[BillingConfirm] auto-sync failed for shop:', shop, result.error)
            } else {
              console.log('[BillingConfirm] auto-sync done for shop:', shop, `tagged=${result.tagged} failed=${result.failed} total=${result.total}`)
            }
          })
          .catch((err) => {
            console.error('[BillingConfirm] auto-sync threw for shop:', shop, err)
          })
      )
    }

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
