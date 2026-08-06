'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { extractDurationFromText, formatDuration, resolveStepDuration } from '@/lib/step-duration'

type RoutineItem = {
  product_id?: string
  product_title: string
  step_number: number
  instructions: string
  why?: string
  price?: number | null
  product_url?: string | null
  image_url?: string | null
}

type Period = 'morning' | 'evening'

const keyOf = (period: Period, stepNumber: number) => `${period}-${stepNumber}`

export default function RoutineCards({
  token,
  morningRoutine,
  eveningRoutine,
}: {
  token: string
  morningRoutine: RoutineItem[]
  eveningRoutine: RoutineItem[]
}) {
  const [open, setOpen] = useState<Period | null>(null)

  /**
   * Completamenti di OGGI. La data e' decisa server-side e fa parte della
   * chiave: riaprendo il link piu' tardi si ritrova cosa e' gia' stato fatto,
   * ma domani la lista torna vuota da sola, senza nessun reset schedulato.
   */
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/step-completion?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setCompleted(new Set<string>(data?.completed || []))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const markComplete = useCallback(
    (period: Period, stepNumber: number) => {
      const k = keyOf(period, stepNumber)
      // Ottimistico: la spunta appare subito, la scrittura viaggia dopo.
      // Un fallimento di rete non deve bloccare chi sta facendo la routine;
      // al reload la verita' resta quella del database.
      setCompleted((prev) => new Set(prev).add(k))
      fetch('/api/step-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, period, stepNumber }),
      }).catch(() => {})
    },
    [token]
  )

  /**
   * "Do it again": toglie il completamento di oggi. Il timer da solo non
   * basta — lo step resterebbe verde e il conteggio invariato.
   */
  const markUndo = useCallback(
    (period: Period, stepNumber: number) => {
      const k = keyOf(period, stepNumber)
      setCompleted((prev) => {
        const next = new Set(prev)
        next.delete(k)
        return next
      })
      fetch('/api/step-completion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, period, stepNumber }),
      }).catch(() => {})
    },
    [token]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {morningRoutine.length > 0 && (
        <Card
          period="morning"
          label="Morning"
          icon="☀️"
          accent="#F59E0B"
          items={morningRoutine}
          isOpen={open === 'morning'}
          onToggle={() => setOpen(open === 'morning' ? null : 'morning')}
          completed={completed}
          loaded={loaded}
          onComplete={markComplete}
          onUndo={markUndo}
        />
      )}
      {eveningRoutine.length > 0 && (
        <Card
          period="evening"
          label="Evening"
          icon="🌙"
          accent="#6385FF"
          items={eveningRoutine}
          isOpen={open === 'evening'}
          onToggle={() => setOpen(open === 'evening' ? null : 'evening')}
          completed={completed}
          loaded={loaded}
          onComplete={markComplete}
          onUndo={markUndo}
        />
      )}
    </div>
  )
}

