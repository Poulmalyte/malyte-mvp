import type { SupabaseClient } from '@supabase/supabase-js'
import { NICHE_PROFILES, type NicheProfile, type NicheProfiles } from './engine'

/**
 * Loads the live niche profiles and the ACTIVE version of each fixed question
 * from the database (edited from the admin dashboard).
 * If the tables are empty or unreachable, falls back to the built-in defaults,
 * so the cycle never breaks because of a configuration problem.
 */
export async function loadNicheProfiles(supabase: SupabaseClient): Promise<NicheProfiles> {
  const [{ data: rows, error: e1 }, { data: questions, error: e2 }] = await Promise.all([
    supabase
      .from('cycle_niche_profiles')
      .select('niche, label, goal_examples, adaptive_topics, compliance_rules, usage_knowledge, usage_scope')
      .eq('is_active', true),
    supabase
      .from('cycle_fixed_questions')
      .select('id, niche, kind, question, low_label, high_label')
      .eq('is_active', true),
  ])

  if (e1 || e2 || !rows?.length) {
    console.warn('[cycle] niche profiles not loaded from DB, using built-in defaults:', e1?.message || e2?.message || 'empty')
    return NICHE_PROFILES
  }

  const profiles: NicheProfiles = {}
  for (const r of rows) {
    const fallback = NICHE_PROFILES[r.niche]
    const qs = (questions || []).filter((q) => q.niche === r.niche)
    const goal = qs.find((q) => q.kind === 'goal')
    const frequency = qs.find((q) => q.kind === 'frequency')
    const progress = qs.find((q) => q.kind === 'progress')

    const progressQuestion = progress
      ? { question: progress.question, lowLabel: progress.low_label || '1', highLabel: progress.high_label || '5' }
      : fallback?.progressQuestion
    if (!progressQuestion) {
      console.warn('[cycle] niche without a progress question, skipped:', r.niche)
      continue
    }

    const profile: NicheProfile = {
      label: r.label,
      goalExamples: r.goal_examples || [],
      diaryMetrics: r.adaptive_topics || [],
      unitExamples: fallback?.unitExamples || [],
      complianceRules: r.compliance_rules || [],
      usageKnowledge: r.usage_knowledge === 'general' ? 'general' : 'label_only',
      usageScope: r.usage_scope || '',
      progressQuestion,
      goalQuestionText: goal?.question,
      frequencyQuestionText: frequency?.question,
      fixedQuestionIds: { goal: goal?.id, frequency: frequency?.id, progress: progress?.id },
    }
    profiles[r.niche] = profile
  }

  return Object.keys(profiles).length ? profiles : NICHE_PROFILES
}
