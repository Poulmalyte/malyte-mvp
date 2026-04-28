import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchPdfsAsBase64(pdfPaths: string[]): Promise<string[]> {
  const results: string[] = []
  for (const path of pdfPaths.slice(0, 5)) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('method-pdfs')
        .download(path)
      if (error || !data) continue
      const arrayBuffer = await data.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      results.push(base64)
    } catch {
      continue
    }
  }
  return results
}

function buildMethodContext(expert: any): string {
  const answers = expert.method_questions_answers || {}
  const category = expert.category?.toLowerCase() || ''
  const isNutritionist = category.includes('nutri')

  if (isNutritionist) {
    return `
=== EXPERT METHOD — NUTRITION ===
These rules are ABSOLUTE and cannot be violated under any circumstance.

CALORIC TARGET & MACROS: ${answers.caloric_target || 'not specified'}
ON/OFF DAYS: ${answers.on_off_days || 'not specified'}
UNTOUCHABLE FOODS: ${answers.untouchable_foods || 'not specified'}
METABOLIC ADAPTATION: ${answers.metabolic_adaptation || 'not specified'}
ALLERGIES & PREFERENCES: ${answers.allergies_management || 'not specified'}
FOOD SUBSTITUTIONS POLICY: ${expert.allow_substitutions === 'always' ? 'AI can always substitute foods with macro-equivalent alternatives' : expert.allow_substitutions === 'selective' ? 'AI can substitute only foods not listed as untouchable' : 'No substitutions allowed — client must follow the plan exactly as written'}
=================================`
  }

  return `
=== EXPERT METHOD ===
These rules are ABSOLUTE and cannot be violated under any circumstance.

GUARANTEED RESULT: ${answers.specific_result || 'not specified'}
ABSOLUTE RULES: ${answers.absolute_rules || 'not specified'}
WHAT THE METHOD NEVER DOES: ${answers.never_does || 'not specified'}
PROGRESSION OVER TIME: ${answers.progression || 'not specified'}
STOP CRITERIA: ${answers.stop_criteria || 'not specified'}
====================`
}

