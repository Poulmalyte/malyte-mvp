import { anthropic } from '@/lib/anthropic'
import type { CallModel } from './engine'

/**
 * Anthropic call used by the consumption cycle.
 * The system prompt is identical on every call, so it is cached:
 * after the first call it costs a fraction of normal input tokens.
 */
export const callModel: CallModel = async ({ model, system, user }) => {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 3000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  })
  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Empty model response')
  return block.text
}
