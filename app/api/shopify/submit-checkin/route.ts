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

    const { data: scheduledCheckin } = await supabaseAdmin
      .from('scheduled_checkins')
      .select('*')
      .eq('checkin_token', checkin_token)
      .maybeSingle()

    if (!scheduledCheckin) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    if (scheduledCheckin.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 400 })

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

    const { count: previousCheckins } = await supabaseAdmin
      .from('brand_checkin_events')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer_id)
      .eq('merchant_id', merchant_id)
    const weekState: 'discover' | 'validate' | 'adapt' =
      (previousCheckins || 0) === 0 ? 'discover' :
      (previousCheckins || 0) === 1 ? 'validate' : 'adapt'

    const { data: merchant } = await supabaseAdmin
      .from('merchants').select('*').eq('id', merchant_id).single()

    const { data: merchantProfile } = await supabaseAdmin
      .from('merchant_profiles').select('*').eq('merchant_id', merchant_id).maybeSingle()

    const { data: installation } = await supabaseAdmin
      .from('shopify_installations').select('shop_domain').eq('expert_id', merchant_id).maybeSingle()

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
        shopify_product_id: item.shopify_product_id ? String(item.shopify_product_id) : null,
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

    // Prodotti gia' posseduti: tutti gli ordini del cliente su questo shop,
    // non solo quello che ha originato il piano. Filtra su shop_domain (NOT NULL,
    // scritto dal webhook) e non su merchant_id, che resta null sugli ordini per
    // cui il cliente non ha mai aperto il link.
    const checkinEmail = (brandPlan.customer_email || '').trim().toLowerCase()
    const ownedProductIds = new Set<string>()

    if (checkinEmail) {
      const base = supabaseAdmin
        .from('shopify_orders')
        .select('line_items, shopify_product_id, customer_email, buyer_email')
      const { data: customerOrders } = installation?.shop_domain
        ? await base.eq('shop_domain', installation.shop_domain)
        : await base.eq('merchant_id', merchant_id)

      for (const o of customerOrders || []) {
        const oEmail = (o.buyer_email || o.customer_email || '').trim().toLowerCase()
        if (oEmail !== checkinEmail) continue

        if (Array.isArray(o.line_items)) {
          for (const li of o.line_items as any[]) {
            const pid = li?.shopify_product_id ? String(li.shopify_product_id) : null
            if (!pid || ownedProductIds.has(pid)) continue
            ownedProductIds.add(pid)
          }
        } else if (o.shopify_product_id) {
          try {
            const parsed = JSON.parse(o.shopify_product_id)
            for (const pid of Array.isArray(parsed) ? parsed : [parsed]) {
              ownedProductIds.add(String(pid))
            }
          } catch {
            ownedProductIds.add(String(o.shopify_product_id))
          }
        }
      }
    }
    console.log('[submit-checkin] owned products:', ownedProductIds.size, Array.from(ownedProductIds).join(','))

    // --- CROSS-SELL: selezione candidati (fit primario, intro_week come timing secondario) ---
    const prevPlan: any = brandPlan.plan_data || {}
    const routineProductIds = new Set(
      [...(prevPlan.morning_routine || []), ...(prevPlan.evening_routine || [])]
        .map((s: any) => s?.product_id).filter(Boolean).map(String)
    )
    const lastRecommendedId = prevPlan.recommended_product_id ? String(prevPlan.recommended_product_id) : null
    const inRoutine = productsContext.filter(p => routineProductIds.has(String(p.id)))
    const coveredSteps = new Set(inRoutine.map(p => p.routine_step).filter(st => st && st !== 'other'))
    const customerObjectives: string[] = Array.from(new Set(
      inRoutine.flatMap(p => p.objectives || []).map((o: any) => String(o).toLowerCase())
    ))
    const avoidList = String(merchantProfile?.avoid_ingredients || '')
      .toLowerCase().split(/[,;]/).map(x => x.trim()).filter(Boolean)

    const scoredCandidates = productsContext
      .filter(p => !routineProductIds.has(String(p.id)))
      .filter(p => !p.shopify_product_id || !ownedProductIds.has(p.shopify_product_id))
      .filter(p => !lastRecommendedId || String(p.id) !== lastRecommendedId)
      .map(p => {
        const hero = String(p.hero_ingredients || '').toLowerCase()
        if (avoidList.length && avoidList.some(a => hero.includes(a))) return null
        let fit = 0
        if (p.routine_step && p.routine_step !== 'other' && !coveredSteps.has(p.routine_step)) fit += 4
        const objs = (p.objectives || []).map((o: any) => String(o).toLowerCase())
        const matches = objs.filter((o: string) => customerObjectives.some(c => c.includes(o) || o.includes(c)))
        if (matches.length) fit += Math.min(matches.length * 2, 6)
        if (hasReaction && (p.intro_week || 1) >= 3) fit -= 4
        const iw = p.intro_week || 1
        const timing = iw === nextWeek ? 3 : iw < nextWeek ? 1 : -Math.min(iw - nextWeek, 3)
        return { p, fit, score: fit + timing }
      })
      .filter((c): c is { p: any; fit: number; score: number } => c !== null)
      .sort((a, b) => b.score - a.score || b.fit - a.fit || String(a.p.id).localeCompare(String(b.p.id)))

    const crossSellCandidates = scoredCandidates.slice(0, 10).map(c => c.p)

    // Posseduti ma non ancora in routine: comprati in un ordine successivo a
    // quello che ha originato il piano. Non sono cross-sell (il cliente li ha
    // gia' pagati), vanno integrati negli step della settimana.
    const newlyPurchased = productsContext.filter(
      pc =>
        pc.shopify_product_id &&
        ownedProductIds.has(pc.shopify_product_id) &&
        !routineProductIds.has(String(pc.id))
    )
    console.log('[submit-checkin] owned not in routine:', newlyPurchased.length)
    console.log('[submit-checkin] cross-sell candidates:', crossSellCandidates.length, 'nextWeek:', nextWeek)

    const { error: checkinSaveError } = await supabaseAdmin.from('brand_checkin_events').insert({
      brand_plan_id,
      customer_id,
      merchant_id,
      week_number: week_number || 1,
      answers,
      adherence_score: adherenceScore,
      improvement_score: Math.round(improvementScore),
      had_reaction: !!hasReaction,
      reaction_detail: hasReaction ? answers.reaction : null,
      comment: answers.comment || null,
    })
    if (checkinSaveError) {
      console.error('[submit-checkin] brand_checkin_events insert failed:', checkinSaveError.message)
    }

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

