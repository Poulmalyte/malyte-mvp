import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { stepQuestions, type StepContent } from '@/lib/cycle/steps'

/**
 * Saves a one-click answer of the consumption cycle.
 * Body: { token, questionId, optionIndex }
 * The answer is identified by the option INDEX of a question stored in the step,
 * so nobody can write arbitrary answers. Clicking again updates the answer.
 */
export async function POST(request: Request) {
  try {
    const { token, questionId, optionIndex } = await request.json()
    if (typeof token !== 'string' || typeof questionId !== 'string' || typeof optionIndex !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: step } = await supabase
      .from('cycle_steps')
      .select('id, journey_id, merchant_id, week, content')
      .eq('token', token)
      .maybeSingle()
    if (!step) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const content = step.content as StepContent
    const question = stepQuestions(content).find((q) => q.id === questionId)
    const option = question?.options?.[optionIndex]
    if (!question || !option) return NextResponse.json({ error: 'Invalid answer' }, { status: 400 })

    const fixedKind = question.kind === 'goal' || question.kind === 'frequency' || question.kind === 'progress'
      ? question.kind
      : null
    const fixedQuestionId = fixedKind ? content.fixedQuestionIds?.[fixedKind] || null : null

    const { error: saveError } = await supabase.from('cycle_answers').upsert(
      {
        journey_id: step.journey_id,
        step_id: step.id,
        merchant_id: step.merchant_id,
        week: step.week,
        question_id: question.id,
        question_kind: question.kind,
        fixed_question_id: fixedQuestionId,
        question: question.question,
        answer: option.label,
      },
      { onConflict: 'journey_id,week,question_id' },
    )
    if (saveError) {
      console.error('[cycle/answer] save failed:', saveError.message)
      return NextResponse.json({ error: 'Could not save your answer' }, { status: 500 })
    }

    // Answers that update the journey itself
    if (question.kind === 'goal') {
      await supabase
        .from('cycle_journeys')
        .update({ goal: option.label, updated_at: new Date().toISOString() })
        .eq('id', step.journey_id)
    }
    if (question.kind === 'frequency' && typeof option.usesPerDay === 'number') {
      await supabase
        .from('cycle_journeys')
        .update({ uses_per_day: option.usesPerDay, updated_at: new Date().toISOString() })
        .eq('id', step.journey_id)
    }

    await supabase.from('event_stream').insert({
      merchant_id: step.merchant_id,
      event_type: 'cycle_answer',
      event_data: { journey_id: step.journey_id, week: step.week, question_id: question.id, kind: question.kind },
    })

    return NextResponse.json({ ok: true, instantReply: option.instantReply || null })
  } catch (err: any) {
    console.error('[cycle/answer] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
