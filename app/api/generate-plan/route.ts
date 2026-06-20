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

function calculateTDEE(answers: Record<string, any>): number | null {
  const weightRaw = answers['Your weight (e.g. 70 kg or 154 lbs)'] || ''
  const heightRaw = answers['Your height (e.g. 170 cm or 5ft 7in)'] || ''
  const ageRaw = answers['Your age'] || ''
  const activityRaw = answers['What is your daily activity level?'] || ''

  let weightKg: number | null = null
  let heightCm: number | null = null
  const age = parseInt(ageRaw)

  // Parse weight
  const wLbs = weightRaw.match(/(\d+\.?\d*)\s*lbs?/i)
  const wKg = weightRaw.match(/(\d+\.?\d*)\s*kg/i)
  const wNum = weightRaw.match(/^(\d+\.?\d*)$/)
  if (wLbs) weightKg = parseFloat(wLbs[1]) / 2.205
  else if (wKg) weightKg = parseFloat(wKg[1])
  else if (wNum) weightKg = parseFloat(wNum[1])

  // Parse height
  const hCm = heightRaw.match(/(\d+\.?\d*)\s*cm/i)
  const hFtIn = heightRaw.match(/(\d+)\s*ft\s*(\d*)\s*in?/i)
  const hFt = heightRaw.match(/(\d+\.?\d*)\s*ft/i)
  const hNum = heightRaw.match(/^(\d+\.?\d*)$/)
  if (hCm) heightCm = parseFloat(hCm[1])
  else if (hFtIn) heightCm = parseFloat(hFtIn[1]) * 30.48 + (parseFloat(hFtIn[2] || '0') * 2.54)
  else if (hFt) heightCm = parseFloat(hFt[1]) * 30.48
  else if (hNum) heightCm = parseFloat(hNum[1])

  if (!weightKg || !heightCm || !age || isNaN(age)) return null

  // Mifflin-St Jeor (assume average between male/female)
  const bmrMale = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
  const bmrFemale = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161
  const bmr = (bmrMale + bmrFemale) / 2

  const activityLower = activityRaw.toLowerCase()
  let multiplier = 1.375
  if (activityLower.includes('sedentary') || activityLower.includes('desk')) multiplier = 1.2
  else if (activityLower.includes('lightly') || activityLower.includes('some walking')) multiplier = 1.375
  else if (activityLower.includes('moderately') || activityLower.includes('3')) multiplier = 1.55
  else if (activityLower.includes('very') || activityLower.includes('intense')) multiplier = 1.725

  return Math.round(bmr * multiplier)
}

function buildMethodContext(expert: any): string {
  const structured = expert.method_structured || {}
  const answers = expert.method_questions_answers || {}

  if (structured.mattoni || structured.regole_sempre) {
    return `
=== EXPERT METHOD — ${(expert.category || 'PROFESSIONAL').toUpperCase()} ===
These rules are ABSOLUTE and cannot be violated under any circumstance.

CORE ELEMENTS (use ONLY these): ${(structured.mattoni || []).join(', ') || 'not specified'}
ALWAYS DO: ${(structured.regole_sempre || []).join(', ') || 'not specified'}
NEVER DO: ${(structured.regole_mai || []).join(', ') || 'not specified'}
COMBINATION LOGIC: ${(structured.logica_combinazione || []).join(', ') || 'not specified'}
SUBSTITUTION RULES: ${JSON.stringify(structured.albero_decisionale || [])}
CALORIE APPROACH: ${structured.calorie_metodo || 'not specified'}
CALORIE DELTAS: ${JSON.stringify(structured.calorie_deltas || {})}
WHAT MAKES THIS METHOD UNIQUE: ${structured.unicita || 'not specified'}
ADDITIONAL NOTES: ${structured.note_aggiuntive || 'none'}
=================================`
  }

  if (structured.primo_passo) {
    return `
=== EXPERT METHOD — ${(expert.category || 'PROFESSIONAL').toUpperCase()} ===
FIRST STEP: ${structured.primo_passo}
HOW METHOD ADAPTS: ${structured.adattamento || 'not specified'}
MAIN BLOCKER: ${structured.blocco_principale || 'not specified'}
ALWAYS DO: ${(structured.regole_sempre || []).join(', ') || 'not specified'}
NEVER DO: ${(structured.regole_mai || []).join(', ') || 'not specified'}
UNIQUE FACTOR: ${structured.unicita || 'not specified'}
=================================`
  }

  const category = expert.category?.toLowerCase() || ''
  const isNutritionist = category.includes('nutri')

  if (isNutritionist) {
    return `
=== EXPERT METHOD — NUTRITION ===
CALORIC TARGET & MACROS: ${answers.caloric_target || 'not specified'}
ON/OFF DAYS: ${answers.on_off_days || 'not specified'}
UNTOUCHABLE FOODS: ${answers.untouchable_foods || 'not specified'}
METABOLIC ADAPTATION: ${answers.metabolic_adaptation || 'not specified'}
ALLERGIES & PREFERENCES: ${answers.allergies_management || 'not specified'}
FOOD SUBSTITUTIONS: ${expert.allow_substitutions === 'always' ? 'Always substitute with macro-equivalent' : expert.allow_substitutions === 'selective' ? 'Only for non-untouchable foods' : 'No substitutions'}
=================================`
  }

  return `
=== EXPERT METHOD ===
GUARANTEED RESULT: ${answers.specific_result || 'not specified'}
ABSOLUTE RULES: ${answers.absolute_rules || 'not specified'}
NEVER DOES: ${answers.never_does || 'not specified'}
PROGRESSION: ${answers.progression || 'not specified'}
STOP CRITERIA: ${answers.stop_criteria || 'not specified'}
====================`
}

