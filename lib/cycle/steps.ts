import type { QuestionSpec, UsageGuide, WeeklyResult } from './engine'
import type { WelcomeStepContent } from './start-journey'

/** Links resolved by code (never by the AI) for a weekly step. */
export type WeeklyLinks = {
  refill: { title: string; url: string | null } | null
  recommendations: { productId: string; title: string; reason: string; url: string | null }[]
}

/** Weekly step content (week >= 1), written by the weekly job. */
export type WeeklyStepContent = {
  kind: 'weekly'
  result: WeeklyResult
  links: WeeklyLinks
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
  links: WeeklyLinks | null
} {
  if (content?.kind === 'welcome') return { usageGuide: content.onboarding.usageGuide, tip: null, links: null }
  if (content?.kind === 'weekly') return { usageGuide: null, tip: content.result.usageTip, links: content.links || null }
  return { usageGuide: null, tip: null, links: null }
}
