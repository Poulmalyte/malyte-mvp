import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ShopifyDashboard from './ShopifyDashboard'

export default async function ShopifyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shopify/login')

  let { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!expert) {
    const slug = `expert-${user.id.slice(0, 8)}`
    const name = user.email?.split('@')[0] || 'Expert'
    await supabase.from('profiles').upsert({
      id: user.id,
      name,
      role: 'expert',
      consent_terms: true,
      consent_timestamp: new Date().toISOString(),
    }, { onConflict: 'id' })
    const { data: newExpert } = await supabase.from('experts').upsert({
      id: user.id,
      name,
      slug,
      category: 'Wellness',
    }, { onConflict: 'id' }).select().single()
    expert = newExpert
  }

  if (!expert) redirect('/shopify/login')

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
  const isGoogleUser = user.app_metadata?.provider === 'google'

  return (
    <ShopifyDashboard
      expertId={user.id}
      expertName={expert.name || user.email || ''}
      expert={expert}
      userEmail={user.email || ''}
      isGoogleUser={isGoogleUser}
      totalOrders={totalOrders}
      plansGenerated={plansGenerated}
      hasInstallation={!!installation}
    />
  )
}