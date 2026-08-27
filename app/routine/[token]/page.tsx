import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import RoutineCards from './RoutineCards'
import CrossSellCard from './CrossSellCard'
import { fetchShopLogo } from '@/lib/shop-logo'

// TEMPORANEO: costante fissa finche il totale settimane non diventa dinamico
const TEMP_TOTAL_WEEKS = 12

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RoutinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: brandPlan } = await supabaseAdmin
    .from('brand_plans')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!brandPlan) notFound()

  const plan = brandPlan.plan_data
  const pkg = brandPlan.package_data
  const brandName = brandPlan.merchant_name || 'Your Brand'
  const category = brandPlan.category || 'Skincare'

  // --- Logo del brand -------------------------------------------------
  // Letto dalla Storefront API in tokenless access e messo in cache su
  // shopify_installations. Se manca (merchant headless, brand asset non
  // compilata, canale bloccato) si ricade sul wordmark testuale.
  const { data: order } = await supabaseAdmin
    .from('shopify_orders')
    .select('shop_domain, shop')
    .eq('followup_plan_id', brandPlan.id)
    .maybeSingle()

  const shopDomain = order?.shop_domain || order?.shop || null

  let logo: { url: string; width: number | null; height: number | null } | null = null

  if (shopDomain) {
    const { data: install } = await supabaseAdmin
      .from('shopify_installations')
      .select('shop_logo_url, shop_logo_width, shop_logo_height, shop_logo_checked_at')
      .eq('shop_domain', shopDomain)
      .maybeSingle()

    const STALE_MS = 7 * 24 * 60 * 60 * 1000
    const isStale =
      !install?.shop_logo_checked_at ||
      Date.now() - new Date(install.shop_logo_checked_at).getTime() > STALE_MS

    if (install?.shop_logo_url && !isStale) {
      logo = {
        url: install.shop_logo_url,
        width: install.shop_logo_width,
        height: install.shop_logo_height,
      }
    } else if (isStale) {
      const fresh = await fetchShopLogo(shopDomain)
      logo = fresh
      // cache anche il null: evita di richiamare Shopify a ogni render
      await supabaseAdmin
        .from('shopify_installations')
        .update({
          shop_logo_url: fresh?.url ?? null,
          shop_logo_width: fresh?.width ?? null,
          shop_logo_height: fresh?.height ?? null,
          shop_logo_checked_at: new Date().toISOString(),
        })
        .eq('shop_domain', shopDomain)
    }
  }
  // --------------------------------------------------------------------

  // Nessun dato reale di completamento giornaliero esiste ancora nel sistema.
  // Questo componente mostra solo il numero di step previsti oggi (dato reale).
  // L'arco colorato di progresso e' predisposto ma non attivo: da collegare quando
  // esistera' un tracking reale del completamento.
  // --- Cross-sell -----------------------------------------------------
  // Dal plan_data arrivano SOLO l'id e la motivazione. Titolo, prezzo,
  // immagine e destinazione sono sempre risolti dal catalogo a render-time:
  // se il merchant disattiva il prodotto la card sparisce da sola.
  let crossSell: {
    productId: string; title: string; reason: string | null
    price: number | null; imageUrl: string | null; currency: string
  } | null = null

  const recoId = plan?.recommended_product_id ? String(plan.recommended_product_id) : null
  if (recoId) {
    const { data: ci } = await supabaseAdmin
      .from('catalog_items')
      .select('id, title, shopify_product_id, is_active')
      .eq('id', recoId)
      .eq('merchant_id', brandPlan.merchant_id)
      .maybeSingle()

    if (ci?.is_active && ci.shopify_product_id) {
      let csShop = shopDomain
      if (!csShop) {
        const { data: inst } = await supabaseAdmin
          .from('shopify_installations')
          .select('shop_domain')
          .eq('expert_id', brandPlan.merchant_id)
          .maybeSingle()
        csShop = inst?.shop_domain || null
      }
      if (csShop) {
        const { data: csInstall } = await supabaseAdmin
          .from('shopify_installations')
          .select('currency')
          .eq('shop_domain', csShop)
          .maybeSingle()
        const csCurrency = csInstall?.currency || 'EUR'
        const { data: sp } = await supabaseAdmin
          .from('shopify_products')
          .select('price, image_url, product_url')
          .eq('shop', csShop)
          .eq('shopify_product_id', ci.shopify_product_id)
          .maybeSingle()
        // Senza product_url non mostriamo nulla: meglio nessuna card
        // che una CTA che non porta da nessuna parte.
        if (sp?.product_url) {
          crossSell = {
            productId: ci.id,
            title: ci.title,
            reason: plan?.recommended_reason || null,
            price: sp.price ?? null,
            imageUrl: sp.image_url ?? null,
            currency: csCurrency,
          }
        }
      }
    }
  }
  // --------------------------------------------------------------------

  const TodayRing = ({ morningCount, eveningCount }: { morningCount: number, eveningCount: number }) => {
    const totalSteps = morningCount + eveningCount
    const radius = 78
    const strokeWidth = 10

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 28px' }}>
        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <svg width={180} height={180} viewBox="0 0 180 180">
            <circle cx={90} cy={90} r={radius} fill="none" stroke="#E5E5EA" strokeWidth={strokeWidth} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 40, fontWeight: 800, color: '#1C1C1E', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{totalSteps}</p>
            <p style={{ fontSize: 12, color: '#8E8E93', margin: '2px 0 0' }}>step{totalSteps !== 1 ? 's' : ''} this week</p>
          </div>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', margin: '16px 0 2px' }}>Keep going.</p>
        <p style={{ fontSize: 13, color: '#8E8E93', margin: 0 }}>You're building consistency.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0', display: 'flex', alignItems: 'center', minHeight: 32 }}>
          {logo?.url ? (
            <img
              src={`${logo.url}${logo.url.includes('?') ? '&' : '?'}width=240`}
              alt={brandName}
              height={28}
              width={logo.width && logo.height ? Math.round(28 * (logo.width / logo.height)) : undefined}
              style={{ height: 28, width: 'auto', maxWidth: 180, display: 'block', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>{brandName}</span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Greeting - niente Day X, niente countdown, niente durata programma */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px', fontFamily: "'Satoshi', sans-serif" }}>
            Welcome back 👋
          </h1>
          <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>Week {brandPlan.week_number}</p>
        </div>

        {/* Today Ring - mostra solo il numero di step previsti oggi (dato reale).
            L'arco di progresso e' predisposto ma NON attivo: nessun dato reale di
            completamento giornaliero esiste ancora. Da collegare piu' avanti. */}
        <TodayRing morningCount={plan?.morning_routine?.length || 0} eveningCount={plan?.evening_routine?.length || 0} />

        {/* Coach Note — dashboard v2: stessi dati di Hero + Weekly notes, sola presentazione nuova */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F0F0F0', padding: '24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B6EF5, #9B8AFB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(brandName || 'M').charAt(0).toUpperCase()}
            </div>

            <p style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Week {brandPlan.week_number} plan
            </p>

            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3, color: '#1C1C1E', maxWidth: 440 }}>
              {plan?.headline || `Your ${category} Routine`}
            </h1>

            {brandPlan.week_number === 1 && brandPlan.customer_summary && (
              <p style={{ fontSize: 14, color: '#3C3C43', margin: 0, lineHeight: 1.6, maxWidth: 440 }}>
                {brandPlan.customer_summary}
              </p>
            )}

            {plan?.weekly_notes && (
              <p style={{ fontSize: 14, color: '#3C3C43', margin: '4px 0 0', lineHeight: 1.6, maxWidth: 440 }}>
                {plan.weekly_notes}
              </p>
            )}
          </div>
        </div>

        {/* Today's Routine - Routine Cards espandibili (client component) */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', fontFamily: "'Satoshi', sans-serif" }}>
            This Week's Routine
          </p>
          <p style={{ fontSize: 14, color: '#8E8E93', margin: '0 0 12px', lineHeight: 1.5 }}>
            Follow these steps every day, morning and evening.
          </p>
          <RoutineCards token={token} morningRoutine={plan?.morning_routine || []} eveningRoutine={plan?.evening_routine || []} />
        </div>

        {crossSell && (
          <CrossSellCard
            token={token}
            productId={crossSell.productId}
            title={crossSell.title}
            reason={crossSell.reason}
            price={crossSell.price}
            imageUrl={crossSell.imageUrl}
            currency={crossSell.currency}
          />
        )}


        {/* Evolution - timeline verticale, orienta senza dare idea di fine percorso.
            Usa brandPlan.week_number (dato reale). Nessun totale, nessuna "fine". */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F0F0F0', padding: '28px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', margin: '0 0 22px', textAlign: 'center' }}>Your journey continues</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {[0, 1, 2].map((offset, i) => {
              const weekLabel = brandPlan.week_number + offset
              const isCurrent = offset === 0
              return (
                <div key={offset} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: isCurrent ? 12 : 8, height: isCurrent ? 12 : 8, borderRadius: '50%',
                      background: isCurrent ? '#5B6EF5' : '#D1D1D6', flexShrink: 0,
                    }} />
                    <p style={{
                      fontSize: 14, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#1C1C1E' : '#8E8E93', margin: 0,
                    }}>
                      Week {weekLabel}{isCurrent ? ' — you are here' : ''}
                    </p>
                  </div>
                  {i < 2 && <div style={{ width: 1, height: 22, background: '#E5E5EA', margin: '4px 0' }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer white-label */}
        <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
          <p style={{ fontSize: 12, color: '#8E8E93', margin: '0 0 4px', fontWeight: 500 }}>
            {brandName}
          </p>
          <p style={{ fontSize: 12, color: '#8E8E93', margin: 0 }}>
            Powered by{' '}
            <a href="https://www.malyte.com/shopify/home" target="_blank" rel="noopener noreferrer" style={{ color: '#5B6EF5', textDecoration: 'none', fontWeight: 600 }}>
              Malyte
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
