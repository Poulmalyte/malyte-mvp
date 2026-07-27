import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/shopify-token'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface ShopifyProduct {
  id: string
  shopify_product_id: string
  shopify_product_title: string
  pdf_path: string | null
  questions: any[]
}

async function tagProduct(product: ShopifyProduct, category: string): Promise<any> {
  const prompt = `You are an expert in ${category} products. Analyze this product and return ONLY a valid JSON object with no preamble, no markdown, no backticks.

Product title: ${product.shopify_product_title}
Merchant category: ${category}

Return exactly this JSON structure:
{
  "routine_step": "one of: cleanser | toner | serum | moisturizer | spf | treatment | mask | eye | supplement | other",
  "usage_time": "one of: morning | evening | both",
  "skin_types": ["array of: dry | oily | combination | sensitive | normal | acne-prone"],
  "objectives": ["array of: hydration | anti-age | brightening | acne | barrier-repair | soothing | firming | exfoliation | protection | other"],
  "hero_ingredients": "main active ingredients as a short string, or empty string if unknown",
  "contraindications": "what not to combine with, or empty string if none",
  "intro_week": 1,
  "confidence_score": 0.85
}

Rules:
- intro_week: 1 for basic/gentle products, 2-3 for active ingredients, 4 for strong actives like retinol
- confidence_score: 0.0-1.0 based on how confident you are from the product title alone
- If category is not skincare, adapt routine_step and objectives accordingly
- Return ONLY the JSON object, nothing else`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

async function processBatch(
  products: ShopifyProduct[],
  merchantId: string,
  category: string
): Promise<{ tagged: number; failed: number }> {
  let tagged = 0
  let failed = 0

  for (const product of products) {
    try {
      // Crea o trova catalog_item
      const { data: existingItem } = await supabaseAdmin
        .from('catalog_items')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('shopify_product_id', product.shopify_product_id)
        .maybeSingle()

      let catalogItemId = existingItem?.id

      if (!catalogItemId) {
        const { data: newItem } = await supabaseAdmin
          .from('catalog_items')
          .insert({
            merchant_id: merchantId,
            shopify_product_id: product.shopify_product_id,
            title: product.shopify_product_title,
            is_active: true,
            ai_tagged: false,
          })
          .select('id')
          .single()
        catalogItemId = newItem?.id
      }

      if (!catalogItemId) { failed++; continue }

      // Tagga con Claude
      const tags = await tagProduct(product, category)

      // Elimina tag AI esistenti (per ri-taggare)
      await supabaseAdmin
        .from('catalog_item_tags')
        .delete()
        .eq('catalog_item_id', catalogItemId)
        .eq('source', 'ai')

      // Inserisci nuovi tag
      const tagRows: any[] = []

      if (tags.routine_step) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'routine_step',
          tag_value: tags.routine_step,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      if (tags.usage_time) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'usage_time',
          tag_value: tags.usage_time,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      for (const st of tags.skin_types || []) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'skin_type',
          tag_value: st,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      for (const obj of tags.objectives || []) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'objective',
          tag_value: obj,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      if (tags.hero_ingredients) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'hero_ingredient',
          tag_value: tags.hero_ingredients,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      if (tags.contraindications) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'contraindication',
          tag_value: tags.contraindications,
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      if (tags.intro_week) {
        tagRows.push({
          catalog_item_id: catalogItemId,
          merchant_id: merchantId,
          tag_type: 'intro_week',
          tag_value: String(tags.intro_week),
          source: 'ai',
          confidence_score: tags.confidence_score,
        })
      }

      if (tagRows.length > 0) {
        await supabaseAdmin.from('catalog_item_tags').insert(tagRows)
      }

      // Aggiorna catalog_item come taggato
      await supabaseAdmin
        .from('catalog_items')
        .update({
          ai_tagged: true,
          tag_schema_version: 'v1',
          updated_at: new Date().toISOString(),
        })
        .eq('id', catalogItemId)

      tagged++

      // Pausa tra prodotti per evitare rate limit
      await new Promise(r => setTimeout(r, 300))

    } catch (err) {
      console.error(`Failed to tag product ${product.shopify_product_id}:`, err)
      failed++
    }
  }

  return { tagged, failed }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Garantisci la riga merchants (brand appena onboardato potrebbe non averla ancora)
    let { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('category, name, slug')
      .eq('id', user.id)
      .maybeSingle()
    if (!merchant) {
      const { data: expert } = await supabaseAdmin
        .from('experts').select('name, slug, category').eq('id', user.id).maybeSingle()
      await supabaseAdmin.from('merchants').upsert({
        id: user.id,
        expert_id: user.id,
        seller_type: 'brand',
        name: expert?.name || 'My Brand',
        slug: expert?.slug || ('brand-' + user.id.slice(0, 8)),
        category: expert?.category || null,
        is_published: true,
      }, { onConflict: 'id' })
      merchant = { category: expert?.category || null, name: expert?.name || null, slug: expert?.slug || null }
    }
    const category = merchant?.category || 'Skincare'

    // Carica installation per il shop domain
    const { data: installation } = await supabaseAdmin
      .from('shopify_installations')
      .select('shop_domain')
      .eq('expert_id', user.id)
      .maybeSingle()

    if (!installation) {
      return NextResponse.json({ error: 'No Shopify store connected' }, { status: 400 })
    }

    // Importa i prodotti dallo store Shopify (popola shopify_products)
    // Token sempre valido tramite helper (refresh automatico se scaduto).
    try {
      const accessToken = await getValidAccessToken(installation.shop_domain)
      const shopRes = await fetch(`https://${installation.shop_domain}/admin/api/2026-04/products.json?limit=250`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      })
      const shopData = await shopRes.json()
      const shopProducts = shopData.products || []
      console.log('[TagProducts] imported from Shopify:', shopProducts.length, 'status:', shopRes.status)
      for (const sp of shopProducts) {
        const v = sp.variants?.[0]; const img = sp.images?.[0]
        await supabaseAdmin.from('shopify_products').upsert({
          shop: installation.shop_domain,
          shopify_product_id: String(sp.id),
          shopify_product_title: sp.title,
          shopify_variant_id: v ? String(v.id) : null,
          price: v?.price ? parseFloat(v.price) : null,
          image_url: img?.src || null,
          product_url: `https://${installation.shop_domain}/products/${sp.handle}`,
          archived_at: null,
        }, { onConflict: 'shop,shopify_product_id' })
      }
    } catch (e) {
      console.error('[TagProducts] Shopify import error:', e)
    }
    // Carica prodotti Shopify (ora popolati)
    const { data: products } = await supabaseAdmin
      .from('shopify_products')
      .select('*')
      .eq('shop', installation.shop_domain)
      .is('archived_at', null)

    if (!products || products.length === 0) {
      return NextResponse.json({ ok: true, tagged: 0, failed: 0, total: 0 })
    }

    // Processa in batch da 5
    const batchSize = 5
    let totalTagged = 0
    let totalFailed = 0

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      const { tagged, failed } = await processBatch(batch, user.id, category)
      totalTagged += tagged
      totalFailed += failed
    }

    // Log evento stream
    await supabaseAdmin.from('event_stream').insert({
      merchant_id: user.id,
      event_type: 'catalog_tagged',
      event_data: {
        total: products.length,
        tagged: totalTagged,
        failed: totalFailed,
        category,
      },
    })

    return NextResponse.json({
      ok: true,
      tagged: totalTagged,
      failed: totalFailed,
      total: products.length,
    })

  } catch (err: any) {
    console.error('tag-products error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
