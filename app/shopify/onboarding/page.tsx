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

  // Store connesso + subscription confermata = OAuth/billing gia' fatti.
  // 'pending' è valido: in billing di test senza carta Shopify lascia lo stato
  // PENDING dopo l'Approva. Non riportare mai l'utente allo Step 2 (Connect),
  // altrimenti si ripete il loop OAuth->billing (create/cancel subscription).
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