import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { loadMerchantAndProductsContext, resolveAndSaveCustomer } from '@/lib/shopify-catalog'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchant_id, quiz_answers, customer_email } = body

    if (!merchant_id || !quiz_answers) {
      return NextResponse.json({ error: 'Missing merchant_id or quiz_answers' }, { status: 400 })
    }

    const { merchant, merchantProfile, installation, productsContext, category } =
      await loadMerchantAndProductsContext(supabaseAdmin, merchant_id)

    const systemPrompt = `You are a ${category} expert creating a personalized plan for a customer.

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
      model: 'claude-sonnet-4-6',
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
    const customerId = await resolveAndSaveCustomer(supabaseAdmin, merchant_id, customer_email, quiz_answers)

    // Salva piano in brand_plans con token univoco
    const { data: savedPlan } = await supabaseAdmin
      .from('brand_plans')
      .insert({
        merchant_id,
        customer_id: customerId,
        customer_email: customer_email || null,
        merchant_name: merchant?.name || '',
        merchant_slug: merchant?.slug || '',
        category,
        week_number: 1,
        plan_data: result.plan,
        package_data: result.package,
        customer_summary: result.customer_summary,
        status: 'active',
      })
      .select('id, token')
      .single()

    const planToken = savedPlan?.token
    const planUrl = planToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'}/routine/${planToken}` : null

    // Crea scheduled_checkin automaticamente per settimana 1
    if (savedPlan?.id) {
      const checkinScheduledFor = new Date()
      checkinScheduledFor.setDate(checkinScheduledFor.getDate() + 7)
      const template = CHECKIN_TEMPLATES[category] || CHECKIN_TEMPLATES['Skincare']

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

    // Invia email piano via Resend
    if (customer_email && planUrl) {
      try {
        const { sendPlanEmail } = await import('@/lib/email/resend')
        await sendPlanEmail({
          to: customer_email,
          brandName: merchant?.name || 'your brand',
          planUrl,
          customerSummary: result.customer_summary,
        })
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
      }
    }

    // Log eventi
    await supabaseAdmin.from('event_stream').insert([
      { merchant_id, customer_id: customerId, event_type: 'quiz_completed', event_data: { quiz_answers, category } },
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
