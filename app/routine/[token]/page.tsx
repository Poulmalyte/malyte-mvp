import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// TEMPORANEO: costante fissa finche il totale settimane non diventa dinamico
const TEMP_TOTAL_WEEKS = 12

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RoutinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: brandPlan } = await supabaseAdmin
    .from('brand_plans')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!brandPlan) notFound()

  const plan = brandPlan.plan_data
  const pkg = brandPlan.package_data
  const brandName = brandPlan.merchant_name || 'Your Brand'
  const category = brandPlan.category || 'Skincare'

  const RoutineItem = ({ item, color, bg, border }: any) => (
    <div style={{ padding: '14px 16px', background: bg, borderRadius: 12, border: `1px solid ${border}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: border, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>Step {item.step_number}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.price && <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>€{Number(item.price).toFixed(2)}</span>}
          {item.product_url && (
            <a href={item.product_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
              View →
            </a>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
      {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
    </div>
  )

  const StatusRing = ({ week, total }: { week: number, total: number }) => {
    const segments = Array.from({ length: total }, (_, i) => i < week)
    const radius = 60
    const strokeWidth = 8
    const circumference = 2 * Math.PI * radius
    const segmentLength = circumference / total
    const gap = 3

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
        <svg width={150} height={150} viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
          {segments.map((filled, i) => {
            const offset = i * segmentLength
            return (
              <circle
                key={i}
                cx={75}
                cy={75}
                r={radius}
                fill="none"
                stroke={filled ? '#5B6EF5' : '#E5E5EA'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength - gap} ${circumference - segmentLength + gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        <div style={{ marginTop: -95, textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>Week {week}</p>
          <p style={{ fontSize: 12, color: '#8E8E93', margin: 0 }}>of {total}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>{brandName}</span>
          <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '4px 12px', borderRadius: 100 }}>Week {brandPlan.week_number}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Status Ring - dashboard v2, primo elemento introdotto */}
        <StatusRing week={brandPlan.week_number} total={TEMP_TOTAL_WEEKS} />

        {/* Coach Note — dashboard v2: stessi dati di Hero + Weekly notes, sola presentazione nuova */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F0F0F0', padding: '24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B6EF5, #9B8AFB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(brandName || 'M').charAt(0).toUpperCase()}
            </div>

            <p style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Week {brandPlan.week_number} plan
            </p>

            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3, color: '#1C1C1E', maxWidth: 440 }}>
              {plan?.headline || `Your ${category} Routine`}
            </h1>

            {brandPlan.week_number === 1 && brandPlan.customer_summary && (
              <p style={{ fontSize: 14, color: '#3C3C43', margin: 0, lineHeight: 1.6, maxWidth: 440 }}>
                {brandPlan.customer_summary}
              </p>
            )}

            {plan?.weekly_notes && (
              <p style={{ fontSize: 14, color: '#3C3C43', margin: '4px 0 0', lineHeight: 1.6, maxWidth: 440 }}>
                {plan.weekly_notes}
              </p>
            )}
          </div>
        </div>

        {/* Morning routine */}
        {plan?.morning_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              ☀️ Morning routine
            </p>
            {plan.morning_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#F59E0B" bg="#FFFBEB" border="#FDE68A" />
            ))}
          </div>
        )}

        {/* Evening routine */}
        {plan?.evening_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              🌙 Evening routine
            </p>
            {plan.evening_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#6385FF" bg="#EEF2FF" border="#C7D2FE" />
            ))}
          </div>
        )}

        {/* Next Week Preview — dashboard v2: stesso dato e condizione, solo presentazione piu silenziosa */}
        {plan?.what_changes_next_week && (
          <div style={{ background: '#F5F5F4', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              → Next week
            </p>
            <p style={{ fontSize: 13, color: '#3C3C43', margin: 0, lineHeight: 1.6 }}>{plan.what_changes_next_week}</p>
          </div>
        )}

        {/* Evolution — dashboard v2: chiusura calma, stesso testo, nessun dato nuovo */}
        <div style={{ background: '#F5F5F4', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: '#8E8E93', marginBottom: 10, lineHeight: 1 }}>∞</div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3C3C43', margin: '0 0 8px' }}>Your routine evolves with you</p>
          <p style={{ fontSize: 13, color: '#8E8E93', margin: 0, lineHeight: 1.6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Every week your plan adapts based on your progress. New products are introduced at exactly the right moment — never too much, never too soon.
          </p>
        </div>

      </div>
    </div>
  )
}
