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

const DEMO_PRODUCTS: Record<string, any[]> = {
  Skincare: [
    { id: 'demo-1', title: 'Gentle Foaming Cleanser', routine_step: 'cleanser', usage_time: 'both', objectives: ['barrier-repair'], hero_ingredients: 'Ceramides, Glycerin', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-2', title: 'Hydrating Toner', routine_step: 'toner', usage_time: 'both', objectives: ['hydration'], hero_ingredients: 'Hyaluronic Acid, Niacinamide', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-3', title: 'Vitamin C Brightening Serum', routine_step: 'serum', usage_time: 'morning', objectives: ['brightening', 'anti-age'], hero_ingredients: 'Vitamin C 15%, Ferulic Acid', contraindications: 'Do not combine with retinol', intro_week: 3, demo_url: '#' },
    { id: 'demo-4', title: 'Daily Moisturizer SPF30', routine_step: 'moisturizer', usage_time: 'morning', objectives: ['hydration', 'protection'], hero_ingredients: 'SPF30, Niacinamide', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-5', title: 'Nourishing Night Cream', routine_step: 'moisturizer', usage_time: 'evening', objectives: ['hydration', 'anti-age'], hero_ingredients: 'Peptides, Squalane', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-6', title: 'Retinol Renewal Treatment', routine_step: 'treatment', usage_time: 'evening', objectives: ['anti-age'], hero_ingredients: 'Retinol 0.3%, Bakuchiol', contraindications: 'Do not combine with Vitamin C', intro_week: 4, demo_url: '#' },
  ],
  Fitness: [
    { id: 'demo-1', title: 'Pre-Workout Energy Boost', routine_step: 'supplement', usage_time: 'morning', objectives: ['energy', 'performance'], hero_ingredients: 'Caffeine, Beta-Alanine', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-2', title: 'Whey Protein Isolate', routine_step: 'supplement', usage_time: 'both', objectives: ['muscle gain', 'recovery'], hero_ingredients: 'Whey Protein 25g', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-3', title: 'Post-Workout Recovery', routine_step: 'supplement', usage_time: 'evening', objectives: ['recovery'], hero_ingredients: 'BCAAs, Glutamine', contraindications: '', intro_week: 1, demo_url: '#' },
  ],
  Nutrition: [
    { id: 'demo-1', title: 'Daily Multivitamin', routine_step: 'supplement', usage_time: 'morning', objectives: ['health', 'energy'], hero_ingredients: 'Vitamins A, C, D, E, B complex', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-2', title: 'Omega-3 Fish Oil', routine_step: 'supplement', usage_time: 'both', objectives: ['health'], hero_ingredients: 'EPA 360mg, DHA 240mg', contraindications: '', intro_week: 1, demo_url: '#' },
    { id: 'demo-3', title: 'Probiotic Complex', routine_step: 'supplement', usage_time: 'morning', objectives: ['gut health'], hero_ingredients: 'Lactobacillus 10B CFU', contraindications: '', intro_week: 2, demo_url: '#' },
  ],
}

const DEMO_PROFILES: Record<string, any> = {
  Skincare: { name: 'Sarah', age: 32, skin_type: 'combination', objectives: ['hydration', 'brightening'], sensitivities: ['fragrance'], current_routine: 'Basic cleanser and moisturizer only', available_steps: '4-5' },
  Fitness: { name: 'Marco', age: 28, goal: 'muscle gain', experience: 'intermediate', available_days: 4, equipment: 'gym' },
  Nutrition: { name: 'Laura', age: 35, goal: 'weight loss', diet: 'no restrictions', activity_level: 'moderate', allergies: 'none' },
  Wellness: { name: 'Anna', age: 40, goal: 'stress reduction', experience: 'beginner', available_time: '20 minutes daily' },
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: merchant } = await supabaseAdmin.from('merchants').select('*').eq('id', user.id).single()
    const { data: merchantProfile } = await supabaseAdmin.from('merchant_profiles').select('*').eq('merchant_id', user.id).maybeSingle()
    const { data: installation } = await supabaseAdmin.from('shopify_installations').select('*').eq('expert_id', user.id).maybeSingle()

    const { data: catalogItems } = await supabaseAdmin
      .from('catalog_items')
      .select('*, catalog_item_tags(*)')
      .eq('merchant_id', user.id)
      .eq('is_active', true)

    const category = merchant?.category || 'Skincare'
    const isDemo = !catalogItems || catalogItems.length === 0
    const shopDomain = installation?.shop_domain || null

    const productsContext = isDemo
      ? DEMO_PRODUCTS[category] || DEMO_PRODUCTS['Skincare']
      : catalogItems.map(item => {
          const tags = item.catalog_item_tags || []
          const getTag = (type: string) => tags.filter((t: any) => t.tag_type === type).map((t: any) => t.tag_value)
          return {
            id: item.id,
            title: item.title,
            routine_step: getTag('routine_step')[0] || 'other',
            usage_time: getTag('usage_time')[0] || 'both',
            objectives: getTag('objective'),
            hero_ingredients: getTag('hero_ingredient')[0] || '',
            contraindications: getTag('contraindication')[0] || '',
            intro_week: parseInt(getTag('intro_week')[0] || '1'),
            shopify_url: item.shopify_url || (shopDomain ? `https://${shopDomain}/products/${item.shopify_product_id}` : '#'),
          }
        })

    const demoProfile = DEMO_PROFILES[category] || DEMO_PROFILES['Skincare']
    const philosophy = merchantProfile?.philosophy || ''
    const toneOfVoice = merchantProfile?.tone_of_voice || 'professional but approachable'
    const heroIngredients = merchantProfile?.hero_ingredients || ''
    const avoidIngredients = merchantProfile?.avoid_ingredients || ''

    const systemPrompt = `You are a ${category} expert creating a personalized Week 1 plan for a customer.
Brand: ${merchant?.name || 'this brand'}
Philosophy: ${philosophy || 'Not specified'}
Tone: ${toneOfVoice}
Hero ingredients: ${heroIngredients || 'Not specified'}
Avoid: ${avoidIngredients || 'None'}

Available products:
${JSON.stringify(productsContext, null, 2)}

RULES:
1. ONLY use products from the list above
2. Only include products with intro_week = 1 for Week 1
3. Respect contraindications
4. Write in the brand tone of voice
5. Be specific and personal — address the customer by name
6. Return ONLY valid JSON, no markdown, no backticks`

    const userPrompt = `Create a Week 1 personalized plan for:
${JSON.stringify(demoProfile, null, 2)}

Return exactly this JSON:
{
  "customer_name": "Sarah",
  "week": 1,
  "headline": "Your Week 1 plan headline",
  "intro_message": "2-3 sentence personal intro explaining what this week focuses on and why",
  "morning_routine": [
    {
      "product_id": "demo-1",
      "product_title": "product name",
      "step_number": 1,
      "instructions": "Specific how-to for this customer",
      "why": "Why this product is right for this customer right now"
    }
  ],
  "evening_routine": [],
  "weekly_notes": "Personal advice for this week",
  "what_changes_next_week": "Preview of what will be introduced in week 2 and why",
  "products_to_introduce_next_week": ["product name 1"],
  "check_in_questions": ["Question 1?", "Question 2?"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()

    let plan: any
    try { plan = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Failed to parse plan. Please try again.' }, { status: 500 }) }

    // Arricchisci con URL prodotti
    const enrichRoutine = (routine: any[]) => routine.map(item => ({
      ...item,
      product_url: productsContext.find((p: any) => p.id === item.product_id)?.shopify_url ||
                   productsContext.find((p: any) => p.id === item.product_id)?.demo_url || '#',
    }))

    plan.morning_routine = enrichRoutine(plan.morning_routine || [])
    plan.evening_routine = enrichRoutine(plan.evening_routine || [])
    plan.demo_profile = demoProfile
    plan.category = category
    plan.is_demo = isDemo

    return NextResponse.json({ ok: true, plan })

  } catch (err: any) {
    console.error('generate-preview error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
