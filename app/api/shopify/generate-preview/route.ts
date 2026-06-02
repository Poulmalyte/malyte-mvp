import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Carica merchant + profile
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: merchantProfile } = await supabaseAdmin
      .from('merchant_profiles')
      .select('*')
      .eq('merchant_id', user.id)
      .maybeSingle()

    // Carica catalog items con tag
    const { data: catalogItems } = await supabaseAdmin
      .from('catalog_items')
      .select('*, catalog_item_tags(*)')
      .eq('merchant_id', user.id)
      .eq('is_active', true)

    if (!catalogItems || catalogItems.length === 0) {
      return NextResponse.json({ error: 'No products found. Please sync your catalog first.' }, { status: 400 })
    }

    // Costruisci contesto prodotti per Claude
    const productsContext = catalogItems.map(item => {
      const tags = item.catalog_item_tags || []
      const getTag = (type: string) => tags.filter((t: any) => t.tag_type === type).map((t: any) => t.tag_value)
      return {
        id: item.id,
        title: item.title,
        routine_step: getTag('routine_step')[0] || 'other',
        usage_time: getTag('usage_time')[0] || 'both',
        skin_types: getTag('skin_type'),
        objectives: getTag('objective'),
        hero_ingredients: getTag('hero_ingredient')[0] || '',
        contraindications: getTag('contraindication')[0] || '',
        intro_week: parseInt(getTag('intro_week')[0] || '1'),
      }
    })

    // Profilo cliente demo basato sulla categoria
    const demoProfiles: Record<string, any> = {
      Skincare: {
        name: 'Sarah',
        age: 32,
        skin_type: 'combination',
        objectives: ['hydration', 'brightening'],
        sensitivities: ['fragrance'],
        current_routine: 'Basic cleanser and moisturizer only',
        available_steps: '4-5',
      },
      Fitness: {
        name: 'Marco',
        age: 28,
        goal: 'muscle gain',
        experience: 'intermediate',
        available_days: 4,
        equipment: 'gym',
      },
      Nutrition: {
        name: 'Laura',
        age: 35,
        goal: 'weight loss',
        diet: 'no restrictions',
        activity_level: 'moderate',
        allergies: 'none',
      },
      Wellness: {
        name: 'Anna',
        age: 40,
        goal: 'stress reduction',
        experience: 'beginner',
        available_time: '20 minutes daily',
      },
    }

    const demoProfile = demoProfiles[merchant?.category || 'Skincare'] || demoProfiles['Skincare']

    // Costruisci routine rules context
    const routineRules = merchantProfile?.routine_rules || {}
    const philosophy = merchantProfile?.philosophy || ''
    const heroIngredients = merchantProfile?.hero_ingredients || ''
    const avoidIngredients = merchantProfile?.avoid_ingredients || ''
    const toneOfVoice = merchantProfile?.tone_of_voice || 'professional but approachable'

    const systemPrompt = `You are a ${merchant?.category || 'skincare'} expert creating a personalized plan for a customer of the brand "${merchant?.name || 'this brand'}".

Brand philosophy: ${philosophy || 'Not specified'}
Tone of voice: ${toneOfVoice}
Hero ingredients: ${heroIngredients || 'Not specified'}
Ingredients to avoid: ${avoidIngredients || 'None specified'}

Available products from the brand catalog:
${JSON.stringify(productsContext, null, 2)}

Routine rules:
${JSON.stringify(routineRules, null, 2)}

IMPORTANT RULES:
1. ONLY recommend products from the catalog above — never suggest external products
2. Introduce products gradually based on their intro_week value
3. Respect contraindications — never combine incompatible products
4. Keep the plan realistic and achievable for the customer
5. Write in the brand's tone of voice
6. This is WEEK 1 — only introduce intro_week: 1 products`

    const userPrompt = `Create a personalized Week 1 plan for this customer:
${JSON.stringify(demoProfile, null, 2)}

Return ONLY a valid JSON object with no preamble, no markdown, no backticks:
{
  "customer_name": "Sarah",
  "week": 1,
  "headline": "Your personalized plan headline",
  "morning_routine": [
    {
      "catalog_item_id": "uuid from catalog",
      "product_title": "product name",
      "step_number": 1,
      "instructions": "How to use this product specifically for this customer",
      "why": "Why this product is right for this customer"
    }
  ],
  "evening_routine": [...same structure],
  "weekly_notes": "Personalized advice for this week",
  "products_to_introduce_next_week": ["product title 1", "product title 2"],
  "check_in_questions": [
    "How is your skin feeling after 3 days?",
    "Have you noticed any reactions?"
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let plan: any
    try {
      plan = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse plan. Please try again.' }, { status: 500 })
    }

    // Aggiungi info prodotti al piano per la UI
    const enrichPlan = (routine: any[]) =>
      routine.map(item => ({
        ...item,
        catalog_item: catalogItems.find(c => c.id === item.catalog_item_id) || null,
      }))

    plan.morning_routine = enrichPlan(plan.morning_routine || [])
    plan.evening_routine = enrichPlan(plan.evening_routine || [])
    plan.demo_profile = demoProfile
    plan.category = merchant?.category || 'Skincare'

    return NextResponse.json({ ok: true, plan })

  } catch (err: any) {
    console.error('generate-preview error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}