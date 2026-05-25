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
    .eq('shop', order.shop)
    .eq('shopify_product_id', order.shopify_product_id)
    .maybeSingle()

  if (!shopifyProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

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

  const systemPrompt = `You are an AI assistant that personalizes ready-made plans for individual buyers.
You have received a PDF plan from the seller. Your job is to adapt its content for this specific buyer — keeping the seller's structure, philosophy and approach intact, but personalizing quantities, substitutions, and details to fit this person.
Never invent content not present in the PDF. Only adapt what's already there.
Respond ONLY with valid JSON, no markdown.`

  const userPrompt = `BUYER ANSWERS:
${answersText}

PLAN TYPE: ${shopifyProduct.plan_type === 'guide' ? 'One-time personalized guide' : `Weekly plan — ${shopifyProduct.duration_weeks} weeks total`}

TASK: Generate a personalized plan based on the PDF for this buyer.

Reply ONLY with valid JSON:
{
  "plan_title": "Title of the plan",
  "welcome_message": "Personal welcome message for this buyer based on their answers",
  "summary": "2-3 sentence summary of what this plan contains",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content personalized for this buyer"
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
      model: 'claude-sonnet-4-20250514',
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