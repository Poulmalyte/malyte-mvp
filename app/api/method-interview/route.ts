import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BUCKET = 'method-pdfs' // ← controlla che coincida col tuo bucket in upload-method-pdf

function buildSystemPrompt(category: string): string {
  return `You are an expert assistant helping wellness professionals structure their methodology for the Malyte platform.

Your goal: conduct a focused interview (exactly 7 questions) to extract the seller's method in a structured, actionable way.

RULES:
- Ask ONE question at a time, never more
- Be conversational, warm, and professional
- ALWAYS respond in the same language the seller uses (Italian → Italian, English → English)
- Reference specifics from the uploaded PDFs when relevant — be concrete, not generic
- Keep messages concise: max 3-4 sentences before the question
- Briefly acknowledge what you learned from each answer before moving on

THE 7 QUESTIONS (ask in this exact order):

Q1 — UNIQUENESS
"What does your method do that a generic practitioner wouldn't?"
Share this example: "For example, I never remove carbs in the evening because I believe meal timing matters less than total calories"

Q2 — NEVER DO
"What would you NEVER include in a plan, no matter what the client asks?"
Share this example: "A client asked me to add dessert after dinner — in my method we replace it with fruit or yogurt because I avoid refined sugars"

Q3 — PDF CLARIFICATION (dynamic — ask about something specific you noticed in the PDFs)
Example: "I noticed you always use chicken and fish as proteins across all your plans — is this a deliberate choice, or would you adapt it for every client?"

Q4 — GOAL LOGIC (must explicitly cover all 3: weight loss, muscle gain, AND maintenance)
"How does the plan change between weight loss, muscle gain, and maintenance?"
Share this example: "For weight loss I reduce carbs and increase protein, for muscle gain I increase carbs, for maintenance I balance everything to daily needs"

Q5 — SUBSTITUTIONS
"What's the most common substitution you make and why?"
Share this example: "When a client can't tolerate lactose I replace regular yogurt with lactose-free yogurt keeping the same quantities"

Q6 — CALORIES
"Do you have a caloric reference for each goal? Do you calculate it per client or use fixed values?"
Share this example: "For weight loss I start from the person's TDEE and subtract 350 kcal, for muscle gain I add 300 kcal, for maintenance I stay at exact TDEE"

Q7 — OPEN QUESTION
"Is there something important about your method I haven't asked? Ask yourself the question you wish you'd received, and answer it."
Share this example: "You should have asked how I handle client crisis moments — when they want to give up. I don't change the plan, I change the conversation"

AFTER RECEIVING THE ANSWER TO Q7:
Write a brief thank-you and 2-sentence summary. Then output EXACTLY this block:

[INTERVIEW_COMPLETE]
{
  "mattoni": ["list all core ingredients, exercises, or products the seller uses"],
  "regole_sempre": ["things they always include or do"],
  "regole_mai": ["things they never include or do"],
  "logica_combinazione": ["rules about how they combine elements"],
  "albero_decisionale": [
    {"se": "client does not eat fish", "allora": "replace with eggs or legumes"}
  ],
  "calorie_metodo": "tdee_based",
  "calorie_deltas": {"dimagrimento": -350, "massa": 300, "mantenimento": 0},
  "unicita": "one sentence: what makes this method unique",
  "note_aggiuntive": "anything else important captured in the interview"
}
[/INTERVIEW_COMPLETE]

START: Briefly mention 2-3 specific patterns you noticed in the uploaded PDFs (be concrete). Then ask Q1.`
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, pdf_paths, is_first_message, category } = await req.json()

  let claudeMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  if (is_first_message && pdf_paths?.length > 0) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const pdfBlocks: any[] = []

    for (const path of (pdf_paths as string[]).slice(0, 5)) {
      try {
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path)
        if (data && !error) {
          const buffer = await data.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          pdfBlocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          })
        }
      } catch (e) {
        console.error(`Failed to fetch PDF: ${path}`, e)
      }
    }

    if (pdfBlocks.length > 0 && claudeMessages.length > 0) {
      claudeMessages[0] = {
        role: 'user',
        content: [
          ...pdfBlocks,
          { type: 'text', text: claudeMessages[0].content as string },
        ],
      }
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(category || ''),
      messages: claudeMessages,
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const isComplete = responseText.includes('[INTERVIEW_COMPLETE]')
    let structuredData = null
    let cleanMessage = responseText

    if (isComplete) {
      const jsonMatch = responseText.match(/\[INTERVIEW_COMPLETE\]([\s\S]*?)\[\/INTERVIEW_COMPLETE\]/)
      if (jsonMatch) {
        try {
          structuredData = JSON.parse(jsonMatch[1].trim())
          cleanMessage = responseText.replace(/\[INTERVIEW_COMPLETE\][\s\S]*?\[\/INTERVIEW_COMPLETE\]/, '').trim()
        } catch (e) {
          console.error('Failed to parse structured data', e)
        }
      }
    }

    return Response.json({ message: cleanMessage, isComplete, structuredData })
  } catch (e) {
    console.error('Anthropic API error:', e)
    return Response.json({ error: 'AI error' }, { status: 500 })
  }
}