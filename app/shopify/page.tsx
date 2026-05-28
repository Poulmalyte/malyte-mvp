import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ShopifyDashboard from './ShopifyDashboard'

export default async function ShopifyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!expert) redirect('/login')

  const { data: installation } = await supabase
    .from('shopify_installations')
    .select('*')
    .eq('expert_id', user.id)
    .maybeSingle()

  const { data: orders } = installation ? await supabase
    .from('shopify_orders')
    .select('id, status')
    .eq('shop_domain', installation.shop_domain) : { data: [] }

  const totalOrders = orders?.length || 0
  const plansGenerated = orders?.filter((o: any) => o.status === 'plan_generated').length || 0

  return (
    <ShopifyDashboard
      expertId={user.id}
      expertName={expert.name || ''}
      expert={expert}
      totalOrders={totalOrders}
      plansGenerated={plansGenerated}
      hasInstallation={!!installation}
    />
  )
}