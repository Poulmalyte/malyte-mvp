import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { loadMerchantAndProductsContext } from '@/lib/shopify-catalog'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, customer_id, purchased_product_ids } = body

    if (!merchant_id || !customer_id || !Array.isArray(purchased_product_ids) || purchased_product_ids.length === 0) {
      return NextResponse.json({ error: 'Missing merchant_id, customer_id, or purchased_product_ids' }, { status: 400 })
    }

    const { merchant, merchantProfile, productsContext, category } =
      await loadMerchantAndProductsContext(supabaseAdmin, merchant_id)

    const { data: customerProfile } = await supabaseAdmin
      .from('customer_profiles')
      .select('quiz_answers, recommendation_snapshot')
      .eq('customer_id', customer_id)
      .eq('merchant_id', merchant_id)
      .maybeSingle()

    if (!customerProfile) {
      return NextResponse.json({ error: 'Customer profile not found. Quiz must be completed first.' }, { status: 404 })
    }

    // Vincolo assoluto: SOLO i prodotti realmente acquistati possono comparire.
    const ownedProducts = productsContext.filter(p => purchased_product_ids.includes(p.id))

    if (ownedProducts.length === 0) {
      return NextResponse.json({ error: 'None of the purchased_product_ids match this merchant catalog' }, { status: 400 })
    }

    const systemPrompt = `You are a ${category} expert creating a Week 1 routine for a customer who has just purchased specific products.

Brand: ${merchant?.name || 'this brand'}
Philosophy: ${merchantProfile?.philosophy || 'Not specified'}
Tone: ${merchantProfile?.tone_of_voice || 'professional but approachable'}
Hero ingredients: ${merchantProfile?.hero_ingredients || 'Not specified'}
Avoid: ${merchantProfile?.avoid_ingredients || 'None'}

The customer's quiz answers (use these to personalise HOW the routine is explained, not WHAT products appear):
${JSON.stringify(customerProfile.quiz_answers, null, 2)}

Products the customer ACTUALLY OWNS (ONLY these may appear in the routine — this is an
absolute constraint, never include a product not in this list, regardless of what the
quiz answers might suggest would also help):
${JSON.stringify(ownedProducts, null, 2)}

CRITICAL RULES:
1. ONLY use products from the "owns" list above. Never invent or suggest products the
   customer has not purchased.
2. Build the routine around what they own — sequence, timing, and instructions should
   make the most of exactly these products.
3. Use the quiz answers to personalise tone and instructions, not to introduce products
   outside the owned list.
4. No medical or clinical claims.
5. Return ONLY valid JSON, no markdown, no backticks.`

    const userPrompt = `Create the Week 1 routine using only the owned products.

Return exactly this JSON:
{
  "headline": "Personalized headline",
  "customer_summary": "2 sentence profile summary",
  "morning_routine": [
    {
      "product_id": "catalog_item_uuid",
      "product_title": "title",
      "step_number": 1,
      "instructions": "specific instructions",
      "why": "why this product, this step"
    }
  ],
  "evening_routine": [],
  "weekly_notes": "personalized weekly advice",
  "what_changes_next_week": "preview of week 2"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let plan: any
    try { plan = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 }) }

    const enrichRoutine = (routine: any[]) => (routine || []).map(item => {
      const catalogItem = ownedProducts.find(p => p.id === item.product_id)
      return {
        ...item,
        price: catalogItem?.price || null,
        product_url: catalogItem?.product_url || null,
        image_url: catalogItem?.image_url || null,
        variant_id: catalogItem?.variant_id || null,
      }
    })

    plan.morning_routine = enrichRoutine(plan.morning_routine)
    plan.evening_routine = enrichRoutine(plan.evening_routine)

    // Salva in brand_plans. NIENTE package_data — il bundle non appartiene qui.
    const { data: savedPlan } = await supabaseAdmin
      .from('brand_plans')
      .insert({
        merchant_id,
        customer_id,
        merchant_name: merchant?.name || '',
        merchant_slug: merchant?.slug || '',
        category,
        week_number: 1,
        plan_data: plan,
        package_data: null,
        customer_summary: plan.customer_summary,
        status: 'active',
      })
      .select('id, token')
      .single()

    return NextResponse.json({
      ok: true,
      plan_token: savedPlan?.token,
      plan,
    })

  } catch (err: any) {
    console.error('generate-week1-routine error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
