// placeholder
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import StartClient from './StartClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (!merchant) notFound()

  const { data: merchantProfile } = await supabaseAdmin
    .from('merchant_profiles')
    .select('*')
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('shop_domain')
    .eq('expert_id', merchant.id)
    .maybeSingle()

  const { data: catalogItems } = await supabaseAdmin
    .from('catalog_items')
    .select('*, catalog_item_tags(*)')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)

  return (
    <StartClient
      merchant={merchant}
      merchantProfile={merchantProfile}
      catalogItems={catalogItems || []}
      shopDomain={installation?.shop_domain || null}
    />
  )
}