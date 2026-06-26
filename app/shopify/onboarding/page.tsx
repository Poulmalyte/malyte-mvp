import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  // Auth con client utente (legge la sessione dai cookie)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shopify/login')

  // Letture dati con client admin (bypassa RLS; filtriamo sempre per user.id)
  const admin = createAdminClient()

  const { data: merchant } = await admin
    .from('merchants')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (!merchant) redirect('/shopify')

  const { data: merchantProfile } = await admin
    .from('merchant_profiles')
    .select('*')
    .eq('merchant_id', user.id)
    .maybeSingle()
  if (merchantProfile?.onboarding_completed) redirect('/shopify')

  const { data: catalogItems } = await admin
    .from('catalog_items')
    .select('*, catalog_item_tags(*)')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  const { data: installation } = await admin
    .from('shopify_installations')
    .select('*')
    .eq('expert_id', user.id)
    .maybeSingle()

  const billingDone =
    !!installation &&
    ['active', 'pending'].includes(installation.subscription_status)

  let currentStep = parseInt(
    searchParams.step || String(merchantProfile?.onboarding_step || 1)
  )
  if (billingDone && currentStep < 3) {
    currentStep = 3
  }

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