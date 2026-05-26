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

  const { data: shopifyProduct } = await supabaseAdmin
    .from('shopify_products')
    .select('*')
    .eq('shop', order!.shop_domain)
    .eq('shopify_product_id', order!.shopify_product_id)
    .maybeSingle()

  const { data: existingPlan } = await supabaseAdmin
    .from('shopify_plans')
    .select('*')
    .eq('order_id', order!.id)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <PlanClient
      order={order!}
      shopifyProduct={shopifyProduct}
      existingPlan={existingPlan}
      token={token}
    />
  )
}