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
  const structured = expert.method_structured || {}
  const answers = expert.method_questions_answers || {}

  // New universal method_structured fields (from new 7-question interview)
  if (structured.primo_passo) {
    return `
=== EXPERT METHOD — ${(expert.category || 'PROFESSIONAL').toUpperCase()} ===
These rules are ABSOLUTE and cannot be violated under any circumstance.

FIRST STEP WITH EVERY CLIENT: ${structured.primo_passo || 'not specified'}
HOW THE METHOD ADAPTS TO EACH CLIENT: ${structured.adattamento || 'not specified'}
WHAT CLIENTS STRUGGLE WITH MOST: ${structured.blocco_principale || 'not specified'}
WHAT TO PRIORITIZE WHEN RESOURCES ARE LIMITED: ${structured.prioritizzazione || 'not specified'}
HOW TO KNOW CLIENT IS READY FOR NEXT PHASE: ${structured.segnale_progressione || 'not specified'}
MOST CRITICAL WEEK AND WHY: ${structured.settimana_critica || 'not specified'}
WHAT MAKES THIS METHOD UNIQUE: ${structured.unicita || 'not specified'}
THINGS THIS METHOD ALWAYS DOES: ${(structured.regole_sempre || []).join(', ') || 'not specified'}
THINGS THIS METHOD NEVER DOES: ${(structured.regole_mai || []).join(', ') || 'not specified'}
ADDITIONAL NOTES: ${structured.note_aggiuntive || 'none'}
=================================`
  }

  // Fallback: legacy nutrition format
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
FOOD SUBSTITUTIONS POLICY: ${expert.allow_substitutions === 'always' ? 'AI can always substitute foods with macro-equivalent alternatives' : expert.allow_substitutions === 'selective' ? 'AI can substitute only foods not listed as untouchable' : 'No substitutions allowed'}
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

function buildCheckinHistory(checkins: any[]): string {
  if (!checkins || checkins.length === 0) return ''

  const lines = checkins.map((c: any) => {
    const answersText = Object.entries(c.answers || {})
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')
    const freeNote = c.free_note ? `  Note from client: "${c.free_note}"` : ''
    return `Week ${c.week_number}:\n${answersText}${freeNote ? '\n' + freeNote : ''}`
  }).join('\n\n')

  return `\n=== CLIENT HISTORY (last ${checkins.length} weeks) ===\n${lines}\n=====================================`
}

function buildPatternDetection(autoCalibration: boolean): string {
  const patternInstructions = `
PATTERN ANALYSIS — EXECUTE BEFORE GENERATING THE PLAN:
- Review the client history above carefully
- Identify any recurring pattern: same blocker for 2+ weeks, declining metric, goal missed repeatedly
- If a pattern exists, prioritize addressing it in this week's plan
- Be explicit in the welcome_message about why you're focusing on this`

  const calibrationInstructions = autoCalibration ? `
AUTO-CALIBRATION — ACTIVE:
- If client completed >80% of last week's objectives → increase intensity by ~15%
- If client completed <50% of last week's objectives → simplify and consolidate before advancing
- Reflect this calibration in the plan difficulty` : `
AUTO-CALIBRATION — DISABLED:
- Follow the fixed progression of the expert's method regardless of client results
- Do not increase or decrease intensity based on performance`

  return patternInstructions + calibrationInstructions
}

