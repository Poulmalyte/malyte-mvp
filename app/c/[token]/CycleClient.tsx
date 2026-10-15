'use client'

import { useEffect, useRef, useState } from 'react'
import type { QuestionSpec, UsageGuide } from '@/lib/cycle/engine'
import type { WeeklyLinks } from '@/lib/cycle/steps'

interface Props {
  token: string
  week: number
  brandName: string
  questions: QuestionSpec[]
  existingAnswers: Record<string, string>
  preselected: { questionId: string; optionIndex: number } | null
  usageGuide: UsageGuide | null
  tip: { title: string; body: string } | null
  links?: WeeklyLinks | null
  /** From the email footer links: 'low' = I'm running low, 'stop' = stop weekly emails */
  action?: 'low' | 'stop' | null
}

const violet = '#7C5CFC'

export default function CycleClient({
  token, week, brandName, questions, existingAnswers, preselected, usageGuide, tip, links, action,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(existingAnswers)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [runningLow, setRunningLow] = useState<'idle' | 'saving' | 'done'>('idle')
  const didPreselect = useRef(false)
  const [stopState, setStopState] = useState<'idle' | 'saving' | 'done'>('idle')

  async function answer(q: QuestionSpec, optionIndex: number) {
    const option = q.options[optionIndex]
    if (!option) return
    setSaving(q.id)
    setError('')
    try {
      const res = await fetch('/api/cycle/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, questionId: q.id, optionIndex }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save your answer')
      setAnswers((prev) => ({ ...prev, [q.id]: option.label }))
      setReplies((prev) => ({ ...prev, [q.id]: json.instantReply || option.instantReply || 'Thanks, noted.' }))
    } catch (e: any) {
      setError(e.message || 'Something went wrong, please try again.')
    } finally {
      setSaving(null)
    }
  }

  // Answer clicked in the email: save it once the page is open
  useEffect(() => {
    if (didPreselect.current || !preselected) return
    didPreselect.current = true
    const q = questions.find((x) => x.id === preselected.questionId)
    if (q) answer(q, preselected.optionIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function stopEmails() {
    setStopState('saving')
    try {
      const res = await fetch('/api/cycle/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) throw new Error()
      setStopState('done')
    } catch {
      setStopState('idle')
      setError('Something went wrong, please try again.')
    }
  }

  // Links from the email footer
  const didAction = useRef(false)
  useEffect(() => {
    if (didAction.current || !action) return
    didAction.current = true
    if (action === 'low') reportRunningLow()
    // 'stop' asks for a confirmation click (see below), so scanners can't unsubscribe people
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function reportRunningLow() {
    setRunningLow('saving')
    try {
      const res = await fetch('/api/cycle/running-low', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) throw new Error()
      setRunningLow('done')
    } catch {
      setRunningLow('idle')
      setError('Something went wrong, please try again.')
    }
  }

  // Questions are shown one at a time: all answered ones + the first unanswered
  const firstOpen = questions.findIndex((q) => !answers[q.id])
  const visible = firstOpen === -1 ? questions : questions.slice(0, firstOpen + 1)
  const allDone = questions.length > 0 && firstOpen === -1

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>{brandName}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {action === 'stop' && (
          <div style={{ ...card, textAlign: 'center' }}>
            {stopState === 'done' ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Done — no more weekly emails.</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>You will not receive further tips for this order.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Stop the weekly emails from {brandName}?</p>
                <button
                  onClick={stopEmails}
                  disabled={stopState === 'saving'}
                  style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: '#0F172A', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {stopState === 'saving' ? 'Stopping…' : 'Yes, stop them'}
                </button>
              </>
            )}
          </div>
        )}
        {action === 'low' && (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              {runningLow === 'done' ? 'Noted, thanks.' : 'Saving…'}
            </p>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>We will remind you how to restock in your next email.</p>
            {links?.refill?.url && (
              <p style={{ margin: '12px 0 0' }}>
                <a href={links.refill.url} style={{ color: violet, fontWeight: 700 }}>Reorder {links.refill.title} now →</a>
              </p>
            )}
          </div>
        )}
        {visible.map((q, qi) => {
          const chosen = answers[q.id]
          const reply = replies[q.id]
          const isScale = q.type === 'scale'
          return (
            <div key={q.id} style={card}>
              {qi > 0 && !chosen && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {q.kind === 'frequency' ? 'Optional · helps us remind you at the right time' : 'Optional · one more quick question'}
                </p>
              )}
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 14px', lineHeight: 1.4 }}>{q.question}</p>
              <div style={{ display: 'flex', flexDirection: isScale ? 'row' : 'column', gap: 8, flexWrap: 'wrap' }}>
                {q.options.map((o, i) => {
                  const selected = chosen === o.label
                  return (
                    <button
                      key={i}
                      disabled={saving === q.id}
                      onClick={() => answer(q, i)}
                      style={{
                        padding: isScale ? '12px 0' : '12px 16px',
                        width: isScale ? 48 : '100%',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: selected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: isScale ? 'center' : 'left',
                        border: `1px solid ${selected ? violet : '#E8EDF8'}`,
                        background: selected ? '#EDE9FE' : '#F8FAFC',
                        color: selected ? violet : '#475569',
                      }}
                    >
                      {selected && !isScale && <span style={{ marginRight: 8 }}>✓</span>}
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {saving === q.id && <p style={{ fontSize: 13, color: '#94A3B8', margin: '12px 0 0' }}>Saving…</p>}
              {reply && saving !== q.id && (
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: '0 0 4px' }}>✓ Answer saved</p>
                  <p style={{ fontSize: 14, color: '#065F46', margin: 0, lineHeight: 1.55 }}>{reply}</p>
                </div>
              )}
            </div>
          )
        })}

        {allDone && (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Thanks, all set.</p>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Your next tip arrives by email next week.</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {tip && (
          <div style={card}>
            <p style={label}>This week&apos;s tip</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{tip.title}</p>
            <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.6 }}>{tip.body}</p>
          </div>
        )}

        {links?.recommendations?.length ? (
          <div style={card}>
            <p style={label}>To go further</p>
            {links.recommendations.map((r) => (
              <div key={r.productId} style={{ marginBottom: 12 }}>
                {r.url ? (
                  <a href={r.url} style={{ fontSize: 14, fontWeight: 700, color: violet }}>{r.title} →</a>
                ) : (
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{r.title}</p>
                )}
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>{r.reason}</p>
              </div>
            ))}
          </div>
        ) : null}

        {usageGuide?.items?.length ? (
          <div style={card}>
            <p style={label}>How to use your products</p>
            {usageGuide.items.map((it) => (
              <div key={it.productId} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{it.title}</p>
                {it.steps.map((s, i) => (
                  <p key={i} style={{ fontSize: 14, color: '#475569', margin: '0 0 4px', lineHeight: 1.5 }}>• {s}</p>
                ))}
              </div>
            ))}
            {usageGuide.together && (
              <p style={{ fontSize: 13, color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '10px 12px', margin: 0, lineHeight: 1.5 }}>
                {usageGuide.together}
              </p>
            )}
          </div>
        ) : null}

        {week >= 1 && (
          <div style={{ textAlign: 'center' }}>
            {runningLow === 'done' ? (
              <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>Noted — we&apos;ll remind you how to restock.</p>
            ) : (
              <button
                onClick={reportRunningLow}
                disabled={runningLow === 'saving'}
                style={{ background: 'none', border: 'none', color: violet, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                I&apos;m running low
              </button>
            )}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: '8px 0 0' }}>
          Powered by <a href="https://www.malyte.com/shopify/home" style={{ color: violet, textDecoration: 'none', fontWeight: 600 }}>Malyte</a>
        </p>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #E8EDF8',
  padding: 22,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
}

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: violet,
  margin: '0 0 12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}
