import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shopify/login')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!merchant) redirect('/shopify')

  const { data: merchantProfile } = await supabase
    .from('merchant_profiles')
    .select('*')
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (merchantProfile?.onboarding_completed) redirect('/shopify')

  // Carica catalog_items se esistono (per step 2)
  const { data: catalogItems } = await supabase
    .from('catalog_items')
    .select('*, catalog_item_tags(*)')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  const { data: installation } = await supabase
    .from('shopify_installations')
    .select('*')
    .eq('expert_id', user.id)
    .maybeSingle()

  const currentStep = parseInt(searchParams.step || String(merchantProfile?.onboarding_step || 1))

  return (
    <OnboardingWizard
      merchant={merchant}
      merchantProfile={merchantProfile}
      catalogItems={catalogItems || []}
      installation={installation}
      userEmail={user.email || ''}
      initialStep={currentStep}
    />
  )
}