ALREADY OWNED, NOT YET IN THE ROUTINE (bought in a later order — the customer already paid for these, they are NOT cross-sell):
${newlyPurchased.length ? JSON.stringify(newlyPurchased, null, 2) : 'None.'}

CROSS-SELL CANDIDATES (ranked, best fit first — products the customer is NOT yet using):
${crossSellCandidates.length ? JSON.stringify(crossSellCandidates, null, 2) : 'None available — do not introduce any new product this week.'}

RULES:
1. ONLY recommend products from the catalog above
2. The Week ${nextWeek} routine is built from products the customer is ALREADY using. Keep those as the core. KEEP each product's existing frequency from the previous plan unless the check-in gives a real reason to change it (a reaction, or the customer struggling with adherence). Do NOT silently turn a 2x_week product into a daily one. Steps in the previous plan without a frequency field are daily.
3. If customer had reactions: remove the problematic product and replace with a gentler one ALREADY in their routine — do not add a new purchase to fix a reaction
4. CROSS-SELL: you MAY introduce AT MOST ONE new product to buy this week, chosen ONLY from the CROSS-SELL CANDIDATES list above. That list is already ranked by fit with this customer — prefer entries near the top, but choose a lower one if it genuinely suits them better. If NONE of them is a real fit for this customer's current routine, stated needs or reported reactions, introduce NOTHING: no cross-sell is always better than a forced one. Never more than one new product per week. Set recommended_product_id to the id of the product you introduce, or null if you introduce none. When you introduce one, also write recommended_reason: 1-2 warm, specific sentences tied to something real about this customer. Never invent price, availability or links — those are resolved elsewhere.
5. NO medical or clinical claims. Never state the routine cures, treats, heals, repairs, or reduces any condition (e.g. "repairs the skin barrier", "reduces inflammation", "clears acne"). You MAY reference improvements the customer reported or that appear in the check-in/adherence data, but frame them as their reported experience, never as a clinical or medical outcome.
6. The customer already knows their profile and is mid-routine. Continue from the previous plan — do NOT reintroduce their profile or re-explain why the routine was originally chosen, unless the latest check-in indicates a major change. No "you have X skin, making you an ideal candidate" openings.
7. ALREADY OWNED products: any product in the ALREADY OWNED list must be worked into this week's morning or evening routine with real instructions and a frequency, exactly like the products carried over from the previous plan. Do NOT set recommended_product_id to one of them and do NOT describe them as something to buy: the customer already has them. If one genuinely does not fit yet (a reported reaction, or it would clash with a product already in use), leave it out and say why in adaptation_note.
8. Return ONLY valid JSON, no markdown, no backticks`

    const userPrompt = `Customer Week ${week_number} check-in answers:
