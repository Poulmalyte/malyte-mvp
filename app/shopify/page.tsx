import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ShopifyDashboard from './ShopifyDashboard'

export default async function ShopifyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shopify/login')

  // Cerca profilo expert
  let { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Se non esiste, crea automaticamente
  if (!expert) {
    const slug = `expert-${user.id.slice(0, 8)}`
    const name = user.email?.split('@')[0] || 'Expert'
    await supabase.from('profiles').upsert({
      id: user.id, name, role: 'expert',
      consent_terms: true, consent_timestamp: new Date().toISOString(),
    }, { onConflict: 'id' })
    const { data: newExpert } = await supabase.from('experts').upsert({
      id: user.id, name, slug, category: 'Wellness',
    }, { onConflict: 'id' }).select().single()
    expert = newExpert
  }

  if (!expert) redirect('/shopify/login')

  // Cerca o crea merchant
  let { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!merchant) {
    const { data: newMerchant } = await supabase
      .from('merchants')
      .upsert({
        id: user.id,
        expert_id: user.id,
        seller_type: expert.seller_type || 'practitioner',
        name: expert.name,
        slug: expert.slug,
        category: expert.category,
        is_published: expert.is_published || false,
      }, { onConflict: 'id' })
      .select()
      .single()
    merchant = newMerchant
  }

  // Cerca o crea merchant_profile
  let { data: merchantProfile } = await supabase
    .from('merchant_profiles')
    .select('*')
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (!merchantProfile) {
    const { data: newProfile } = await supabase
      .from('merchant_profiles')
      .insert({
        merchant_id: user.id,
        onboarding_step: 1,
        onboarding_completed: false,
      })
      .select()
      .single()
    merchantProfile = newProfile
  }

  // Redirect onboarding se non completato
  if (!merchantProfile?.onboarding_completed) {
    const step = merchantProfile?.onboarding_step || 1
    redirect(`/shopify/onboarding?step=${step}`)
  }

  // Dashboard normale
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