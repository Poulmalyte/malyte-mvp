import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CHECKIN_TEMPLATES: Record<string, any[]> = {
  Skincare: [
    { id: 'routine', text: 'How did your routine go this week?', type: 'select', options: ['Great — did it every day', 'Good — most days', 'Difficult — a few days', 'Did not follow it'] },
    { id: 'improvement', text: 'Have you noticed any improvements?', type: 'select', options: ['Yes, a lot', 'A little', 'No change', 'It got worse'] },
    { id: 'reaction', text: 'Any reactions or irritations?', type: 'select', options: ['None at all', 'Slight redness', 'Some irritation', 'Yes, I stopped a product'] },
    { id: 'comment', text: 'Anything else you want to share?', type: 'text' },
  ],
  Fitness: [
    { id: 'adherence', text: 'How many sessions did you complete?', type: 'select', options: ['All of them', 'Most', 'About half', 'Very few'] },
    { id: 'energy', text: 'How was your energy level?', type: 'select', options: ['High', 'Good', 'Average', 'Low'] },
    { id: 'soreness', text: 'How was your recovery?', type: 'select', options: ['Great', 'Some soreness', 'Very sore', 'Had an issue'] },
    { id: 'comment', text: 'Anything else?', type: 'text' },
  ],
  Nutrition: [
    { id: 'adherence', text: 'How well did you follow the protocol?', type: 'select', options: ['Perfectly', 'Mostly', 'Partially', 'Not at all'] },
    { id: 'digestion', text: 'How was your digestion?', type: 'select', options: ['Great', 'Good', 'Some issues', 'Bad'] },
    { id: 'energy', text: 'How was your energy?', type: 'select', options: ['High', 'Good', 'Average', 'Low'] },
    { id: 'comment', text: 'Anything else?', type: 'text' },
  ],
}

