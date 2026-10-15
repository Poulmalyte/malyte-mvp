import { createAdminClient } from '@/lib/supabase-admin'
import {
  ONBOARDING_MODEL,
  ONBOARDING_SYSTEM_PROMPT,
  buildOnboardingPrompt,
  isInControlGroup,
  parseModelJson,
  pickPrimaryProduct,
  sanitizeUsageGuide,
  type CatalogItem,
  type CycleInput,
  type OnboardingOutput,
  type PurchasedItem,
  type QuestionSpec,
} from './engine'
import { loadNicheProfiles } from './profiles'
import { callModel } from './ai'
import { sendCycleWelcomeEmail } from '@/lib/email/cycle-email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

/** What a cycle step stores in cycle_steps.content. */
export type WelcomeStepContent = {
  kind: 'welcome'
  primaryProductId: string
  onboarding: OnboardingOutput
  fixedQuestionIds: { goal?: string; frequency?: string; progress?: string }
}

export type StartJourneyResult =
  | { ok: true; journeyId: string; controlGroup: boolean; skipped?: string }
  | { ok: false; reason: string }

type ShopifyLineItem = {
  product_id?: number | string | null
  title?: string | null
  variant_title?: string | null
  price?: string | null
  quantity?: number | null
}

type ShopifyOrderPayload = {
  id: number | string
  name?: string | null
  order_number?: number | string | null
  customer_locale?: string | null
  customer?: { first_name?: string | null } | null
  line_items?: ShopifyLineItem[]
}

/**
 * Starts a consumption-cycle journey for a paid order of a brand in "cycle" mode:
 * welcome email with a usage guide for every product + the goal question.
 * Never throws: on failure returns { ok: false } so the webhook can fall back
 * to the classic follow-up email and the customer is never left without an email.
 */
