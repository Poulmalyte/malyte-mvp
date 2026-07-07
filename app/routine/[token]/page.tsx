import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import RoutineCards from './RoutineCards'

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

  // Nessun dato reale di completamento giornaliero esiste ancora nel sistema.
  // Questo componente mostra solo il numero di step previsti oggi (dato reale).
  // L'arco colorato di progresso e' predisposto ma non attivo: da collegare quando
  // esistera' un tracking reale del completamento.
  const TodayRing = ({ morningCount, eveningCount }: { morningCount: number, eveningCount: number }) => {
    const totalSteps = morningCount + eveningCount
    const radius = 78
    const strokeWidth = 10

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 28px' }}>
        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <svg width={180} height={180} viewBox="0 0 180 180">
            <circle cx={90} cy={90} r={radius} fill="none" stroke="#E5E5EA" strokeWidth={strokeWidth} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 40, fontWeight: 800, color: '#1C1C1E', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{totalSteps}</p>
            <p style={{ fontSize: 12, color: '#8E8E93', margin: '2px 0 0' }}>step{totalSteps !== 1 ? 's' : ''} this week</p>
          </div>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', margin: '16px 0 2px' }}>Keep going.</p>
        <p style={{ fontSize: 13, color: '#8E8E93', margin: 0 }}>You're building consistency.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>{brandName}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Greeting - niente Day X, niente countdown, niente durata programma */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px', fontFamily: "'Satoshi', sans-serif" }}>
            Welcome back 👋
          </h1>
          <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>Week {brandPlan.week_number}</p>
        </div>

        {/* Today Ring - mostra solo il numero di step previsti oggi (dato reale).
            L'arco di progresso e' predisposto ma NON attivo: nessun dato reale di
            completamento giornaliero esiste ancora. Da collegare piu' avanti. */}
        <TodayRing morningCount={plan?.morning_routine?.length || 0} eveningCount={plan?.evening_routine?.length || 0} />

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

        {/* Today's Routine - Routine Cards espandibili (client component) */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px', fontFamily: "'Satoshi', sans-serif" }}>
            This Week's Routine
          </p>
          <RoutineCards morningRoutine={plan?.morning_routine || []} eveningRoutine={plan?.evening_routine || []} />
        </div>


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
