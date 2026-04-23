import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  const { indicators, answers, questions } = await request.json()

  const questionsText = questions.map((q: any) => {
    const answer = answers[q.id] || 'No answer'
    return `Q: ${q.text}\nA: ${answer}`
  }).join('\n\n')

  const indicatorsList = indicators.map((i: any) => `- ${i.label} (id: ${i.id})`).join('\n')

  const prompt = `Based on these weekly check-in answers, score each progress indicator from 1 to 10.

CHECK-IN ANSWERS:
${questionsText}

INDICATORS TO SCORE:
${indicatorsList}

Reply ONLY with valid JSON, no markdown:
{
  "scores": {
    "indicator_id_1": 7,
    "indicator_id_2": 8
  }
}

Use the exact indicator IDs provided. Score 1 = very poor, 10 = excellent. Infer scores from the answers even if not directly mentioned.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return NextResponse.json(data)
  } catch (err) {
    console.error('Score indicators error:', err)
    return NextResponse.json({ scores: {} })
  }
}