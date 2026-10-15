import type { QuestionSpec, UsageGuide, WeeklyResult } from './engine'
import type { WelcomeStepContent } from './start-journey'

/** Weekly step content (week >= 1). Written by the weekly job (next phase). */
export type WeeklyStepContent = {
  kind: 'weekly'
  result: WeeklyResult
  fixedQuestionIds: { goal?: string; frequency?: string; progress?: string }
}

export type StepContent = WelcomeStepContent | WeeklyStepContent

/** Every question that can be answered for a step, in display order. */
export function stepQuestions(content: StepContent): QuestionSpec[] {
  if (content?.kind === 'welcome') {
    return [content.onboarding.goalQuestion, content.onboarding.frequencyQuestion].filter((q) => q?.options?.length)
  }
  if (content?.kind === 'weekly') {
    return [...(content.result.emailQuestions || []), ...(content.result.followUpQuestions || [])].filter(
      (q) => q?.options?.length,
    )
  }
  return []
}

/** What the page shows below the questions, for reference. */
export function stepReference(content: StepContent): {
  usageGuide: UsageGuide | null
  tip: { title: string; body: string } | null
} {
  if (content?.kind === 'welcome') return { usageGuide: content.onboarding.usageGuide, tip: null }
  if (content?.kind === 'weekly') return { usageGuide: null, tip: content.result.usageTip }
  return { usageGuide: null, tip: null }
}
