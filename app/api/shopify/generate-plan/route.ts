import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

async function fetchPdfAsBase64(pdfPath: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('shopify-pdfs')
      .download(pdfPath)
    if (error || !data) return null
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const { token, answers } = await request.json()

  if (!token || !answers) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const { data: order } = await supabaseAdmin
    .from('shopify_orders')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: shopifyProduct } = await supabaseAdmin
    .from('shopify_products')
    .select('*')
    .eq('shop', order.shop_domain)
    .eq('shopify_product_id', order.shopify_product_id)
    .maybeSingle()

  if (!shopifyProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Prendi i prodotti brand dal catalogo
  const { data: brandProducts } = await supabaseAdmin
    .from('shopify_brand_products')
    .select('*')
    .eq('shop_domain', order.shop_domain)

  const brandProductsList = (brandProducts || []).map((p: any) => {
    let line = `- ${p.name}`
    if (p.category) line += ` (${p.category})`
    if (p.when_to_use) line += ` — when to use: ${p.when_to_use}`
    if (p.benefits) line += ` — benefits: ${p.benefits}`
    if (p.dosage) line += ` — dosage: ${p.dosage}`
    if (p.url) line += ` — link: ${p.url}`
    return line
  }).join('\n')

  await supabaseAdmin
    .from('shopify_orders')
    .update({ questionnaire_answers: answers, status: 'questionnaire_done' })
    .eq('id', order.id)

  const pdfBase64 = shopifyProduct.pdf_path
    ? await fetchPdfAsBase64(shopifyProduct.pdf_path)
    : null

  const answersText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  // ---------------------------------------------------------------------------
  // WEEK 1 = "DISCOVER": the goal is to make the buyer feel understood and to
  // create anticipation. There are NO results yet, so we forbid any progress or
  // improvement claims, forbid invented numbers, forbid clinical claims, and we
  // do NOT cross-sell products at week 1. Tone: a knowledgeable friend.
  // Output JSON contract is UNCHANGED (plan_title, welcome_message, summary,
  // sections, tips, closing_message) so the frontend keeps working as-is.
  // ---------------------------------------------------------------------------
  const systemPrompt = `You are Malyte, personalizing a seller's ready-made plan for one specific buyer.
You adapt the seller's PDF plan to this person — keeping the seller's structure, philosophy and approach intact — personalizing quantities, substitutions and details to fit them.

CONTENT RULES (these are hard rules):
1. Never invent content that is not in the PDF. Only adapt what is already there.
2. This is the buyer's FIRST plan. You have their answers, but NO results yet.
   Do NOT claim any progress, improvement, or positive response ("you're doing great",
   "your skin is improving", "you're responding well") — there is nothing to measure yet.
3. Never make medical or clinical claims (e.g. "reduces inflammation", "heals",
   "clinically proven", "repairs your skin barrier"). Frame everything as guidance,
   not as a promised bodily outcome.
4. Never invent numbers, scores, percentages or metrics. Only use numbers that are
   present in the PDF or in the buyer's own answers.
5. Always explain the WHY of each recommendation, in plain language tied to what the
   buyer told you about their goal — the way a friend would explain it, not a textbook.
6. Do NOT recommend or upsell any additional products in this first plan. Focus only
   on what they already bought. New product suggestions come later, at check-ins.

TONE: Write like a knowledgeable friend who genuinely wants this person to succeed —
warm, direct, personal. Use "you". Echo back their own words and goal so it feels
written for them, once — never like a template. Warmth comes from specificity, not
from empty enthusiasm. No filler like "amazing!", "you got this!!".

Respond ONLY with valid JSON, no markdown.`

  const userPrompt = `BUYER ANSWERS:
${answersText}

${brandProductsList ? `BRAND PRODUCTS (context only — do NOT recommend these in this first plan):\n${brandProductsList}\n` : ''}
PLAN TYPE: ${shopifyProduct.plan_type === 'guide' ? 'One-time personalized guide' : `Weekly plan — ${shopifyProduct.duration_weeks} weeks total`}

TASK: Generate this buyer's FIRST personalized plan from the PDF. Make them feel
understood, set up the journey ahead, and explain why the starting steps fit their
stated goal. Do not promise results and do not suggest buying anything new.

Reply ONLY with valid JSON:
{
  "plan_title": "Title of the plan",
  "welcome_message": "Warm, personal welcome that reflects their specific answers and goal",
  "summary": "2-3 sentence summary of what this plan contains and where it's heading",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content personalized for this buyer, with the WHY explained"
    }
  ],
  "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
  "closing_message": "One warm, personal closing sentence that sets up next week."
}`

  const messageContent: any[] = []
  if (pdfBase64) {
    messageContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
    })
  }
  messageContent.push({ type: 'text', text: userPrompt })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleanJson = text.replace(/```json|```/g, '').trim()
    const planData = JSON.parse(cleanJson)

    await supabaseAdmin
      .from('shopify_plans')
      .insert({
        order_id: order.id,
        week_number: 1,
        plan_data: planData,
      })

    await supabaseAdmin
      .from('shopify_orders')
      .update({ status: 'plan_generated' })
      .eq('id', order.id)

    return NextResponse.json({ plan: planData })
  } catch (error) {
    console.error('Error generating plan:', error)
    return NextResponse.json({ error: 'Error generating plan' }, { status: 500 })
  }
}
