import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import FollowupClient from './FollowupClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function OrderFollowupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: order } = await supabaseAdmin
    .from('shopify_orders')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!order) notFound()

  // Se il piano è già stato generato, redirect al piano
  if (order.followup_plan_id) {
    const { data: brandPlan } = await supabaseAdmin
      .from('brand_plans')
      .select('token')
      .eq('id', order.followup_plan_id)
      .maybeSingle()

    if (brandPlan?.token) {
      return (
        <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>Your plan is ready</h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px' }}>You already have a personalised plan for your order.</p>
            <a href={`/routine/${brandPlan.token}`}
              style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', textDecoration: 'none' }}>
              View my plan →
            </a>
          </div>
        </div>
      )
    }
  }

  // Carica merchant
  const { data: merchant } = order.merchant_id ? await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', order.merchant_id)
    .maybeSingle() : { data: null }

  // Carica tutti i prodotti dell'ordine — supporta array JSON e singolo ID legacy
  let purchasedProductIds: string[] = []
  try {
    const parsed = JSON.parse(order.shopify_product_id)
    purchasedProductIds = Array.isArray(parsed) ? parsed : [String(parsed)]
  } catch {
    purchasedProductIds = order.shopify_product_id ? [String(order.shopify_product_id)] : []
  }

  const { data: shopifyProducts } = await supabaseAdmin
    .from('shopify_products')
    .select('*, catalog_items(*, catalog_item_tags(*))')
    .eq('shop', order.shop_domain)
    .in('shopify_product_id', purchasedProductIds)

  return (
    <FollowupClient
      order={order}
      merchant={merchant}
      shopifyProducts={shopifyProducts || []}
    />
  )
}