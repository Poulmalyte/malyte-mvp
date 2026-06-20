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
  const { token, week_number, answers } = await request.json()

  if (!token || !week_number || !answers) {
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

  // Salva il check-in
  await supabaseAdmin
    .from('shopify_checkins')
    .insert({
      order_id: order.id,
      week_number,
      answers,
    })

  // Recupera il piano della settimana precedente
  const { data: prevPlan } = await supabaseAdmin
    .from('shopify_plans')
    .select('*')
    .eq('order_id', order.id)
    .eq('week_number', week_number)
    .maybeSingle()

  const pdfBase64 = shopifyProduct.pdf_path
    ? await fetchPdfAsBase64(shopifyProduct.pdf_path)
    : null

  const prevPlanText = prevPlan
    ? `PREVIOUS WEEK PLAN:\n${JSON.stringify(prevPlan.plan_data, null, 2)}`
    : ''

  const checkinText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const originalAnswers = order.questionnaire_answers || {}
  const originalAnswersText = Object.entries(originalAnswers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const systemPrompt = `You are an AI assistant that generates adaptive weekly plans based on buyer feedback.
You have the seller's PDF methodology. Use it as the foundation but adapt each week based on the buyer's check-in feedback.
Never invent content not present in the PDF. Only adapt what's already there.
When relevant, naturally recommend the brand's products listed in the prompt — integrate them into the plan where they genuinely fit. Do not force recommendations. If a product has a URL, include it as a link.
Respond ONLY with valid JSON, no markdown.`

  const userPrompt = `BUYER PROFILE (from initial questionnaire):
${originalAnswersText}

WEEK ${week_number} CHECK-IN FEEDBACK:
${checkinText}

${prevPlanText}

${brandProductsList ? `BRAND PRODUCTS (recommend these naturally when relevant):\n${brandProductsList}\n` : ''}
TASK: Generate week ${week_number + 1} plan based on the PDF methodology and the buyer's feedback from this week. Where relevant, suggest the brand's products naturally within the plan content.

Reply ONLY with valid JSON:
{
  "plan_title": "Week ${week_number + 1} plan title",
  "welcome_message": "Personal message acknowledging their week ${week_number} feedback",
  "summary": "2-3 sentence summary of what this week contains",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content adapted based on feedback"
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "closing_message": "One motivating closing sentence."
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
        week_number: week_number + 1,
        plan_data: planData,
      })

    return NextResponse.json({ plan: planData, week_number: week_number + 1 })
  } catch (error) {
    console.error('Error generating checkin plan:', error)
    return NextResponse.json({ error: 'Error generating plan' }, { status: 500 })
  }
}