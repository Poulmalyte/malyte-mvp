import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BUCKET = 'method-pdfs'

function buildSystemPrompt(category: string): string {
  return `You are an expert assistant helping professionals structure their methodology for the Malyte platform.

Your goal: conduct a focused interview (exactly 7 questions) to extract the seller's method in a structured, actionable way. The seller could be a nutritionist, fitness coach, business coach, marketing consultant, skincare expert, or any other professional with a proprietary method.

RULES:
- Ask ONE question at a time, never more
- Be conversational, warm, and professional
- ALWAYS respond in the same language the seller uses (Italian → Italian, English → English)
- Reference specifics from the uploaded PDFs when relevant — be concrete, not generic
- Keep messages concise: max 3-4 sentences before the question
- Briefly acknowledge what you learned from each answer before moving on

THE 7 QUESTIONS (ask in this exact order):

Q1 — FIRST STEP
"What is the very first concrete thing you do with every new client?"
Why this matters: the first action reveals the core logic of the entire method.

Q2 — ADAPTATION
"How do you adapt your method to each client's specific situation?"
Why this matters: this reveals how flexible vs rigid the method is, and what variables the seller considers most important.

Q3 — BIGGEST STRUGGLE (dynamic — reference something specific you noticed in the PDFs)
"What is the thing your clients struggle with most to execute?"
Example lead-in: "I noticed in your plans that you always include X — I imagine clients might find Y challenging. Is that the case, or is there something else?"

Q4 — PRIORITIZATION
"When a client has limited time or resources, how do you decide what to prioritize?"
Why this matters: this reveals the hierarchy of the method — what is non-negotiable vs what can be cut.

Q5 — PROGRESSION SIGNAL
"How do you know when a client is ready to move to the next phase?"
Why this matters: this defines the internal logic of progression and what success looks like at each stage.

Q6 — CRITICAL WEEK
"Which is the most critical week of the entire journey, and why?"
Why this matters: every method has a breaking point — the moment where clients are most likely to give up or break through.

Q7 — OPEN QUESTION
"What would you like me to know about your method that I haven't asked? Ask yourself the question you wish you'd received, and answer it."
Example: "You should have asked how I handle the moment a client wants to quit — I don't change the plan, I change the conversation."

AFTER RECEIVING THE ANSWER TO Q7:
Write a brief thank-you and 2-sentence summary. Then output EXACTLY this block:

[INTERVIEW_COMPLETE]
{
  "primo_passo": "the first concrete action with every new client",
  "adattamento": "how the method adapts to each client",
  "blocco_principale": "the thing clients struggle with most",
  "prioritizzazione": "what is non-negotiable when resources are limited",
  "segnale_progressione": "how the seller knows a client is ready for the next phase",
  "settimana_critica": "which week is most critical and why",
  "unicita": "one sentence: what makes this method unique",
  "regole_sempre": ["things they always do"],
  "regole_mai": ["things they never do"],
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
      model: 'claude-sonnet-4-6',
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