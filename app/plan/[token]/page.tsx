import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import PlanClient from './PlanClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: order } = await supabaseAdmin
    .from('shopify_orders')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!order) redirect('/login')

  // Il piano reale vive in brand_plans, con un token proprio e distinto da
  // quello dell'ordine. Se esiste, questa route e' solo un ponte verso
  // /routine/<token del piano>: vale per il link "View plan" della dashboard
  // e per i vecchi link /plan/... gia' inviati ai clienti.
  if (order.followup_plan_id) {
    const { data: brandPlan } = await supabaseAdmin
      .from('brand_plans')
      .select('token')
      .eq('id', order.followup_plan_id)
      .maybeSingle()

    if (brandPlan?.token) redirect(`/routine/${brandPlan.token}`)
  }

  // Nessun piano ancora generato: si resta sul placeholder esistente.
  const { data: shopifyProduct } = await supabaseAdmin
    .from('shopify_products')
    .select('*')
    .eq('shop', order.shop_domain)
    .eq('shopify_product_id', order.shopify_product_id)
    .maybeSingle()

  const { data: existingPlan } = await supabaseAdmin
    .from('shopify_plans')
    .select('*')
    .eq('order_id', order.id)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <PlanClient
      order={order}
      shopifyProduct={shopifyProduct}
      existingPlan={existingPlan}
      token={token}
    />
  )
}
