import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { loadMerchantAndProductsContext, resolveAndSaveCustomer } from '@/lib/shopify-catalog'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/**
 * Recommendation Service — endpoint isolato, NON collegato al frontend.
 *
 * Produce SOLO la raccomandazione (analisi cliente, ragionamento, prodotti,
 * perche', avvertenze). NON genera plan.morning_routine/evening_routine.
 * NON scrive in brand_plans. NON invia email. NON crea scheduled_checkins.
 *
 * Riusa loadMerchantAndProductsContext e resolveAndSaveCustomer, identiche
 * a quelle usate da generate-plan-and-bundle (che resta invariato).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, quiz_answers, customer_email } = body

    if (!merchant_id || !quiz_answers) {
      return NextResponse.json({ error: 'Missing merchant_id or quiz_answers' }, { status: 400 })
    }

    const { merchant, merchantProfile, productsContext, category } =
      await loadMerchantAndProductsContext(supabaseAdmin, merchant_id)

    const systemPrompt = `You are a ${category} expert analysing a customer's quiz answers to recommend starting products.

Brand: ${merchant?.name || 'this brand'}
Philosophy: ${merchantProfile?.philosophy || 'Not specified'}
Tone: ${merchantProfile?.tone_of_voice || 'professional but approachable'}
Hero ingredients: ${merchantProfile?.hero_ingredients || 'Not specified'}
Avoid: ${merchantProfile?.avoid_ingredients || 'None'}

Available products (ONLY recommend from this catalog, never invent products):
${JSON.stringify(productsContext, null, 2)}

CRITICAL RULES:
1. ONLY recommend products from the list above.
2. This is a RECOMMENDATION ONLY. Do NOT generate a routine, a plan, or instructions
   for daily use. That happens later, after purchase.
3. Recommend only starting products - prefer items with intro_week = 1, since this
   is the customer's very first purchase.
4. Respect contraindications and the merchant's "avoid" list strictly.
5. If the customer's answers suggest a sensitivity, allergy, or conflict with any
   product, surface it as a warning rather than silently omitting the product.
6. Return ONLY valid JSON, no markdown, no backticks.`

    const userPrompt = `Customer quiz answers:
${JSON.stringify(quiz_answers, null, 2)}

Analyse these answers and recommend the ideal starting products for this customer.

Return exactly this JSON:
{
  "customer_analysis": "2-3 sentence summary of who this customer is, based on their answers",
  "reasoning": "1-2 sentences explaining the overall logic behind this recommendation",
  "recommended_products": [
    {
      "product_id": "catalog_item_uuid",
      "product_title": "exact title from the catalog",
      "why": "why this specific product was selected for this specific customer"
    }
  ],
  "warnings": ["any warning worth surfacing, or an empty array if none"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let result: any
    try { result = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 }) }

    const enrichedProducts = (result.recommended_products || []).map((item: any) => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return {
        ...item,
        price: catalogItem?.price || null,
        product_url: catalogItem?.product_url || null,
        image_url: catalogItem?.image_url || null,
        variant_id: catalogItem?.variant_id || null,
      }
    })

    const customerId = await resolveAndSaveCustomer(supabaseAdmin, merchant_id, customer_email, quiz_answers)

    return NextResponse.json({
      ok: true,
      customer_id: customerId,
      customer_analysis: result.customer_analysis,
      reasoning: result.reasoning,
      recommended_products: enrichedProducts,
      warnings: result.warnings || [],
    })

  } catch (err: any) {
    console.error('generate-recommendation error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