function buildDoubleCheckInstructions(): string {
  return `
MANDATORY DOUBLE-CHECK — EXECUTE BEFORE RETURNING OUTPUT:

PHASE 1 — METHOD COMPLIANCE:
- Output must align with the expert's declared method
- All absolute rules must be respected
- The plan must never do what the expert declared the method never does
- Progression must match the current week
- Pattern analysis must be reflected in the plan

Only return the plan after phase 1 passes.`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purchaseId, questionnaireAnswers, weekNumber, checkinAnswers, freeNote } = await request.json()
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
          method_structured,
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
  const autoCalibration = product.auto_calibration !== false // default true

  // Fetch last 4 check-ins for history
  const { data: recentCheckins } = await supabase
    .from('weekly_checkins')
    .select('week_number, answers, free_note')
    .eq('purchase_id', purchaseId)
    .order('week_number', { ascending: false })
    .limit(4)

  const checkinHistory = buildCheckinHistory(recentCheckins || [])

  // Fetch PDFs
  const pdfPaths: string[] = expert.method_pdfs_urls || []
  const pdfBase64List = pdfPaths.length > 0 ? await fetchPdfsAsBase64(pdfPaths) : []

  const methodContext = buildMethodContext(expert)
  const patternDetection = buildPatternDetection(autoCalibration)
  const doubleCheck = buildDoubleCheckInstructions()

  // Current week check-in
  const checkinContext = checkinAnswers && Object.keys(checkinAnswers).length > 0
    ? `\nLAST WEEK CHECK-IN:\n${Object.entries(checkinAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}`
    : ''

  // Free note from client
  const freeNoteContext = freeNote
    ? `\nCLIENT NOTE FOR THIS WEEK: "${freeNote}"\n→ Take this into account when generating the plan.`
    : ''

  const systemPrompt = `You are an elite AI coach replicating the methodology of ${expert.name}, expert in ${expert.category}.

${methodContext}

${patternDetection}

${doubleCheck}

CRITICAL OUTPUT RULES:
- Adapt the format, language and terminology to the expert's category. A business coach does not use meal/calories terminology. A fitness coach does not use revenue/KPI terminology.
- The welcome_message must always start with 2-3 sentences explaining WHY this week is structured this way, based on the client's history and any patterns detected.
- CRITICAL: The client only sees the final verified plan. Never show your validation process.`

  const userPrompt = `PRODUCT: ${product.title} — ${product.description}
PROGRAM: ${totalMonths} month${totalMonths > 1 ? 's' : ''} — ${totalWeeks} weeks total
CURRENT WEEK: ${currentWeek} of ${totalWeeks}

CLIENT ONBOARDING ANSWERS:
${Object.entries(questionnaireAnswers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
${checkinContext}
${freeNoteContext}
${checkinHistory}

IMPORTANT: Respond entirely in English.

TASK: Generate a day-by-day plan for Week ${currentWeek} of ${totalWeeks}.
Focus: ${currentWeek === 1 ? 'building foundations' : currentWeek === totalWeeks ? 'consolidating results' : `progressive intensity from week ${currentWeek - 1}`}.

Adapt the JSON structure to the expert's category:
- For nutrition: use meals, calories, ingredients
- For fitness: use sessions, exercises, sets/reps
- For business/marketing: use tasks, actions, milestones, KPIs
- For other categories: use whatever structure best represents the method

Reply ONLY with valid JSON, no markdown:

{
  "welcome_message": "2-3 sentences explaining WHY this week is structured this way based on history, then 1 sentence of motivation",
  "plan_title": "Week ${currentWeek} — title",
  "plan_subtitle": "One sentence focus",
  "week_number": ${currentWeek},
  "total_weeks": ${totalWeeks},
  "client_stats": {
    "daily_calories": 0,
    "daily_protein_g": 0,
    "daily_carbs_g": 0,
    "daily_fats_g": 0,
    "note": "Key metric or focus for this week — adapt to category"
  },
  "weekly_goal": "One measurable goal for this week",
  "mindset": "One mindset tip relevant to this week",
  "days": [
    {
      "day": "Monday",
      "date_label": "Week ${currentWeek} — Monday",
      "meals": [
        {
          "meal": "Task / Session / Meal name — adapt to category",
          "time": "Time or time block",
          "calories": 0,
          "protein_g": 0,
          "carbs_g": 0,
          "fats_g": 0,
          "name": "Name of the task, session or meal",
          "ingredients": ["Step 1 or ingredient 1", "Step 2 or ingredient 2", "Step 3 or ingredient 3"],
          "preparation": "How to execute — one sentence",
          "tip": "One practical tip"
        }
      ],
      "daily_tip": "One tip for this day"
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

CRITICAL: "days" must have exactly 7 items (Monday to Sunday). Each day must have at least 1 and max 4 items in "meals" (adapt count to category). Vary content across days.`

  // Build message content
  const messageContent: any[] = []
  for (const base64 of pdfBase64List) {
    messageContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
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