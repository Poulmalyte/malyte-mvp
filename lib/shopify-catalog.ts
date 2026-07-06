import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Estratto da app/api/shopify/generate-plan-and-bundle/route.ts (righe 42-97),
 * codice copiato identico, nessuna modifica di logica.
 * Carica merchant, profilo, installazione Shopify e costruisce il contesto
 * prodotti (productsContext) con tag e dati Shopify arricchiti.
 *
 * Riusabile da qualsiasi route che debba costruire lo stesso contesto
 * (già duplicato in submit-checkin e generate-followup-plan con logica
 * quasi identica — non ancora consolidato lì, solo qui per ora).
 */
export async function loadMerchantAndProductsContext(
  supabaseAdmin: SupabaseClient,
  merchant_id: string
) {
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', merchant_id)
    .single()

  const { data: merchantProfile } = await supabaseAdmin
    .from('merchant_profiles')
    .select('*')
    .eq('merchant_id', merchant_id)
    .maybeSingle()

  const { data: installation } = await supabaseAdmin
    .from('shopify_installations')
    .select('shop_domain')
    .eq('expert_id', merchant_id)
    .maybeSingle()

  const { data: catalogItems } = await supabaseAdmin
    .from('catalog_items')
    .select('*, catalog_item_tags(*)')
    .eq('merchant_id', merchant_id)
    .eq('is_active', true)

  const { data: shopifyProducts } = installation ? await supabaseAdmin
    .from('shopify_products')
    .select('shopify_product_id, shopify_variant_id, price, image_url, product_url')
    .eq('shop', installation.shop_domain) : { data: [] }

  const shopifyMap: Record<string, any> = {}
  for (const sp of shopifyProducts || []) {
    shopifyMap[sp.shopify_product_id] = sp
  }

  const productsContext = (catalogItems || []).map(item => {
    const tags = item.catalog_item_tags || []
    const getTag = (type: string) => tags.filter((t: any) => t.tag_type === type).map((t: any) => t.tag_value)
    const sp = shopifyMap[item.shopify_product_id || ''] || {}
    return {
      id: item.id,
      title: item.title,
      routine_step: getTag('routine_step')[0] || 'other',
      usage_time: getTag('usage_time')[0] || 'both',
      skin_types: getTag('skin_type'),
      objectives: getTag('objective'),
      hero_ingredients: getTag('hero_ingredient')[0] || '',
      contraindications: getTag('contraindication')[0] || '',
      intro_week: parseInt(getTag('intro_week')[0] || '1'),
      price: sp.price || null,
      variant_id: sp.shopify_variant_id || null,
      product_url: sp.product_url || null,
      image_url: sp.image_url || null,
    }
  })

  const category = merchant?.category || 'Skincare'

  return { merchant, merchantProfile, installation, productsContext, category }
}