export async function startCycleJourney(params: {
  shop: string
  order: ShopifyOrderPayload
  merchantId: string
  buyerEmail: string
}): Promise<StartJourneyResult> {
  const supabase = createAdminClient()
  const { shop, order, merchantId, buyerEmail } = params

  try {
    // 1. Order row saved by the webhook
    const { data: orderRow } = await supabase
      .from('shopify_orders')
      .select('id, token')
      .eq('shop_domain', shop)
      .eq('shopify_order_id', String(order.id))
      .maybeSingle()
    if (!orderRow) return { ok: false, reason: 'order_row_not_found' }

    // 2. Idempotency: Shopify can deliver the same webhook more than once
    const { data: existing } = await supabase
      .from('cycle_journeys')
      .select('id, in_control_group')
      .eq('order_id', orderRow.id)
      .maybeSingle()
    if (existing) return { ok: true, journeyId: existing.id, controlGroup: existing.in_control_group, skipped: 'already_started' }

    // 3. Customer (global table, linked to the merchant) — same pattern as generate-followup-plan
    let customerId: string | null = null
    const { data: existingCustomer } = await supabase.from('customers').select('id').eq('email', buyerEmail).maybeSingle()
    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer } = await supabase.from('customers').insert({ email: buyerEmail }).select('id').single()
      customerId = newCustomer?.id || null
    }
    if (customerId) {
      await supabase
        .from('merchant_customers')
        .upsert({ merchant_id: merchantId, customer_id: customerId }, { onConflict: 'merchant_id,customer_id' })
    }

    const language = (order.customer_locale || 'en').trim() || 'en'

    // 4. Control group: ~10% of each brand's customers get no cycle emails (measures Malyte's impact)
    const inControl = isInControlGroup(merchantId, customerId || buyerEmail)
    if (inControl) {
      const { data: j } = await supabase
        .from('cycle_journeys')
        .insert({ order_id: orderRow.id, merchant_id: merchantId, customer_id: customerId, in_control_group: true, language })
        .select('id')
        .single()
      await supabase.from('shopify_orders').update({ status: 'cycle_control_group' }).eq('id', orderRow.id)
      await supabase.from('event_stream').insert({
        merchant_id: merchantId, customer_id: customerId, event_type: 'cycle_control_group',
        event_data: { order_id: orderRow.id },
      })
      return { ok: true, journeyId: j?.id, controlGroup: true }
    }

    // 5. Brand + catalog
    const [{ data: merchant }, { data: merchantProfile }, { data: catalogRows }] = await Promise.all([
      supabase.from('merchants').select('name').eq('id', merchantId).maybeSingle(),
      supabase.from('merchant_profiles').select('tone_of_voice').eq('merchant_id', merchantId).maybeSingle(),
      supabase
        .from('catalog_items')
        .select('id, shopify_product_id, title, description, price')
        .eq('merchant_id', merchantId)
        .eq('is_active', true),
    ])
    const brandName: string = merchant?.name || shop.replace('.myshopify.com', '')
    const catalog = catalogRows || []

    // 6. Order items, enriched with the brand's product data
    const orderItems: PurchasedItem[] = []
    for (const li of order.line_items || []) {
      if (!li?.product_id) continue
      const pid = String(li.product_id)
      if (orderItems.some((i) => i.id === pid)) continue
      const c = catalog.find((x) => String(x.shopify_product_id) === pid)
      orderItems.push({
        id: pid,
        title: c?.title || li.title || 'Product',
        shortDescription: (c?.description || '').slice(0, 1500),
        size: li.variant_title || undefined,
        price: li.price || (c?.price != null ? String(c.price) : undefined),
        quantity: li.quantity || 1,
      })
    }
    if (orderItems.length === 0) return { ok: false, reason: 'no_line_items' }

    const primary = pickPrimaryProduct(orderItems)
    const purchasedIds = new Set(orderItems.map((i) => i.id))
    const recCatalog: CatalogItem[] = catalog
      .filter((c) => !c.shopify_product_id || !purchasedIds.has(String(c.shopify_product_id)))
      .slice(0, 20)
      .map((c) => ({
        id: c.shopify_product_id ? String(c.shopify_product_id) : c.id,
        title: c.title,
        shortDescription: (c.description || '').slice(0, 300),
      }))

    // 7. Onboarding generation
    const profiles = await loadNicheProfiles(supabase)
    const input: CycleInput = {
      phase: 'onboarding',
      language,
      brand: { name: brandName, tone: merchantProfile?.tone_of_voice || undefined },
      product: primary,
      orderItems,
      catalog: recCatalog,
      customer: { id: customerId || buyerEmail, firstName: order.customer?.first_name || undefined },
      profiles,
    }
    const raw = await callModel({
      model: ONBOARDING_MODEL,
      system: ONBOARDING_SYSTEM_PROMPT,
      user: buildOnboardingPrompt(input),
    })
    const onboarding = parseModelJson<OnboardingOutput>(raw)

    // 8. Safety nets on the AI output
    const niche = profiles[onboarding.niche] ? onboarding.niche : Object.keys(profiles)[0]
    onboarding.niche = niche
    onboarding.usageGuide = sanitizeUsageGuide(onboarding.usageGuide || { items: [], together: null }, orderItems)
    onboarding.goalQuestion = normalizeQuestion(onboarding.goalQuestion, 'goal')
    onboarding.frequencyQuestion = normalizeQuestion(onboarding.frequencyQuestion, 'frequency')
    if (!onboarding.goalQuestion.options.length || !onboarding.welcomeEmail?.subject) {
      return { ok: false, reason: 'invalid_onboarding_output' }
    }

    // 9. Save journey + week-0 step
    const { data: journey, error: jErr } = await supabase
      .from('cycle_journeys')
      .insert({
        order_id: orderRow.id,
        merchant_id: merchantId,
        customer_id: customerId,
        niche,
        primary_product_id: primary.id,
        stock_estimates: onboarding.stockEstimates || [],
        usage_guide: onboarding.usageGuide,
        language,
        current_week: 0,
      })
      .select('id')
      .single()
    if (jErr || !journey) return { ok: false, reason: `journey_insert_failed: ${jErr?.message}` }

    const content: WelcomeStepContent = {
      kind: 'welcome',
      primaryProductId: primary.id,
      onboarding,
      fixedQuestionIds: profiles[niche]?.fixedQuestionIds || {},
    }
    const { data: step, error: sErr } = await supabase
      .from('cycle_steps')
      .insert({ journey_id: journey.id, merchant_id: merchantId, week: 0, content })
      .select('id, token')
      .single()
    if (sErr || !step) return { ok: false, reason: `step_insert_failed: ${sErr?.message}` }

    // 10. Welcome email
    await sendCycleWelcomeEmail({
      to: buyerEmail,
      brandName,
      orderNumber: order.name || (order.order_number != null ? `#${order.order_number}` : null),
      email: onboarding.welcomeEmail,
      usageGuide: onboarding.usageGuide,
      question: onboarding.goalQuestion,
      answerUrl: (questionId, optionIndex) =>
        `${APP_URL}/c/${step.token}?q=${encodeURIComponent(questionId)}&a=${optionIndex}`,
      pageUrl: `${APP_URL}/c/${step.token}`,
    })

    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('cycle_steps').update({ email_sent_at: now }).eq('id', step.id),
      supabase.from('shopify_orders').update({ status: 'cycle_started', followup_sent_at: now }).eq('id', orderRow.id),
      supabase.from('event_stream').insert({
        merchant_id: merchantId,
        customer_id: customerId,
        event_type: 'cycle_journey_started',
        event_data: { journey_id: journey.id, niche, primary_product_id: primary.id, items: orderItems.length },
      }),
    ])

    return { ok: true, journeyId: journey.id, controlGroup: false }
  } catch (err: any) {
    console.error('[cycle] startCycleJourney failed:', err)
    try {
      await supabase.from('event_stream').insert({
        merchant_id: merchantId,
        event_type: 'cycle_journey_failed',
        event_data: { shop, shopify_order_id: String(order.id), error: String(err?.message || err) },
      })
    } catch {}
    return { ok: false, reason: String(err?.message || err) }
  }
}

function normalizeQuestion(q: QuestionSpec | undefined, kind: 'goal' | 'frequency'): QuestionSpec {
  return {
    id: kind,
    kind,
    question: q?.question || '',
    type: 'choice',
    options: (q?.options || [])
      .filter((o) => o && typeof o.label === 'string' && o.label.trim())
      .slice(0, 4)
      .map((o) => ({
        label: o.label.trim(),
        instantReply: (o.instantReply || '').trim(),
        ...(kind === 'frequency' && typeof o.usesPerDay === 'number' && o.usesPerDay >= 0 ? { usesPerDay: o.usesPerDay } : {}),
      })),
  }
}