${JSON.stringify(answers, null, 2)}

Adherence: ${adherenceScore * 100}%
Had reactions: ${hasReaction ? 'YES — be careful' : 'No'}

Data state: ${weekState}
Generate the updated Week ${nextWeek} plan.

Return exactly this JSON:
{
  "headline": "Week ${nextWeek} plan headline",
  "week": ${nextWeek},
  "adaptation_note": "1-2 sentences explaining what changed and why",
  "recommended_product_id": "catalog_item id of the ONE new product introduced this week, or null if none",
  "recommended_reason": "1-2 sentences, addressed to the customer, on why THIS product suits them right now based on their routine and check-in answers. null if no product is introduced. Do NOT mention price, links or availability.",
  "morning_routine": [
    {
      "product_id": "catalog_item_uuid",
      "product_title": "title",
      "step_number": 1,
      "instructions": "updated instructions",
      "why": "why this product this week",
      "frequency": "one of: daily | 2x_week | 1x_week | as_needed"
    }
  ],
  "evening_routine": [],
  "weekly_notes": "personalized advice for week ${nextWeek}",
  "what_changes_next_week": "describe ONLY how the routine itself will progress next week (deeper practice, adjusted frequency). Do NOT name or hint at any product the customer is not already using — upcoming products are revealed only at their own check-in, never anticipated"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let newPlan: any
    try { newPlan = JSON.parse(clean) }
    catch { newPlan = brandPlan.plan_data }

    const enrichRoutine = (routine: any[]) => routine.map(item => {
      const catalogItem = productsContext.find(p => p.id === item.product_id)
      return { ...item, price: catalogItem?.price || null, product_url: catalogItem?.product_url || null, variant_id: catalogItem?.variant_id || null }
    })

    // Accetta il cross-sell solo se l'id e' realmente tra i candidati proposti
    const candidateIds = new Set(crossSellCandidates.map((c: any) => String(c.id)))
    newPlan.recommended_product_id =
      newPlan?.recommended_product_id && candidateIds.has(String(newPlan.recommended_product_id))
        ? String(newPlan.recommended_product_id)
        : null

    newPlan.recommended_reason =
      newPlan.recommended_product_id && typeof newPlan.recommended_reason === 'string'
        ? newPlan.recommended_reason.trim().slice(0, 400)
        : null

    const normalizeFreq = (routine: any[]) => routine.map((st: any) => ({
      ...st,
      frequency: ['daily', '2x_week', '1x_week', 'as_needed'].includes(st?.frequency) ? st.frequency : 'daily',
    }))
    newPlan.morning_routine = normalizeFreq(newPlan.morning_routine || [])
    newPlan.evening_routine = normalizeFreq(newPlan.evening_routine || [])

    newPlan.morning_routine = enrichRoutine(newPlan.morning_routine || [])
    newPlan.evening_routine = enrichRoutine(newPlan.evening_routine || [])

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
        package_data: null,
        customer_summary: brandPlan.customer_summary,
        status: 'active',
      })
      .select('id, token')
      .single()

    const newPlanToken = newBrandPlan?.token

    await supabaseAdmin
      .from('scheduled_checkins')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('checkin_token', checkin_token)

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

    // Invia email reminder check-in via Resend
    if (brandPlan.customer_email && newPlanToken) {
      try {
        const { sendCheckinReminderEmail } = await import('@/lib/email/resend')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

        const { data: nextCheckin } = await supabaseAdmin
          .from('scheduled_checkins')
          .select('checkin_token')
          .eq('brand_plan_id', (newBrandPlan as any)?.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (nextCheckin?.checkin_token) {
          await sendCheckinReminderEmail({
            to: brandPlan.customer_email,
            brandName: brandPlan.merchant_name || 'your brand',
            checkinUrl: `${appUrl}/checkin/${nextCheckin.checkin_token}`,
            weekNumber: nextWeek,
            planUrl: `${appUrl}/routine/${newPlanToken}`,
          })
        }
      } catch (emailErr) {
        console.error('Checkin reminder email error:', emailErr)
      }
    }

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
