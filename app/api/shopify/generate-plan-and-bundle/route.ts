import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, quiz_answers, customer_email } = body

    if (!merchant_id || !quiz_answers) {
      return NextResponse.json({ error: 'Missing merchant_id or quiz_answers' }, { status: 400 })
    }

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

    const systemPrompt = `You are a ${merchant?.category || 'wellness'} expert creating a personalized plan for a customer.

Brand: ${merchant?.name || 'this brand'}
Philosophy: ${merchantProfile?.philosophy || 'Not specified'}
Tone: ${merchantProfile?.tone_of_voice || 'professional but approachable'}
Hero ingredients: ${merchantProfile?.hero_ingredients || 'Not specified'}
Avoid: ${merchantProfile?.avoid_ingredients || 'None'}

Available products (ONLY use these):
${JSON.stringify(productsContext, null, 2)}

CRITICAL RULES:
1. ONLY recommend products from the list above — never invent products
2. For Week 1: ONLY use products with intro_week = 1
3. Respect contraindications strictly
4. Package items must be ONLY intro_week = 1 products
5. Return ONLY valid JSON, no markdown, no backticks`

    const userPrompt = `Customer quiz answers:
${JSON.stringify(quiz_answers, null, 2)}

Create a personalized Week 1 plan and starter bundle.

Return exactly this JSON:
{
  "customer_summary": "2 sentence profile summary",
  "plan": {
    "headline": "Personalized headline",
    "week": 1,
    "morning_routine": [
      {
        "product_id": "catalog_item_uuid",
        "product_title": "title",
        "step_number": 1,
        "instructions": "specific instructions",
        "why": "why this product"
      }
    ],
    "evening_routine": [],
    "weekly_notes": "personalized weekly advice",
    "what_changes_next_week": "preview of week 2"
  },
  "package": {
    "package_name": "e.g. Barrier Repair Starter Routine",
    "package_type": "routine",
    "package_stage": 1,
    "items": [
      {
        "product_id": "catalog_item_uuid",
        "product_title": "title",
        "reason": "why included"
      }
    ]
  }
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let result: any
    try { result = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 }) }

    const enrichRoutine = (routine: any[]) => routine.map(item => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return {
        ...item,
        price: catalogItem?.price || null,
        product_url: catalogItem?.product_url || null,
        image_url: catalogItem?.image_url || null,
        variant_id: catalogItem?.variant_id || null,
      }
    })

    result.plan.morning_routine = enrichRoutine(result.plan.morning_routine || [])
    result.plan.evening_routine = enrichRoutine(result.plan.evening_routine || [])

    const enrichedItems = (result.package?.items || []).map((item: any) => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return {
        ...item,
        price: catalogItem?.price || null,
        product_url: catalogItem?.product_url || null,
        image_url: catalogItem?.image_url || null,
        variant_id: catalogItem?.variant_id || null,
      }
    })

    const totalPrice = enrichedItems.reduce((sum: number, item: any) => sum + (item.price || 0), 0)

    const shopDomain = installation?.shop_domain
    const cartParts = enrichedItems
      .filter((item: any) => item.variant_id)
      .map((item: any) => `${item.variant_id}:1`)
    const cartUrl = shopDomain && cartParts.length > 0
      ? `https://${shopDomain}/cart/${cartParts.join(',')}`
      : null

    result.package = {
      ...result.package,
      items: enrichedItems,
      total_price: totalPrice,
      cart_url: cartUrl,
      shop_domain: shopDomain,
    }

    // Salva customer
    let customerId: string | null = null
    if (customer_email) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('email', customer_email)
        .maybeSingle()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer } = await supabaseAdmin
          .from('customers')
          .insert({ email: customer_email })
          .select('id')
          .single()
        customerId = newCustomer?.id || null
      }

      if (customerId) {
        await supabaseAdmin
          .from('merchant_customers')
          .upsert({ merchant_id, customer_id: customerId }, { onConflict: 'merchant_id,customer_id' })

        await supabaseAdmin
          .from('customer_profiles')
          .upsert({
            customer_id: customerId,
            merchant_id,
            quiz_answers,
            version: 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'customer_id,merchant_id' })
      }
    }

    // Salva piano in brand_plans con token univoco
    const { data: savedPlan } = await supabaseAdmin
      .from('brand_plans')
      .insert({
        merchant_id,
        customer_id: customerId,
        customer_email: customer_email || null,
        merchant_name: merchant?.name || '',
        merchant_slug: merchant?.slug || '',
        category: merchant?.category || 'Skincare',
        week_number: 1,
        plan_data: result.plan,
        package_data: result.package,
        customer_summary: result.customer_summary,
        status: 'active',
      })
      .select('token')
      .single()

    const planToken = savedPlan?.token
    const planUrl = planToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'}/routine/${planToken}` : null

    // Invia email via Supabase se email fornita
    if (customer_email && planUrl) {
      try {
        await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: customer_email,
        })
        // Usa inviteUserByEmail per mandare email custom — non disponibile direttamente
        // Usiamo una edge function o semplicemente salviamo il token e lo mostriamo in UI
      } catch {
        // Email fallback — mostriamo link in UI
      }
    }

    // Log eventi
    await supabaseAdmin.from('event_stream').insert([
      { merchant_id, customer_id: customerId, event_type: 'quiz_completed', event_data: { quiz_answers, category: merchant?.category } },
      { merchant_id, customer_id: customerId, event_type: 'plan_generated', event_data: { week: 1, plan_token: planToken } },
      { merchant_id, customer_id: customerId, event_type: 'package_generated', event_data: { package_name: result.package.package_name, total_price: totalPrice, stage: 1 } },
    ])

    return NextResponse.json({
      ok: true,
      customer_id: customerId,
      customer_summary: result.customer_summary,
      plan: result.plan,
      package: result.package,
      plan_token: planToken,
      plan_url: planUrl,
    })

  } catch (err: any) {
    console.error('generate-plan-and-bundle error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}