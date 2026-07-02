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

// Scarica un PDF e lo restituisce come blocco document per l'API Anthropic.
// Ritorna null se il fetch fallisce o il file è troppo grande.
async function fetchPdfBlock(url: string, maxBytes: number): Promise<any | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > maxBytes) return null
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: buf.toString('base64'),
      },
    }
  } catch {
    return null
  }
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

    const { data: merchantProfile } = await supabaseAdmin
      .from('merchant_profiles').select('*').eq('merchant_id', merchant_id).maybeSingle()

    // FALLBACK LEGACY: i practitioner/pdf_seller registrati dal flow expert
    // esistono solo in `experts` (niente riga in `merchants`/`merchant_profiles`).
    // Se il merchant non esiste, carichiamo l'expert e usiamo i suoi campi.
    let expertLegacy: any = null
    if (!merchant || !merchantProfile) {
      const { data: expert } = await supabaseAdmin
        .from('experts').select('*').eq('id', merchant_id).maybeSingle()
      expertLegacy = expert
    }

    if (!merchant && !expertLegacy) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // Identità unificata del seller (merchants prima, experts come fallback)
    const sellerType: string = merchant?.seller_type || expertLegacy?.seller_type || 'brand'
    const isBrand = sellerType === 'brand'
    const sellerName: string = merchant?.name
      || [expertLegacy?.name, expertLegacy?.surname].filter(Boolean).join(' ')
      || 'this seller'
    const sellerSlug: string = merchant?.slug || expertLegacy?.slug || ''
    const category = merchant?.category || expertLegacy?.category || 'Skincare'
    const categoryKey = normalizeCategory(category)

    // Carica prodotti dell'ordine — supporta sia array JSON che singolo ID (legacy)
    let purchasedProductIds: string[] = []
    try {
      const parsed = JSON.parse(order.shopify_product_id)
      purchasedProductIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
    } catch {
      purchasedProductIds = order.shopify_product_id ? [String(order.shopify_product_id)] : []
    }

    // Carica catalogo (per i brand è la fonte del piano; per gli altri serve solo
    // a identificare cosa è stato acquistato, se mappato)
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

    // ─────────────────────────────────────────────────────────────
    // BRANCHING PER SELLER TYPE
    // brand        → piano costruito sui prodotti del catalogo acquistati
    // practitioner → piano costruito sulla metodologia caricata (KB + PDF)
    // pdf_seller   → piano costruito sul contenuto del PDF acquistato
    // ─────────────────────────────────────────────────────────────

    let systemPrompt: string
    let userContent: any[] // blocchi content per il messaggio user (testo + eventuali PDF)

    if (isBrand) {
      systemPrompt = `You are a ${categoryKey} expert creating a personalised routine for a customer who just purchased products from ${sellerName}.

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

      userContent = [{
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
    } else {
      // ── PRACTITIONER / PDF SELLER ──
      const sellerLabel = sellerType === 'practitioner'
        ? 'a professional practitioner'
        : 'an expert content creator selling a digital guide'

      const purchasedLabel = purchasedProducts.length > 0
        ? purchasedProducts.map(p => p.title).join(', ')
        : (sellerType === 'practitioner' ? 'a session/program' : 'a digital guide')

      // Contesto metodologia: merchant_profiles prima, experts legacy come fallback
      const methodologyParts: string[] = []
      const philosophy = merchantProfile?.philosophy || expertLegacy?.methodology_description
      if (philosophy) methodologyParts.push(`PHILOSOPHY:\n${philosophy}`)

      const methodName = expertLegacy?.methodology_name
      if (methodName) methodologyParts.push(`METHOD NAME: ${methodName}`)

      const methodStructured = merchantProfile?.method_structured || expertLegacy?.method_structured
      if (methodStructured) {
        methodologyParts.push(`STRUCTURED METHOD:\n${JSON.stringify(methodStructured, null, 2)}`)
      }

      const interview = merchantProfile?.method_interview_conversation || expertLegacy?.method_interview_conversation
      if (interview) methodologyParts.push(`METHOD INTERVIEW NOTES:\n${interview}`)

      if (merchantProfile?.routine_rules) {
        methodologyParts.push(`ROUTINE RULES:\n${JSON.stringify(merchantProfile.routine_rules, null, 2)}`)
      }

      const methodologyText = methodologyParts.length > 0
        ? methodologyParts.join('\n\n')
        : 'No structured methodology provided — rely on the attached PDF documents.'

      systemPrompt = `You are a ${categoryKey} expert creating a personalised Week 1 plan on behalf of ${sellerName}, ${sellerLabel}.

The customer just purchased: ${purchasedLabel}

Seller tone of voice: ${merchantProfile?.tone_of_voice || 'professional but approachable'}

THE SELLER'S METHODOLOGY (the plan MUST be derived exclusively from this — it is the seller's own method, the reason the customer bought from them):
${methodologyText}

CRITICAL RULES:
1. Build the plan EXCLUSIVELY from the seller's methodology above (and the attached PDF documents if present)
2. Do NOT invent or recommend purchasing any products
3. Each step is an action, practice, meal, or exercise from the methodology — set "product_id" to null and use "product_title" as the name of the step
4. "what_changes_next_week" must describe the natural progression of the program in week 2, based on the methodology
5. Return ONLY valid JSON, no markdown, no backticks`

      userContent = [{
        type: 'text',
        text: `Customer quiz answers:
${JSON.stringify(quiz_answers, null, 2)}

Create a personalised Week 1 plan based exclusively on the seller's methodology.

Return exactly this JSON:
{
  "customer_summary": "2 sentence profile summary",
  "plan": {
    "headline": "Personalised headline for their plan",
    "week": 1,
    "morning_routine": [
      {
        "product_id": null,
        "product_title": "name of the action/practice/meal/exercise",
        "step_number": 1,
        "instructions": "specific how-to instructions for this customer",
        "why": "why this matters for their specific goal"
      }
    ],
    "evening_routine": [],
    "weekly_notes": "personalised advice for week 1",
    "what_changes_next_week": "how the program progresses in week 2"
  }
}`,
      }]

      // PDF di metodologia: merchant_profiles.methodology_pdf_url (singolo)
      // oppure experts.method_pdfs_urls (array, max 3 per stare nei limiti API)
      const pdfUrls: string[] = merchantProfile?.methodology_pdf_url
        ? [merchantProfile.methodology_pdf_url]
        : (expertLegacy?.method_pdfs_urls || []).slice(0, 3)

      let totalPdfBytes = 0
      const maxTotalBytes = 10_000_000 // ~10MB complessivi
      for (const url of pdfUrls) {
        const block = await fetchPdfBlock(url, maxTotalBytes - totalPdfBytes)
        if (block) {
          totalPdfBytes += Math.ceil(block.source.data.length * 0.75)
          userContent.unshift(block)
        }
      }
    }

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

    // Arricchisci routine con URL e prezzi (solo per i brand ha senso il match col catalogo)
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
      { merchant_id, customer_id: customerId, event_type: 'followup_quiz_completed', event_data: { quiz_answers, category, seller_type: sellerType, order_token } },
      { merchant_id, customer_id: customerId, event_type: 'followup_plan_generated', event_data: { week: 1, plan_token: planToken, seller_type: sellerType } },
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
