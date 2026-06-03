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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { checkin_token, answers, brand_plan_id, week_number } = body

    if (!checkin_token || !answers || !brand_plan_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verifica scheduled_checkin
    const { data: scheduledCheckin } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('*')
      .eq('checkin_token', checkin_token)
      .maybeSingle()

    if (!scheduledCheckin) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    if (scheduledCheckin.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 400 })

    // Carica brand_plan
    const { data: brandPlan } = await supabaseAdmin
      .from('brand_plans')
      .select('*')
      .eq('id', brand_plan_id)
      .single()

    if (!brandPlan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const merchant_id = brandPlan.merchant_id
    const customer_id = brandPlan.customer_id
    const category = brandPlan.category || 'Skincare'
    const nextWeek = (week_number || 1) + 1

    // Carica merchant + profile
    const { data: merchant } = await supabaseAdmin
      .from('merchants').select('*').eq('id', merchant_id).single()

    const { data: merchantProfile } = await supabaseAdmin
      .from('merchant_profiles').select('*').eq('merchant_id', merchant_id).maybeSingle()

    const { data: installation } = await supabaseAdmin
      .from('shopify_installations').select('shop_domain').eq('expert_id', merchant_id).maybeSingle()

    // Carica catalog items con tag
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
      }
    })

    // Calcola adherence_score dai check-in answers
    const adherenceMap: Record<string, number> = {
      'Great — did it every day': 1.0, 'All of them': 1.0, 'Perfectly': 1.0,
      'Good — most days': 0.75, 'Most': 0.75, 'Mostly': 0.75,
      'Difficult — a few days': 0.5, 'About half': 0.5, 'Partially': 0.5,
      'Did not follow it': 0.1, 'Very few': 0.1, 'Not at all': 0.1,
    }
    const improvementMap: Record<string, number> = {
      'Yes, a lot': 5, 'High': 5, 'Great': 5,
      'A little': 4, 'Good': 4,
      'No change': 3, 'Average': 3, 'Some soreness': 3, 'Some issues': 3,
      'It got worse': 2, 'Low': 2, 'Very sore': 2,
      'Had an issue': 1, 'Bad': 1,
    }

    const adherenceScore = adherenceMap[answers.routine || answers.adherence || ''] || 0.5
    const improvementScore = improvementMap[answers.improvement || answers.energy || ''] || 3
    const hasReaction = answers.reaction && (answers.reaction.includes('irritation') || answers.reaction.includes('stopped'))

    // Salva checkin_event con dati grezzi
    await supabaseAdmin.from('checkin_events').insert({
      customer_id,
      merchant_id,
      plan_id: null,
      plan_version_id: null,
      week_number: week_number || 1,
      adherence_score: adherenceScore,
      satisfaction_score: Math.round(improvementScore),
      improvement_score: Math.round(improvementScore),
      symptoms: hasReaction ? [answers.reaction] : [],
      improvements: answers.improvement ? [answers.improvement] : [],
      free_text: answers.comment || null,
      triggered_plan_update: true,
    })

    // Genera piano aggiornato con Claude
    const systemPrompt = `You are a ${category} expert updating a customer's personalized plan based on their weekly check-in.

Brand: ${merchant?.name || 'this brand'}
Philosophy: ${merchantProfile?.philosophy || 'Not specified'}
Tone: ${merchantProfile?.tone_of_voice || 'professional but approachable'}
Hero ingredients: ${merchantProfile?.hero_ingredients || 'Not specified'}
Avoid: ${merchantProfile?.avoid_ingredients || 'None'}

Available products:
${JSON.stringify(productsContext, null, 2)}

Previous plan (Week ${week_number}):
${JSON.stringify(brandPlan.plan_data, null, 2)}

RULES:
1. ONLY recommend products from the catalog above
2. For Week ${nextWeek}: you can now introduce products with intro_week <= ${Math.min(nextWeek, 4)}
3. If customer had reactions: remove the problematic product and replace with gentler alternative
4. If customer is doing great: consider introducing one new product
5. Return ONLY valid JSON, no markdown, no backticks`

    const userPrompt = `Customer Week ${week_number} check-in answers:
${JSON.stringify(answers, null, 2)}

Adherence: ${adherenceScore * 100}%
Had reactions: ${hasReaction ? 'YES — be careful' : 'No'}

Generate the updated Week ${nextWeek} plan. Keep what's working, adjust what's not.

Return exactly this JSON:
{
  "headline": "Week ${nextWeek} plan headline",
  "week": ${nextWeek},
  "adaptation_note": "1-2 sentences explaining what changed and why based on their check-in",
  "morning_routine": [
    {
      "product_id": "catalog_item_uuid",
      "product_title": "title",
      "step_number": 1,
      "instructions": "updated instructions",
      "why": "why this product this week"
    }
  ],
  "evening_routine": [],
  "weekly_notes": "personalized advice for week ${nextWeek}",
  "what_changes_next_week": "preview of week ${nextWeek + 1}"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let newPlan: any
    try { newPlan = JSON.parse(clean) }
    catch { newPlan = brandPlan.plan_data }

    // Arricchisci routine con prezzi e URL
    const enrichRoutine = (routine: any[]) => routine.map(item => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return { ...item, price: catalogItem?.price || null, product_url: catalogItem?.product_url || null, variant_id: catalogItem?.variant_id || null }
    })

    newPlan.morning_routine = enrichRoutine(newPlan.morning_routine || [])
    newPlan.evening_routine = enrichRoutine(newPlan.evening_routine || [])

    // Salva nuovo brand_plan
    const { data: newBrandPlan } = await supabaseAdmin
      .from('brand_plans')
      .insert({
        merchant_id,
        customer_id,
        customer_email: brandPlan.customer_email,
        merchant_name: brandPlan.merchant_name,
        merchant_slug: brandPlan.merchant_slug,
        category,
        week_number: nextWeek,
        plan_data: newPlan,
        package_data: brandPlan.package_data,
        customer_summary: brandPlan.customer_summary,
        status: 'active',
      })
      .select('token')
      .single()

    const newPlanToken = newBrandPlan?.token

    // Marca scheduled_checkin come completato
    await supabaseAdmin
      .from('scheduled_checkins')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('checkin_token', checkin_token)

    // Crea next scheduled_checkin (settimana prossima)
    const nextScheduledFor = new Date()
    nextScheduledFor.setDate(nextScheduledFor.getDate() + 7)

    const checkinTemplate = CHECKIN_TEMPLATES[category] || CHECKIN_TEMPLATES['Skincare']

    await supabaseAdmin.from('scheduled_checkins').insert({
      customer_id,
      merchant_id,
      brand_plan_id: (newBrandPlan as any)?.id || brand_plan_id,
      week_number: nextWeek,
      scheduled_for: nextScheduledFor.toISOString(),
      status: 'pending',
      questions_template: checkinTemplate,
    })

    // Log eventi
    await supabaseAdmin.from('event_stream').insert([
      { merchant_id, customer_id, event_type: 'checkin_completed', event_data: { week_number, answers, adherence_score: adherenceScore } },
      { merchant_id, customer_id, event_type: 'plan_updated', event_data: { week: nextWeek, previous_week: week_number, new_plan_token: newPlanToken } },
    ])

    return NextResponse.json({
      ok: true,
      new_plan_token: newPlanToken,
      week: nextWeek,
      adaptation_note: newPlan.adaptation_note || null,
    })

  } catch (err: any) {
    console.error('submit-checkin error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}