function buildPdfSellerSystemPrompt(expert: any, questionnaireAnswers: Record<string, any>): string {
  const tdee = calculateTDEE(questionnaireAnswers)
  const goal = questionnaireAnswers['What is your main goal?'] || 'general wellness'
  const intolerances = questionnaireAnswers['Do you have any food intolerances or allergies?'] || 'none'
  const avoidedFoods = questionnaireAnswers['Are there any foods you avoid or dislike?'] || 'none'

  let calorieTarget = ''
  if (tdee) {
    const goalLower = goal.toLowerCase()
    if (goalLower.includes('weight loss') || goalLower.includes('dimagrimento')) {
      calorieTarget = `Target calories: ${tdee - 350} kcal/day (TDEE ${tdee} - 350 deficit)`
    } else if (goalLower.includes('muscle') || goalLower.includes('massa')) {
      calorieTarget = `Target calories: ${tdee + 300} kcal/day (TDEE ${tdee} + 300 surplus)`
    } else {
      calorieTarget = `Target calories: ${tdee} kcal/day (TDEE maintenance)`
    }
  }

  return `You are an AI assistant that personalizes ready-made plans for individual buyers.

You have received one or more PDF plans from the seller. Your job is to adapt their content for this specific buyer — keeping the seller's structure, foods, and philosophy intact, but personalizing quantities, substitutions, and details to fit this person.

BUYER PROFILE:
- Goal: ${goal}
- Intolerances/Allergies: ${intolerances}
- Foods to avoid: ${avoidedFoods}
- Activity level: ${questionnaireAnswers['What is your daily activity level?'] || 'not specified'}
- Exercise frequency: ${questionnaireAnswers['How many times a week do you exercise?'] || 'not specified'}
${calorieTarget ? `- ${calorieTarget}` : ''}

PERSONALIZATION RULES:
1. Keep the seller's structure and food choices as the foundation
2. Adjust quantities to match the buyer's caloric target (if calculable)
3. Remove any food the buyer is intolerant to or dislikes — replace with similar alternatives from the same plan
4. Add the buyer's name feeling (e.g. "this plan is built for your goal of ${goal}")
5. Write the welcome message as if the seller is speaking directly to this buyer
6. NEVER invent foods or concepts not present in the PDF — only adapt what's already there

OUTPUT: Respond ONLY with valid JSON in the format described by the user prompt.`
}