function buildDoubleCheckInstructions(isNutritionist: boolean): string {
  if (isNutritionist) {
    return `
MANDATORY DOUBLE-CHECK — EXECUTE BEFORE RETURNING OUTPUT:

PHASE 1 — METHOD COMPLIANCE:
- Every meal must respect untouchable foods exactly as declared
- Caloric target must be respected with max 5% variance
- ON/OFF day macro ratios must be applied correctly for the current day
- Substitutions must follow the declared policy
- If any constraint is violated, correct before returning

PHASE 2 — NUTRITIONAL VALIDATION:
- Sum of meal calories must match daily_calories (max 5% variance)
- Macros per meal must add up to daily totals
- All ingredients must have exact gram quantities
- No excluded or allergen foods present
- Plan must be realistically followable

Only return the plan after both phases pass.`
  }

  return `
MANDATORY DOUBLE-CHECK — EXECUTE BEFORE RETURNING OUTPUT:

PHASE 1 — METHOD COMPLIANCE:
- Output must align with the guaranteed result declared by the expert
- All absolute rules must be respected — if even one is violated, correct before returning
- The plan must never do what the expert declared the method never does
- Progression must match the current week within the declared framework
- If stop criteria apply to this client's situation, do not generate the plan — return a message explaining why

Only return the plan after phase 1 passes.`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purchaseId, questionnaireAnswers, weekNumber, checkinAnswers } = await request.json()
  const currentWeek = weekNumber || 1

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .select(`
      *,
      products (
        *,
        experts (
          id,
          name,
          category,
          methodology_name,
          methodology_description,
          results_description,
          method_questions_answers,
          method_pdfs_urls,
          allow_substitutions
        )
      )
    `)
    .eq('id', purchaseId)
    .eq('client_id', user.id)
    .single()

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
  }

  const product = purchase.products as any
  const expert = product.experts as any
  const totalMonths = product.duration_months || 1
  const totalWeeks = totalMonths * 4
  const isNutritionist = expert.category?.toLowerCase().includes('nutri')

  // Fetch PDF documents
  const pdfPaths: string[] = expert.method_pdfs_urls || []
  const pdfBase64List = pdfPaths.length > 0 ? await fetchPdfsAsBase64(pdfPaths) : []

  const methodContext = buildMethodContext(expert)
  const doubleCheck = buildDoubleCheckInstructions(isNutritionist)

  const checkinContext = checkinAnswers && Object.keys(checkinAnswers).length > 0
    ? `\nPREVIOUS WEEK CHECK-IN RESULTS:\n${Object.entries(checkinAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}\nAdapt this week's plan based on these results.`
    : ''

  const systemPrompt = `You are an elite AI coach replicating the methodology of ${expert.name}, expert in ${expert.category}.

${methodContext}

${doubleCheck}

CRITICAL: The client only sees the final verified plan. Never show your validation process.`

  const userPrompt = `PRODUCT: ${product.title} — ${product.description}
PROGRAM: ${totalMonths} month${totalMonths > 1 ? 's' : ''} — ${totalWeeks} weeks total
CURRENT WEEK: ${currentWeek} of ${totalWeeks}

CLIENT:
${Object.entries(questionnaireAnswers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
${checkinContext}

IMPORTANT: Respond entirely in English.

TASK: Generate a day-by-day meal plan for Week ${currentWeek} of ${totalWeeks}.
Focus: ${currentWeek === 1 ? 'building foundations' : currentWeek === totalWeeks ? 'consolidating results' : `progressive intensity from week ${currentWeek - 1}`}.

Reply ONLY with valid JSON, no markdown:

{
  "welcome_message": "2 sentence welcome for Week ${currentWeek}",
  "plan_title": "Week ${currentWeek} — title",
  "plan_subtitle": "One sentence focus",
  "week_number": ${currentWeek},
  "total_weeks": ${totalWeeks},
  "client_stats": {
    "daily_calories": 1500,
    "daily_protein_g": 120,
    "daily_carbs_g": 150,
    "daily_fats_g": 50,
    "note": "One sentence explanation"
  },
  "weekly_goal": "One measurable goal",
  "mindset": "One mindset tip",
  "days": [
    {
      "day": "Monday",
      "date_label": "Week ${currentWeek} — Monday",
      "meals": [
        {
          "meal": "Breakfast",
          "time": "7:00",
          "calories": 400,
          "protein_g": 30,
          "carbs_g": 40,
          "fats_g": 12,
          "name": "Meal name",
          "ingredients": ["ingredient 1 — Xg", "ingredient 2 — Xg", "ingredient 3 — Xg"],
          "preparation": "One sentence",
          "tip": "One tip"
        },
        {
          "meal": "Lunch",
          "time": "13:00",
          "calories": 500,
          "protein_g": 45,
          "carbs_g": 50,
          "fats_g": 15,
          "name": "Meal name",
          "ingredients": ["ingredient 1 — Xg", "ingredient 2 — Xg", "ingredient 3 — Xg"],
          "preparation": "One sentence",
          "tip": "One tip"
        },
        {
          "meal": "Dinner",
          "time": "19:00",
          "calories": 500,
          "protein_g": 45,
          "carbs_g": 50,
          "fats_g": 18,
          "name": "Meal name",
          "ingredients": ["ingredient 1 — Xg", "ingredient 2 — Xg", "ingredient 3 — Xg"],
          "preparation": "One sentence",
          "tip": "One tip"
        }
      ],
      "daily_tip": "One tip"
    }
  ],
  "daily_guidelines": {
    "title": "Week ${currentWeek} Rules",
    "rules": [
      { "rule": "Rule 1", "explanation": "One sentence" },
      { "rule": "Rule 2", "explanation": "One sentence" },
      { "rule": "Rule 3", "explanation": "One sentence" }
    ]
  },
  "expert_tip": "One paragraph expert tip specific to Week ${currentWeek}",
  "common_mistakes": [
    "Mistake 1 with brief explanation",
    "Mistake 2 with brief explanation",
    "Mistake 3 with brief explanation"
  ],
  "success_metrics": [
    "Sign 1 that the week is going well",
    "Sign 2 that the week is going well",
    "Sign 3 that the week is going well",
    "Sign 4 that the week is going well"
  ],
  "closing_message": "One motivating sentence."
}

CRITICAL: "days" must have exactly 7 items (Monday to Sunday). Each day must have exactly 3 meals. Keep ingredients to max 3 items. Vary meals across days.`

  // Build message content — PDFs first, then text prompt
  const messageContent: any[] = []

  for (const base64 of pdfBase64List) {
    messageContent.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    })
  }

  messageContent.push({ type: 'text', text: userPrompt })

  let aiWeek
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleanJson = rawText.replace(/```json|```/g, '').trim()
    aiWeek = JSON.parse(cleanJson)
  } catch (aiError) {
    console.error('AI ERROR:', aiError)
    return NextResponse.json({ error: 'AI generation failed', details: String(aiError) }, { status: 500 })
  }

  const { data: existingPlan } = await supabase
    .from('client_plans')
    .select('id, ai_generated_plan')
    .eq('purchase_id', purchaseId)
    .eq('client_id', user.id)
    .single()

  let savedPlan

  if (existingPlan) {
    const existingWeeks = existingPlan.ai_generated_plan?.weeks || []
    const updatedWeeks = [
      ...existingWeeks.filter((w: any) => w.week_number !== currentWeek),
      { ...aiWeek, week_number: currentWeek }
    ]

    const { data, error: updateError } = await supabase
      .from('client_plans')
      .update({
        ai_generated_plan: {
          ...existingPlan.ai_generated_plan,
          weeks: updatedWeeks,
          current_week: currentWeek,
          total_weeks: totalWeeks,
        },
        current_week: currentWeek,
      })
      .eq('id', existingPlan.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error updating plan' }, { status: 500 })
    }
    savedPlan = data
  } else {
    const { data, error: saveError } = await supabase
      .from('client_plans')
      .insert({
        purchase_id: purchaseId,
        client_id: user.id,
        product_id: product.id,
        questionnaire_answers: questionnaireAnswers,
        ai_generated_plan: {
          weeks: [{ ...aiWeek, week_number: currentWeek }],
          current_week: currentWeek,
          total_weeks: totalWeeks,
        },
        current_week: currentWeek,
        week_start_date: new Date().toISOString(),
        total_weeks: totalWeeks,
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: 'Error saving plan' }, { status: 500 })
    }
    savedPlan = data
  }

  return NextResponse.json({ plan: savedPlan })
}