function Card({
  period,
  label,
  icon,
  accent,
  items,
  isOpen,
  onToggle,
  completed,
  loaded,
  onComplete,
  onUndo,
}: {
  period: Period
  label: string
  icon: string
  accent: string
  items: RoutineItem[]
  isOpen: boolean
  onToggle: () => void
  completed: Set<string>
  loaded: boolean
  onComplete: (period: Period, stepNumber: number) => void
  onUndo: (period: Period, stepNumber: number) => void
}) {
  const doneCount = items.filter((it) => completed.has(keyOf(period, it.step_number))).length
  const allDone = loaded && doneCount === items.length

  // Primo step non ancora fatto: e' quello su cui il cliente deve agire ora.
  const nextStep = items.find((it) => !completed.has(keyOf(period, it.step_number)))

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', fontFamily: "'Satoshi', sans-serif" }}>{label}</span>
          {allDone && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F9D58', background: '#0F9D581A', padding: '3px 9px', borderRadius: 100 }}>
              Done today
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>
            {loaded && doneCount > 0
              ? `${doneCount} of ${items.length} done`
              : `${items.length} step${items.length !== 1 ? 's' : ''}`}
          </span>
          <span style={{
            fontSize: 12, color: '#8E8E93', display: 'inline-block',
            transition: 'transform 250ms ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</span>
        </div>
      </button>

      <div style={{
        maxHeight: isOpen ? 4000 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 300ms ease, opacity 250ms ease',
      }}>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <StepRow
              key={i}
              item={item}
              period={period}
              icon={icon}
              accent={accent}
              isDone={completed.has(keyOf(period, item.step_number))}
              isNext={nextStep?.step_number === item.step_number}
              onComplete={onComplete}
              onUndo={onUndo}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StepRow({
  item,
  period,
  icon,
  accent,
  isDone,
  isNext,
  onComplete,
  onUndo,
}: {
  item: RoutineItem
  period: Period
  icon: string
  accent: string
  isDone: boolean
  isNext: boolean
  onComplete: (period: Period, stepNumber: number) => void
  onUndo: (period: Period, stepNumber: number) => void
}) {
  // La durata non e' ancora nel piano: la catena scende su categoria ->
  // parola chiave nel titolo -> default (lib/step-duration.ts).
  const fromText = extractDurationFromText(item.instructions)
  const { seconds: estimated } = resolveStepDuration({
    duration_seconds: null,
    category: null,
    product_title: item.product_title,
  })
  const seconds = fromText ?? estimated

  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  // Il completamento scatta qui e non dentro l'intervallo: setState durante
  // il render di un altro componente e' un errore, e doneRef impedisce che
  // un secondo tick invii due volte la stessa scrittura.
  useEffect(() => {
    if (remaining === 0 && running && !doneRef.current) {
      doneRef.current = true
      setRunning(false)
      onComplete(period, item.step_number)
    }
  }, [remaining, running, onComplete, period, item.step_number])

  const reset = () => {
    setRunning(false)
    setRemaining(seconds)
    doneRef.current = false
  }

  const border = isDone
    ? '1px solid #0F9D5833'
    : isNext
      ? `1px solid ${accent}55`
      : '1px solid transparent'

  return (
    <div style={{
      display: 'flex', gap: 12, padding: 12, borderRadius: 12,
      background: isDone ? '#F4FBF6' : '#FAFAF9',
      border,
      transition: 'background 200ms ease, border-color 200ms ease',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
        background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: isDone ? 0.55 : 1,
      }}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.product_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 18, color: '#C7C7CC' }}>{icon}</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: accent + '1A', padding: '2px 8px', borderRadius: 100 }}>
            Step {item.step_number}
          </span>
          {isDone && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0F9D58', background: '#0F9D581A', padding: '2px 8px', borderRadius: 100 }}>
              ✓ Done
            </span>
          )}
          {item.product_url && (
            <a href={item.product_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '2px 8px', borderRadius: 100 }}>
              View →
            </a>
          )}
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px' }}>{item.product_title}</p>
        <p style={{ fontSize: 12, color: '#3C3C43', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
        {item.why && <p style={{ fontSize: 11, color: '#8E8E93', margin: '0 0 8px', fontStyle: 'italic' }}>Why: {item.why}</p>}

        {/* Controlli timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {isDone ? (
            <>
              <span style={{ fontSize: 12, color: '#0F9D58', fontWeight: 600 }}>Completed today</span>
              <button
                onClick={() => { reset(); onUndo(period, item.step_number) }}
                style={{
                  fontSize: 11, color: '#8E8E93', background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: '4px 2px', textDecoration: 'underline',
                }}
              >
                Do it again
              </button>
            </>
          ) : running ? (
            <>
              <span style={{
                fontSize: 15, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums',
                minWidth: 52, fontFamily: "'Satoshi', sans-serif",
              }}>
                {formatCountdown(remaining)}
              </span>
              <button
                onClick={() => setRunning(false)}
                style={pillStyle('#fff', '#1C1C1E', '#E5E5EA')}
              >
                Pause
              </button>
              <button
                onClick={() => onComplete(period, item.step_number)}
                style={pillStyle('#fff', '#8E8E93', '#E5E5EA')}
              >
                Skip
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRunning(true)}
                style={pillStyle(accent, '#fff', accent)}
              >
                {remaining < seconds ? `Resume · ${formatCountdown(remaining)}` : `Start · ${formatDuration(seconds)}`}
              </button>
              {remaining < seconds && (
                <button onClick={reset} style={pillStyle('#fff', '#8E8E93', '#E5E5EA')}>
                  Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function pillStyle(background: string, color: string, borderColor: string) {
  return {
    fontSize: 12,
    fontWeight: 700,
    color,
    background,
    border: `1px solid ${borderColor}`,
    borderRadius: 100,
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  } as const
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}
