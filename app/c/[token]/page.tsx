import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { stepQuestions, stepReference, type StepContent } from '@/lib/cycle/steps'
import CycleClient from './CycleClient'

export const dynamic = 'force-dynamic'

/**
 * Page opened from the one-click answer links of the consumption-cycle emails.
 * /c/{stepToken}?q={questionId}&a={optionIndex}
 * The answer is saved by the client after the page loads (not on GET), so email
 * link scanners that "click" links don't record fake answers.
 */
export default async function CycleStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ q?: string; a?: string }>
}) {
  const { token } = await params
  const { q, a } = await searchParams
  const supabase = createAdminClient()

  const { data: step } = await supabase
    .from('cycle_steps')
    .select('id, journey_id, merchant_id, week, content')
    .eq('token', token)
    .maybeSingle()
  if (!step) notFound()

  const [{ data: merchant }, { data: answers }] = await Promise.all([
    supabase.from('merchants').select('name').eq('id', step.merchant_id).maybeSingle(),
    supabase
      .from('cycle_answers')
      .select('question_id, answer')
      .eq('journey_id', step.journey_id)
      .eq('week', step.week),
  ])

  const content = step.content as StepContent
  const questions = stepQuestions(content)
  const { usageGuide, tip } = stepReference(content)

  const existing: Record<string, string> = {}
  for (const row of answers || []) existing[row.question_id] = row.answer

  const optionIndex = a !== undefined && /^\d+$/.test(a) ? Number(a) : null
  const preselected =
    q && optionIndex !== null && questions.some((x) => x.id === q && x.options[optionIndex])
      ? { questionId: q, optionIndex }
      : null

  return (
    <CycleClient
      token={token}
      week={step.week}
      brandName={merchant?.name || 'Your brand'}
      questions={questions}
      existingAnswers={existing}
      preselected={preselected}
      usageGuide={usageGuide}
      tip={tip}
    />
  )
}
