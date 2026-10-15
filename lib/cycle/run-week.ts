import { createAdminClient } from '@/lib/supabase-admin'
import {
  computeDaysLeft,
  runWeeklyCycle,
  type CatalogItem,
  type CycleInput,
  type DiaryEntry,
  type PurchasedItem,
  type StockEstimate,
} from './engine'
import { loadNicheProfiles } from './profiles'
import { callModel } from './ai'
import type { StepContent, WeeklyLinks, WeeklyStepContent } from './steps'
import { sendCycleWeeklyEmail } from '@/lib/email/cycle-email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

/** A journey ends after this many weekly emails. */
export const MAX_WEEKS = 12
/** Days between two emails. */
export const WEEK_DAYS = 7
/** From week 4 on, stop if the customer answered nothing in the last 3 emails. */
const INACTIVE_WEEKS = 3

export type RunWeekResult =
  | { status: 'sent'; week: number }
  | { status: 'skipped'; reason: string }
  | { status: 'stopped'; reason: string }
  | { status: 'error'; reason: string }

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Sends the next weekly email of one consumption-cycle journey.
 * Safe to call more than once: it only sends when the last email is at least 7 days old
 * (unless `force` is set, used for manual tests).
 */
export async function runWeekForJourney(journeyId: string, opts: { force?: boolean } = {}): Promise<RunWeekResult> {
  const supabase = createAdminClient()
  try {
    const { data: journey } = await supabase
      .from('cycle_journeys')
      .select('*')
      .eq('id', journeyId)
      .maybeSingle()
    if (!journey) return { status: 'skipped', reason: 'journey_not_found' }
    if (journey.status !== 'active') return { status: 'skipped', reason: `status_${journey.status}` }
    if (journey.in_control_group) return { status: 'skipped', reason: 'control_group' }
    if (!journey.niche) return { status: 'skipped', reason: 'no_niche' }

    const [{ data: steps }, { data: answers }, { data: order }] = await Promise.all([
      supabase.from('cycle_steps').select('week, created_at, content').eq('journey_id', journeyId).order('week'),
      supabase.from('cycle_answers').select('week, question_id, question, answer').eq('journey_id', journeyId).order('created_at'),
      supabase.from('shopify_orders').select('buyer_email, customer_email, customer_name, shop_domain').eq('id', journey.order_id).maybeSingle(),
    ])
    const lastStep = (steps || [])[(steps || []).length - 1]
    if (!lastStep) return { status: 'skipped', reason: 'no_welcome_step' }

    const week = (lastStep.week as number) + 1
    if (!opts.force && Date.now() - new Date(lastStep.created_at).getTime() < WEEK_DAYS * DAY_MS) {
      return { status: 'skipped', reason: 'not_due' }
    }

    // Stop rules: journey finished, or customer not engaging any more
    if (week > MAX_WEEKS) {
      await supabase.from('cycle_journeys').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', journeyId)
      return { status: 'stopped', reason: 'max_weeks' }
    }
    if (week >= INACTIVE_WEEKS + 1) {
      const recent = (answers || []).filter((a) => a.week >= week - INACTIVE_WEEKS)
      if (recent.length === 0) {
        await supabase.from('cycle_journeys').update({ status: 'stopped', updated_at: new Date().toISOString() }).eq('id', journeyId)
        await supabase.from('event_stream').insert({
          merchant_id: journey.merchant_id, customer_id: journey.customer_id,
          event_type: 'cycle_stopped_inactive', event_data: { journey_id: journeyId, week },
        })
        return { status: 'stopped', reason: 'inactive' }
      }
    }

    const email = (order?.buyer_email || order?.customer_email || '').trim()
    if (!email || !order?.shop_domain) return { status: 'skipped', reason: 'no_email_or_shop' }
    const shop: string = order.shop_domain

    // Brand, catalog, product links
    const [{ data: merchant }, { data: merchantProfile }, { data: catalogRows }, { data: shopProducts }] = await Promise.all([
      supabase.from('merchants').select('name').eq('id', journey.merchant_id).maybeSingle(),
      supabase.from('merchant_profiles').select('tone_of_voice').eq('merchant_id', journey.merchant_id).maybeSingle(),
      supabase.from('catalog_items').select('id, shopify_product_id, title, description, price')
        .eq('merchant_id', journey.merchant_id).eq('is_active', true),
      supabase.from('shopify_products').select('shopify_product_id, shopify_product_title, product_url').eq('shop', shop),
    ])
    const brandName: string = merchant?.name || shop.replace('.myshopify.com', '')
    const catalog = catalogRows || []
    const urlById = new Map<string, string | null>()
    const titleById = new Map<string, string>()
    for (const p of shopProducts || []) {
      urlById.set(String(p.shopify_product_id), p.product_url || null)
      if (p.shopify_product_title) titleById.set(String(p.shopify_product_id), p.shopify_product_title)
    }

    const estimates: StockEstimate[] = Array.isArray(journey.stock_estimates) ? journey.stock_estimates : []
    const ownedIds = new Set(estimates.map((e) => String(e.productId)))
    const primaryId = String(journey.primary_product_id || estimates[0]?.productId || '')
    const primaryCatalog = catalog.find((c) => String(c.shopify_product_id) === primaryId)
    const primaryEstimate = estimates.find((e) => String(e.productId) === primaryId)
    const product: PurchasedItem = {
      id: primaryId,
      title: primaryCatalog?.title || titleById.get(primaryId) || 'your product',
      shortDescription: (primaryCatalog?.description || '').slice(0, 1500),
      price: primaryCatalog?.price != null ? String(primaryCatalog.price) : undefined,
    }

    const recCatalog: CatalogItem[] = catalog
      .filter((c) => !c.shopify_product_id || !ownedIds.has(String(c.shopify_product_id)))
      .slice(0, 20)
      .map((c) => ({
        id: c.shopify_product_id ? String(c.shopify_product_id) : c.id,
        title: c.title,
        shortDescription: (c.description || '').slice(0, 300),
      }))

    // Days left on the primary product (code, not AI)
    let daysLeft: number | undefined
    if (primaryEstimate && primaryEstimate.totalUnits > 0) {
      const d = computeDaysLeft({
        totalUnits: primaryEstimate.totalUnits,
        unitsPerUse: primaryEstimate.unitsPerUse || 1,
        usesPerDay: Number(journey.uses_per_day) > 0 ? Number(journey.uses_per_day) : primaryEstimate.defaultUsesPerDay || 1,
        daysSincePurchase: Math.max(0, Math.floor((Date.now() - new Date(journey.started_at).getTime()) / DAY_MS)),
      })
      if (Number.isFinite(d)) daysLeft = d
    }

    // History for the analyst
    const diary: DiaryEntry[] = (answers || []).map((a) => ({
      week: a.week, questionId: a.question_id, question: a.question, answer: a.answer,
    }))
    const previousTips: string[] = []
    const previouslyRecommended: string[] = []
    for (const s of steps || []) {
      const c = s.content as StepContent
      if (c?.kind === 'welcome') {
        for (const it of c.onboarding?.usageGuide?.items || []) previousTips.push(...it.steps.map((x) => `${it.title}: ${x}`))
      } else if (c?.kind === 'weekly') {
        if (c.result?.usageTip) previousTips.push(`${c.result.usageTip.title}: ${c.result.usageTip.body}`)
        for (const r of c.result?.recommendations || []) previouslyRecommended.push(r.productId)
      }
    }

    const profiles = await loadNicheProfiles(supabase)
    const firstName = (order.customer_name || '').trim().split(/\s+/)[0] || undefined
    const input: CycleInput = {
      phase: 'weekly',
      language: journey.language || 'en',
      brand: { name: brandName, tone: merchantProfile?.tone_of_voice || undefined },
      product,
      catalog: recCatalog,
      customer: {
        id: journey.customer_id || email,
        firstName,
        goal: journey.goal || undefined,
        usesPerDay: journey.uses_per_day != null ? Number(journey.uses_per_day) : undefined,
        week,
        daysLeft,
        reportedRunningLow: !!journey.reported_running_low,
        diary,
        previousTips: previousTips.slice(-20),
        previouslyRecommended,
      },
      niche: journey.niche,
      profiles,
    }

    const result = await runWeeklyCycle(input, callModel)

    // Links are resolved by code, never by the AI
    const titleOf = (id: string) =>
      catalog.find((c) => String(c.shopify_product_id) === id || c.id === id)?.title || titleById.get(id) || 'this product'
    const links: WeeklyLinks = {
      refill: result.refill ? { title: product.title, url: urlById.get(primaryId) || null } : null,
      recommendations: result.recommendations.map((r) => ({
        productId: r.productId,
        title: titleOf(r.productId),
        reason: r.reason,
        url: urlById.get(r.productId) || null,
      })),
    }

    const content: WeeklyStepContent = {
      kind: 'weekly',
      result,
      links,
      fixedQuestionIds: profiles[journey.niche]?.fixedQuestionIds || {},
    }
    const { data: step, error: sErr } = await supabase
      .from('cycle_steps')
      .insert({ journey_id: journeyId, merchant_id: journey.merchant_id, week, content })
      .select('id, token')
      .single()
    if (sErr || !step) return { status: 'error', reason: `step_insert_failed: ${sErr?.message}` }

    const pageUrl = `${APP_URL}/c/${step.token}`
    try {
      await sendCycleWeeklyEmail({
        to: email,
        brandName,
        week,
        result,
        links,
        answerUrl: (questionId, optionIndex) => `${pageUrl}?q=${encodeURIComponent(questionId)}&a=${optionIndex}`,
        pageUrl,
        runningLowUrl: `${pageUrl}?low=1`,
        stopUrl: `${pageUrl}?stop=1`,
      })
    } catch (e: any) {
      // Remove the step so tomorrow's run tries again
      await supabase.from('cycle_steps').delete().eq('id', step.id)
      return { status: 'error', reason: `email_failed: ${e?.message || e}` }
    }

    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('cycle_steps').update({ email_sent_at: now }).eq('id', step.id),
      supabase.from('cycle_journeys').update({
        current_week: week,
        // the running-low flag is "consumed" once the refill email has gone out
        reported_running_low: result.refill?.state === 'now' ? false : journey.reported_running_low,
        status: week >= MAX_WEEKS ? 'completed' : 'active',
        updated_at: now,
      }).eq('id', journeyId),
      supabase.from('event_stream').insert({
        merchant_id: journey.merchant_id,
        customer_id: journey.customer_id,
        event_type: 'cycle_week_sent',
        event_data: {
          journey_id: journeyId, week, days_left: daysLeft ?? null,
          refill: result.refill?.state ?? null, recommendations: result.recommendations.length,
        },
      }),
    ])
    return { status: 'sent', week }
  } catch (err: any) {
    console.error('[cycle] runWeekForJourney failed:', journeyId, err)
    return { status: 'error', reason: String(err?.message || err) }
  }
}