function buildCheckinHistory(checkins: any[]): string {
  if (!checkins || checkins.length === 0) return ''
  const lines = checkins.map((c: any) => {
    const answersText = Object.entries(c.answers || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    const freeNote = c.free_note ? `  Note: "${c.free_note}"` : ''
    return `Week ${c.week_number}:\n${answersText}${freeNote ? '\n' + freeNote : ''}`
  }).join('\n\n')
  return `\n=== CLIENT HISTORY (last ${checkins.length} weeks) ===\n${lines}\n=====================================`
}

function buildPatternDetection(autoCalibration: boolean): string {
  return `
PATTERN ANALYSIS — EXECUTE BEFORE GENERATING THE PLAN:
- Review the client history above carefully
- Identify any recurring pattern: same blocker for 2+ weeks, declining metric, goal missed repeatedly
- If a pattern exists, prioritize addressing it in this week's plan
- Be explicit in the welcome_message about why you're focusing on this
` + (autoCalibration ? `
AUTO-CALIBRATION — ACTIVE:
- If client completed >80% of last week's objectives → increase intensity by ~15%
- If client completed <50% of last week's objectives → simplify and consolidate` : `
AUTO-CALIBRATION — DISABLED:
- Follow the fixed progression regardless of client results`)
}

function buildDoubleCheckInstructions(): string {
  return `
MANDATORY DOUBLE-CHECK — EXECUTE BEFORE RETURNING OUTPUT:
- Output must align with the expert's declared method
- All absolute rules must be respected
- The plan must never do what the expert declared the method never does
- Pattern analysis must be reflected in the plan
Only return the plan after this check passes.`
}

function buildUserPrompt(product: any, currentWeek: number, totalWeeks: number, questionnaireAnswers: any, checkinContext: string, freeNoteContext: string, checkinHistory: string, isPdfSeller: boolean): string {
  return `PRODUCT: ${product.title} — ${product.description}
PROGRAM: ${product.duration_months || 1} month${(product.duration_months || 1) > 1 ? 's' : ''} — ${totalWeeks} weeks total
CURRENT WEEK: ${currentWeek} of ${totalWeeks}

CLIENT ANSWERS:
${Object.entries(questionnaireAnswers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
${checkinContext}
${freeNoteContext}
${checkinHistory}

IMPORTANT: Respond entirely in English.

TASK: Generate a day-by-day plan for Week ${currentWeek} of ${totalWeeks}.
${isPdfSeller ? 'Adapt the PDF plan content to this buyer\'s specific profile.' : `Focus: ${currentWeek === 1 ? 'building foundations' : currentWeek === totalWeeks ? 'consolidating results' : `progressive intensity from week ${currentWeek - 1}`}.`}

Reply ONLY with valid JSON, no markdown:

{
  "welcome_message": "2-3 sentences explaining WHY this week is structured this way, then 1 sentence of motivation",
  "plan_title": "Week ${currentWeek} — title",
  "plan_subtitle": "One sentence focus",
  "week_number": ${currentWeek},
  "total_weeks": ${totalWeeks},
  "client_stats": {
    "daily_calories": 0,
    "daily_protein_g": 0,
    "daily_carbs_g": 0,
    "daily_fats_g": 0,
    "note": "Key metric or focus for this week"
  },
  "weekly_goal": "One measurable goal for this week",
  "mindset": "One mindset tip relevant to this week",
  "days": [
    {
      "day": "Monday",
      "date_label": "Week ${currentWeek} — Monday",
      "meals": [
        {
          "meal": "Meal / Task / Session name",
          "time": "Time or time block",
          "calories": 0,
          "protein_g": 0,
          "carbs_g": 0,
          "fats_g": 0,
          "name": "Name",
          "ingredients": ["Item 1", "Item 2", "Item 3"],
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
  "common_mistakes": ["Mistake 1", "Mistake 2", "Mistake 3"],
  "success_metrics": ["Sign 1", "Sign 2", "Sign 3", "Sign 4"],
  "closing_message": "One motivating sentence."
}

CRITICAL: "days" must have exactly 7 items (Monday to Sunday). Each day must have 1-4 items in "meals". Vary content across days.`
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
          seller_type,
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
  const autoCalibration = product.auto_calibration !== false
  const isPdfSeller = expert.seller_type === 'pdf_seller'

  const { data: recentCheckins } = await supabase
    .from('weekly_checkins')
    .select('week_number, answers, free_note')
    .eq('purchase_id', purchaseId)
    .order('week_number', { ascending: false })
    .limit(4)

  const checkinHistory = buildCheckinHistory(recentCheckins || [])

  const pdfPaths: string[] = expert.method_pdfs_urls || []
  const pdfBase64List = pdfPaths.length > 0 ? await fetchPdfsAsBase64(pdfPaths) : []

  const checkinContext = checkinAnswers && Object.keys(checkinAnswers).length > 0
    ? `\nLAST WEEK CHECK-IN:\n${Object.entries(checkinAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}`
    : ''

  const freeNoteContext = freeNote
    ? `\nCLIENT NOTE FOR THIS WEEK: "${freeNote}"\n→ Take this into account when generating the plan.`
    : ''

  // ── BUILD SYSTEM PROMPT based on seller type ────────────────────────────────
  let systemPrompt: string

  if (isPdfSeller) {
    systemPrompt = buildPdfSellerSystemPrompt(expert, questionnaireAnswers || {})
  } else {
    const methodContext = buildMethodContext(expert)
    const patternDetection = buildPatternDetection(autoCalibration)
    const doubleCheck = buildDoubleCheckInstructions()
    systemPrompt = `You are an elite AI coach replicating the methodology of ${expert.name}, expert in ${expert.category}.

${methodContext}

${patternDetection}

${doubleCheck}

CRITICAL OUTPUT RULES:
- Adapt the format, language and terminology to the expert's category.
- The welcome_message must always start with 2-3 sentences explaining WHY this week is structured this way, based on the client's history and any patterns detected.
- CRITICAL: The client only sees the final verified plan. Never show your validation process.`
  }

  const userPrompt = buildUserPrompt(product, currentWeek, totalWeeks, questionnaireAnswers, checkinContext, freeNoteContext, checkinHistory, isPdfSeller)

  // ── BUILD MESSAGE CONTENT ───────────────────────────────────────────────────
  const messageContent: any[] = []
  for (const base64 of pdfBase64List) {
    messageContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    })
  }
  messageContent.push({ type: 'text', text: userPrompt })

  // ── STREAMING RESPONSE ──────────────────────────────────────────────────────
  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let fullText = ''

      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: messageContent }],
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text
            send({ chunk: event.delta.text })
          }
        }

        const cleanJson = fullText.replace(/```json|```/g, '').trim()
        const aiWeek = JSON.parse(cleanJson)

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
            { ...aiWeek, week_number: currentWeek },
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

          if (updateError) { send({ error: 'Error updating plan' }); controller.close(); return }
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

          if (saveError) { send({ error: 'Error saving plan' }); controller.close(); return }
          savedPlan = data
        }

        send({ done: true, plan: savedPlan })
      } catch (error) {
        console.error('AI STREAM ERROR:', error)
        send({ error: String(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}