// Normalizza la categoria per il lookup dei template ('nutrition' -> 'Nutrition')
function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw || 'Skincare').trim()
  return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_token, quiz_answers } = body

    if (!order_token || !quiz_answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Carica ordine
    const { data: order } = await supabaseAdmin
      .from('shopify_orders')
      .select('*')
      .eq('token', order_token)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.followup_plan_id) return NextResponse.json({ error: 'Plan already generated' }, { status: 400 })

    const shop = order.shop_domain

    // Carica merchant
    const { data: installation } = await supabaseAdmin
      .from('shopify_installations')
      .select('expert_id, shop_domain')
      .eq('shop_domain', shop)
      .maybeSingle()

    const merchant_id = installation?.expert_id || order.merchant_id
    if (!merchant_id) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })

    const { data: merchant } = await supabaseAdmin
      .from('merchants').select('*').eq('id', merchant_id).maybeSingle()

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const { data: merchantProfile } = await supabaseAdmin
      .from('merchant_profiles').select('*').eq('merchant_id', merchant_id).maybeSingle()

    // Identità del seller — percorso unico: brand Shopify
    const sellerName: string = merchant.name || 'this seller'
    const sellerSlug: string = merchant.slug || ''
    const category = merchant.category || 'Skincare'
    const categoryKey = normalizeCategory(category)

    // Carica prodotti dell'ordine — supporta sia array JSON che singolo ID (legacy)
    let purchasedProductIds: string[] = []
    try {
      const parsed = JSON.parse(order.shopify_product_id)
      purchasedProductIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
    } catch {
      purchasedProductIds = order.shopify_product_id ? [String(order.shopify_product_id)] : []
    }

    // Carica catalogo — è la fonte del piano
    const { data: catalogItems } = await supabaseAdmin
      .from('catalog_items')
      .select('*, catalog_item_tags(*)')
      .eq('merchant_id', merchant_id)
      .eq('is_active', true)

    const { data: shopifyProducts } = await supabaseAdmin
      .from('shopify_products')
      .select('shopify_product_id, shopify_variant_id, price, image_url, product_url')
      .eq('shop', shop)

    const shopifyMap: Record<string, any> = {}
    for (const sp of shopifyProducts || []) shopifyMap[sp.shopify_product_id] = sp

    const productsContext = (catalogItems || []).map(item => {
      const tags = item.catalog_item_tags || []
      const getTag = (type: string) => tags.filter((t: any) => t.tag_type === type).map((t: any) => t.tag_value)
      const sp = shopifyMap[item.shopify_product_id || ''] || {}
      return {
        id: item.id,
        title: item.title,
        routine_step: getTag('routine_step')[0] || 'other',
        usage_time: getTag('usage_time')[0] || 'both',
        objectives: getTag('objective'),
        hero_ingredients: getTag('hero_ingredient')[0] || '',
        contraindications: getTag('contraindication')[0] || '',
        intro_week: parseInt(getTag('intro_week')[0] || '1'),
        price: sp.price || null,
        variant_id: sp.shopify_variant_id || null,
        product_url: sp.product_url || null,
        already_purchased: purchasedProductIds.includes(item.shopify_product_id || ''),
      }
    })

    const purchasedProducts = productsContext.filter(p => p.already_purchased)
    const complementaryProducts = productsContext.filter(p => !p.already_purchased)

    const systemPrompt = `You are a ${categoryKey} expert creating a personalised routine for a customer who just purchased products from ${sellerName}.

Brand: ${sellerName}
Philosophy: ${merchantProfile?.philosophy || 'Not specified'}
Tone: ${merchantProfile?.tone_of_voice || 'professional but approachable'}

PRODUCTS THE CUSTOMER ALREADY PURCHASED (build the Week 1 routine around these):
${JSON.stringify(purchasedProducts, null, 2)}

COMPLEMENTARY PRODUCTS available for future weeks:
${JSON.stringify(complementaryProducts, null, 2)}

CRITICAL RULES:
1. Week 1 plan MUST use ONLY the products already purchased
2. Do NOT suggest purchasing anything in Week 1
3. "what_changes_next_week" must describe ONLY the natural progression of the routine in week 2 (how the practice deepens). Do NOT name, suggest, or hint at any product the customer has not purchased — complementary products are introduced later, at the next check-in, never anticipated here
4. NO medical or clinical claims. Never state the routine cures, treats, heals, repairs, or reduces any condition (e.g. "repairs the skin barrier", "reduces inflammation", "clears acne"). Frame everything as cosmetic care and how things feel, not as a medical outcome.
5. RESPECT the customer's stated sensitivities and allergies from their quiz answers. If they mention avoiding an ingredient, fragrance, or allergen, never recommend a step or product that conflicts with it, and reflect that care in the instructions.
6. NEVER invent numbers, percentages, scores, or metrics. Only reference facts present in the products or the customer's own answers. This is Week 1 — do NOT claim any progress or improvement, there is no data yet.
7. Warm, personal tone — write like a knowledgeable friend who read their answers. Encouragement must be tied to a real detail they gave, not empty ("great job!"). Recognition comes from specificity.
8. Return ONLY valid JSON, no markdown, no backticks`

    const userContent: any[] = [{
      type: 'text',
      text: `Customer quiz answers:
${JSON.stringify(quiz_answers, null, 2)}

Create a personalised Week 1 plan using ONLY the products they already purchased.

Return exactly this JSON:
{
  "customer_summary": "2 sentence profile summary",
  "plan": {
    "headline": "Personalised headline for their routine",
    "week": 1,
    "morning_routine": [
      {
        "product_id": "catalog_item_uuid or null if not in catalog",
        "product_title": "exact product title",
        "step_number": 1,
        "instructions": "specific how-to instructions for this customer",
        "why": "why this matters for their specific goal"
      }
    ],
    "evening_routine": [],
    "weekly_notes": "personalised advice for week 1",
    "what_changes_next_week": "how the routine progresses in week 2 — progression only, NO product names or purchase hints"
  }
}`,
    }]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const textBlock = response.content.find((b: any) => b.type === 'text') as any
    const text = textBlock?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()

    let result: any
    try { result = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 }) }

    // Arricchisci routine con URL e prezzi dal catalogo
    const enrichRoutine = (routine: any[]) => routine.map(item => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return {
        ...item,
        price: catalogItem?.price || null,
        product_url: catalogItem?.product_url || null,
        already_purchased: true,
      }
    })

    result.plan.morning_routine = enrichRoutine(result.plan.morning_routine || [])
    result.plan.evening_routine = enrichRoutine(result.plan.evening_routine || [])

    // Salva customer
    let customerId: string | null = null
    const customerEmail = order.buyer_email || order.customer_email
    if (customerEmail) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers').select('id').eq('email', customerEmail).maybeSingle()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer } = await supabaseAdmin
          .from('customers').insert({ email: customerEmail }).select('id').single()
        customerId = newCustomer?.id || null
      }

      if (customerId) {
        await supabaseAdmin
          .from('merchant_customers')
          .upsert({ merchant_id, customer_id: customerId }, { onConflict: 'merchant_id,customer_id' })
      }
    }

    // Salva brand_plan
    const { data: savedPlan } = await supabaseAdmin
      .from('brand_plans')
      .insert({
        merchant_id,
        customer_id: customerId,
        customer_email: customerEmail || null,
        merchant_name: sellerName,
        merchant_slug: sellerSlug,
        category,
        week_number: 1,
        plan_data: result.plan,
        package_data: null,
        customer_summary: result.customer_summary,
        status: 'active',
      })
      .select('id, token')
      .single()

    const planToken = savedPlan?.token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
    const planUrl = planToken ? `${appUrl}/routine/${planToken}` : null

    // Crea scheduled_checkin automatico
    if (savedPlan?.id) {
      const checkinScheduledFor = new Date()
      checkinScheduledFor.setDate(checkinScheduledFor.getDate() + 7)
      const template = CHECKIN_TEMPLATES[categoryKey] || CHECKIN_TEMPLATES['Skincare']

      await supabaseAdmin.from('scheduled_checkins').insert({
        customer_id: customerId,
        merchant_id,
        brand_plan_id: savedPlan.id,
        week_number: 1,
        scheduled_for: checkinScheduledFor.toISOString(),
        status: 'pending',
        questions_template: template,
      })
    }

    // Aggiorna shopify_order con followup_plan_id
    await supabaseAdmin
      .from('shopify_orders')
      .update({
        followup_plan_id: savedPlan?.id || null,
        merchant_id,
      })
      .eq('token', order_token)

    // Log eventi
    await supabaseAdmin.from('event_stream').insert([
      { merchant_id, customer_id: customerId, event_type: 'followup_quiz_completed', event_data: { quiz_answers, category, seller_type: 'brand', order_token } },
      { merchant_id, customer_id: customerId, event_type: 'followup_plan_generated', event_data: { week: 1, plan_token: planToken, seller_type: 'brand' } },
    ])

    return NextResponse.json({
      ok: true,
      plan_token: planToken,
      plan_url: planUrl,
    })

  } catch (err: any) {
    console.error('generate-followup-plan error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}