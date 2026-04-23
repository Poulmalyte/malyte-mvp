import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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
          name,
          category,
          methodology_name,
          methodology_description,
          results_description
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

  const checkinContext = checkinAnswers && Object.keys(checkinAnswers).length > 0
    ? `\nPREVIOUS WEEK CHECK-IN RESULTS:\n${Object.entries(checkinAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}\nAdapt this week's plan based on these results.`
    : ''

  const prompt = `You are an elite AI coach for ${expert.name}, expert in ${expert.category}.

METHODOLOGY: ${expert.methodology_name}
${expert.methodology_description}

EXPECTED RESULTS: ${expert.results_description}

PRODUCT: ${product.title} — ${product.description}
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

  let aiWeek
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
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